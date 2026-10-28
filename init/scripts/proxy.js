/**
 * scripts/proxy.js
 * ================
 * Runtime bot-render proxy for VPS / Node.js deployment.
 *
 * What it does:
 *   - Receives all incoming requests.
 *   - Non-bots get a 302 redirect to the live site (siteUrl or targetUrl).
 *   - Bots get a Puppeteer-rendered snapshot of the target page.
 *   - Rendered HTML is cached to disk. Cache entries expire after cacheDuration ms.
 *   - A valid x-prestruct-refresh header (matching PRESTRUCT_SECRET) busts the
 *     cache for a specific path on demand.
 *
 * Deployment:
 *   1. Copy this file and ssr.config.js to your VPS.
 *   2. `npm install express puppeteer` (puppeteer downloads Chromium automatically).
 *   3. Set PRESTRUCT_SECRET env var to the shared secret. It is an env var
 *      only -- no config key feeds it. Unset secret = refresh feature off.
 *   4. `node scripts/proxy.js` -- or use pm2 / systemd to keep it alive
 *      (ecosystem.cjs and scripts/prestruct-proxy.service ship alongside).
 *   5. Reverse-proxy port 3000 (or $PORT) with nginx/caddy for TLS.
 *
 * Browser pooling:
 *   A single Chromium instance is shared across all requests. Pages are opened
 *   and closed per request, but the browser process stays warm. This avoids the
 *   cold-start cost and OOM risk of launching a browser per request.
 *   On crash or unhandled error the browser reference is cleared and reopened
 *   on the next request.
 *
 * Cache key:
 *   SHA-256 of the full URL path + query string. Using a hash avoids any
 *   filesystem-unsafe characters from raw URL segments.
 *
 * Security:
 *   - Cache refresh requires a matching PRESTRUCT_SECRET. Without it, the header
 *     is ignored. An empty or null secret disables refresh entirely.
 *   - The compare is constant-time (SHA-256 + timingSafeEqual) so response
 *     timing cannot leak the secret one byte at a time.
 *   - Only GET requests are processed. All others return 405.
 *   - Request URL is validated before being passed to Puppeteer.
 *
 * targetUrl vs siteUrl:
 *   Set config.proxy.targetUrl to point the proxy at a different origin than
 *   siteUrl. Useful when the proxy sits in front of a separate backend (WordPress,
 *   a staging URL, or localhost:5173 for local dev). Defaults to siteUrl.
 *
 * Import safety (for tests):
 *   The module exports createProxyApp(config) and is inert at import time --
 *   config binding, server listening, and browser pre-warm only happen when
 *   executed directly (same gate pattern as engine files). `puppeteer` is a
 *   dynamic import inside getBrowser() so importing the module never pays the
 *   cost of (or requires) Chromium.
 */

import fs   from 'fs'
import path from 'path'
import crypto from 'crypto'
import express from 'express'
import { pathToFileURL } from 'url'

// -- Runtime state (set by createProxyApp) ------------------------------------

let TARGET_URL     = null
let BOT_LIST       = []
let SECRET_SHA256  = null

export const PORT = normalizePort(process.env.PORT)

// Port guard (walk 2026-10): a junk PORT env ("", "3000x", "port") made
// parseInt() produce NaN and server.listen(NaN) died at startup with a
// runtime error far from its cause. Validate and fall back loudly.
export function normalizePort(raw) {
  const n = parseInt(raw ?? '3000', 10)
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    console.warn(`[proxy] PORT "${raw}" is not a valid port -- falling back to 3000`)
    return 3000
  }
  return n
}

// -- Secret compare (constant time) -------------------------------------------
// Only honoured when a secret is configured and matches. Hash both sides to a
// fixed length and use timingSafeEqual: response timing cannot distinguish a
// matching prefix of the secret from a mismatching one.

export function secretMatches(headerValue) {
  if (!SECRET_SHA256 || headerValue == null) return false
  const provided = crypto.createHash('sha256').update(String(headerValue)).digest()
  return crypto.timingSafeEqual(SECRET_SHA256, provided)
}

// -- Bot detection -------------------------------------------------------------

export function isBot(ua) {
  if (!ua) return false
  const lower = String(ua).toLowerCase()
// Live-fire fix (2026-10): tokens were matched against the lowercased UA
// but kept their own case -- "Googlebot" never matched "googlebot" inside a
// real UA string, so every configured bot got a 302. Lowercase both sides.
  return BOT_LIST.some(token => lower.includes(String(token).toLowerCase()))
}

// -- Cache helpers -------------------------------------------------------------

// Location override exists so CI/tests (and VPS layouts that mount cache
// on a tmpfs or data disk) don't litter the process CWD. Without the override
// the import-time mkdirSync left a directory behind in whatever directory
// the module was imported from.
const CACHE_DIR    = path.resolve(process.env.PRESTRUCT_CACHE_DIR || '.prestruct_cache')
const CACHE_TTL    = 1000 * 60 * 60 * 24   // 24 hours -- adjust if needed

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })

function cacheKey(url) {
  return crypto.createHash('sha256').update(url).digest('hex')
}

function cachePath(key) {
  return path.join(CACHE_DIR, `${key}.html`)
}

function cacheRead(key) {
  const p = cachePath(key)
  if (!fs.existsSync(p)) return null
  const stat = fs.statSync(p)
  if (Date.now() - stat.mtimeMs > CACHE_TTL) return null
  return { html: fs.readFileSync(p, 'utf8'), cachedAt: stat.mtime.toISOString() }
}

function cacheWrite(key, html) {
  fs.writeFileSync(cachePath(key), html, 'utf8')
  // Cleanup if cache exceeds limit
  cleanupCache()
}

// Cleanup old/large cache files
let lastCleanup = 0

// Eviction only ever touches cache-shaped files: a 64-hex `.html` written by
// this proxy's cacheWrite. Walk 2026-10 finding: the old implementation
// readdirSync'd the WHOLE cache dir and evicted the OLDEST FILES whatever
// they were -- with the documented PRESTRUCT_CACHE_DIR override, an operator
// mounting a shared/large directory as the cache could have their non-proxy
// files deleted once the directory crossed the size limit. Decoys stay put.
// The size cap is also an env knob now (PRESTRUCT_CACHE_MAX_MB, default 500)
// so operators on small disks can turn eviction on before it matters -- and
// so tests can exercise real eviction without 500MB of fixtures.
const CACHE_FILE_SHAPE = /^[0-9a-f]{64}\.html$/
export function cleanupCache({ force = false } = {}) {
  const now = Date.now()
  // Only run cleanup once per minute max (force bypasses for tests)
  if (!force && now - lastCleanup < 60000) return
  lastCleanup = now

  try {
    const maxCacheSize = Math.max(1, parseInt(process.env.PRESTRUCT_CACHE_MAX_MB || '500', 10) || 500) * 1024 * 1024
    const files = fs.readdirSync(CACHE_DIR)
      .filter(f => CACHE_FILE_SHAPE.test(f))
      .map(f => {
        const p = path.join(CACHE_DIR, f)
        const stat = fs.statSync(p)
        return { path: p, size: stat.size, mtime: stat.mtimeMs }
      })

    // Calculate total size
    let totalSize = files.reduce((sum, f) => sum + f.size, 0)

    // If over limit, remove oldest files
    if (totalSize > maxCacheSize) {
      files.sort((a, b) => a.mtime - b.mtime)
      const evicted = []
      while (totalSize > maxCacheSize * 0.8 && files.length > 0) {
        const oldest = files.shift()
        fs.unlinkSync(oldest.path)
        totalSize -= oldest.size
        evicted.push(oldest.path)
      }
      // The old log printed the REMAINING count as "removed" -- misleading ops
      // signal during incidents.
      console.log('[proxy] Cache cleaned up, removed', evicted.length, 'files')
    }
  } catch (err) {
    console.warn('[proxy] Cache cleanup failed:', err.message)
  }
}

// -- Browser pool (single shared instance) ------------------------------------

let browser = null

async function getBrowser() {
  if (browser) return browser
  // Dynamic import: only the render path ever needs Puppeteer/Chromium, and
  // importing the module must not require it (unit tests, CI shells).
  const { default: puppeteer } = await import('puppeteer')
  browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',   // avoids /dev/shm OOM on Linux containers
      '--disable-gpu',
    ],
    headless: true,
  })
  browser.on('disconnected', () => {
    // Clear the reference so the next request spawns a fresh instance
    console.warn('[proxy] Browser disconnected -- will reopen on next request')
    browser = null
  })
  return browser
}

// -- Render --------------------------------------------------------------------

async function render(targetFullUrl) {
  const b    = await getBrowser()
  const page = await b.newPage()
  try {
    await page.setViewport({ width: 1280, height: 800 })
    // Tag the request so origin servers can identify proxy traffic
    await page.setExtraHTTPHeaders({ 'X-Prestruct-Proxy': 'true' })
    await page.goto(targetFullUrl, { waitUntil: 'networkidle0', timeout: 30000 })
    return await page.content()
  } finally {
    // Always close the page to free memory, even on error
    await page.close().catch(() => {})
  }
}

// -- Render concurrency limit ------------------------------------------------
// Max concurrent renders to prevent overwhelming the system.

export const MAX_CONCURRENT = 5
let activeRenders = 0
const renderQueue = []

export async function withRenderLimit(fn) {
  if (activeRenders < MAX_CONCURRENT) {
    activeRenders++
    try {
      return await fn()
    } finally {
      activeRenders--
      // Process next in queue. The queued callback recurses into
      // withRenderLimit rather than calling fn() directly: the old form
      // skipped the acquire, so after the first overflow renders ran with
      // zero active accounting -- i.e. UNBOUNDED concurrency again under
      // sustained bot load, which is exactly the queue's job to prevent.
      // Recursion is safe here: we just freed a slot, so the queue branch
      // cannot be reached again.
      if (renderQueue.length > 0) {
        const next = renderQueue.shift()
        next()
      }
    }
  }
  // Queue the request; rejection must propagate to the waiting caller
  // (the old form swallowed rejections and left the caller's promise forever
  // pending).
  return new Promise((resolve, reject) => {
    renderQueue.push(() => { withRenderLimit(fn).then(resolve, reject) })
  })
}

// -- Single-flight renders ---------------------------------------------------
// (2026-10 walk): the concurrency limiter bounds how many renders run at once,
// but a 50-bot burst on the same uncached URL still queued TEN sequential
// renders of the identical page -- one full wave of 5 before the first HIT
// could serve. renderOnce collapses a burst to one render: the first miss
// opens a flight keyed by the cache key, every other identical miss awaits
// the same promise and is served its bytes. Forced refreshes skip the flight
// (their contract is bypass-the-cache, so they must not ride one) and own no
// map entry, so a flight can never be deleted by a request that is not its
// owner.
const inflightRenders = new Map()

/**
 * Render a URL exactly once per burst: concurrent identical misses share the
 * one render; forced refreshes bypass the flight entirely.
 *
 * @param {string} key  - sha256 cache key of the request URL
 * @param {string} targetFullUrl - the origin URL page.goto renders
 * @param {boolean} [forceRefresh] - true = render fresh, bypass the flight
 * @returns {Promise<string>} rendered HTML (shared instance across joiners)
 */
export async function renderOnce(key, targetFullUrl, forceRefresh = false, renderFn = render) {
  if (!forceRefresh && inflightRenders.has(key)) {
    return inflightRenders.get(key)
  }
  const own = !forceRefresh
  const promise = withRenderLimit(() => renderFn(targetFullUrl))
  if (own) {
    inflightRenders.set(key, promise)
    promise.finally(function () {
      if (inflightRenders.get(key) === promise) inflightRenders.delete(key)
    }).catch(function () {})
  }
  return promise
}

// -- Express app ---------------------------------------------------------------
// The app is a module-level singleton: one browser, one queue, one flight map.
const app = express()

// Live-fire fix (2026-10): the wildcard routes (`app.all('*')` /
// `app.get('*')`) belong to Express 4 only -- Express 5 (what a bare
// `npm install express` resolves today) rejects `*` at app construction
// with path-to-regexp's "Missing parameter name" PathError, so the proxy
// crashed before serving anything. A pathless app.use() middleware gives
// identical catch-all behavior on both majors.
export async function proxyHandler(req, res, next) {
  // Only GET -- proxying other methods through Puppeteer is meaningless
  if (req.method !== 'GET') return res.status(405).send('Method not allowed.')

  const ua  = req.headers['user-agent'] || ''
  const bot = isBot(ua)

  // Validate and build the target URL. Build it by concatenation (preserving
  // any path prefix on targetUrl) and then require the resolved origin to
  // equal the configured target origin, so a request target like
  // `//evil.com/x` or `@evil.com/` can never swap the host. The old form
  // relied on Node's HTTP parser rejecting `@`-prefixed targets -- correct
  // today, but the SSRF guard should not hinge on parser behavior.
  let targetFullUrl
  try {
    const base   = new URL(TARGET_URL)
    const parsed = new URL(`${TARGET_URL}${req.url}`)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== base.origin) {
      throw new Error('Invalid target origin')
    }
    targetFullUrl = parsed.toString()
  } catch {
    return res.status(400).send('Invalid request URL.')
  }

  // Non-bots redirect to the live site -- no rendering needed
  if (!bot) {
    return res.redirect(302, targetFullUrl)
  }

  // Cache refresh -- only honoured when a secret is configured and matches
  const refreshHeader = req.headers['x-prestruct-refresh']
  const forceRefresh  = secretMatches(refreshHeader)

  const key    = cacheKey(req.url)
  const cached = forceRefresh ? null : cacheRead(key)

  if (cached) {
    res.setHeader('X-Prestruct-Cache',       'HIT')
    res.setHeader('X-Prestruct-Rendered-At', cached.cachedAt)
    res.setHeader('Content-Type',            'text/html; charset=utf-8')
    return res.send(cached.html)
  }

  try {
    const html = await renderOnce(key, targetFullUrl, forceRefresh)
    cacheWrite(key, html)
    res.setHeader('X-Prestruct-Cache',       'MISS')
    res.setHeader('X-Prestruct-Rendered-At', new Date().toISOString())
    res.setHeader('Content-Type',            'text/html; charset=utf-8')
    return res.send(html)
  } catch (err) {
    console.error('[proxy] Render failed:', err.message)
    // Fall through to the live site rather than serving an error page to the bot
    return res.redirect(302, targetFullUrl)
  }
}

app.use(proxyHandler)

// -- Configuration + startup --------------------------------------------------
// createProxyApp binds a validated config to the shared app and returns it, so
// tests (or embedding hosts) can drive the pipeline without opening a port.
// Startup validation applies the same rules the old top-level code enforced.

export function createProxyApp(config) {
  const proxyConfig = (config && config.proxy) || {}

  if (!config || !config.siteUrl) {
    throw new Error('[proxy] siteUrl is required in ssr.config.js')
  }

  TARGET_URL = (proxyConfig.targetUrl || config.siteUrl).replace(/\/$/, '')

  // Validate TARGET_URL is a valid URL
  try {
    new URL(TARGET_URL)
  } catch (err) {
    throw new Error(`[proxy] Invalid targetUrl: ${TARGET_URL}`)
  }

  BOT_LIST = proxyConfig.botList || []
  if (!Array.isArray(proxyConfig.botList) || proxyConfig.botList.length === 0) {
    // Loud config diagnostic (#52 form): a proxy with an empty bot list
    // renders nothing -- every request, bot or not, gets the 302 and the
    // operator sees a green process doing nothing. Config is author-owned,
    // so this warns instead of failing.
    console.warn('[proxy] config.proxy.botList is empty or missing -- no bot will ever be rendered (every request 302s). Set the browser token list.')
  }

  const secret = process.env.PRESTRUCT_SECRET || null
  SECRET_SHA256 = secret
    ? crypto.createHash('sha256').update(secret).digest()
    : null

  return app
}

// -- CLI entry ----------------------------------------------------------------
// Only runs when executed directly (node scripts/proxy.js) -- never on import.
// Same gate pattern as engine files.

export function isMainExecute() {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || '').href
  } catch {
    return false
  }
}

async function main() {
  let config = null
  try {
    config = (await import('../ssr.config.js')).default
  } catch (err) {
    console.error('[proxy] Could not load ssr.config.js:', err.message)
    process.exit(1)
  }

  const server = createProxyApp(config)

  server.listen(PORT, () => {
    console.log(`[proxy] Prestruct proxy listening on port ${PORT}`)
    console.log(`[proxy] Target: ${TARGET_URL}`)
    if (!SECRET_SHA256) {
      console.warn('[proxy] PRESTRUCT_SECRET not set -- cache refresh disabled')
    }
  })

  // Pre-warm the browser so the first bot request doesn't cold-start Chromium
  getBrowser().then(() => {
    console.log('[proxy] Browser ready')
  }).catch(err => {
    console.error('[proxy] Browser pre-warm failed:', err.message)
  })
}

if (isMainExecute()) {
  main().catch(err => {
    console.error('[proxy] Fatal:', err.message)
    process.exit(1)
  })
}
