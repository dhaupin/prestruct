/**
 * scripts/proxy.worker.js
 * =======================
 * Cloudflare Worker version of the Prestruct render proxy.
 *
 * Uses Cloudflare's Browser Rendering API (@cloudflare/puppeteer) instead of
 * a local Chromium install. No VPS, no process management -- deploy as a Worker.
 *
 * Requirements:
 *   - Workers Paid plan (Browser Rendering is not available on the free tier).
 *   - `@cloudflare/puppeteer` bound as a Browser binding in wrangler.toml.
 *   - KV namespace bound as `CACHE` in wrangler.toml (for HTML cache storage).
 *   - PRESTRUCT_SECRET set as a Worker secret via `wrangler secret put`.
 *
 * wrangler.toml additions needed:
 *
 *   [[browser]]
 *   binding = "BROWSER"
 *
 *   [[kv_namespaces]]
 *   binding = "CACHE"
 *   id      = "your-kv-namespace-id"
 *
 *   [vars]
 *   PRESTRUCT_TARGET_URL = "https://yoursite.com"
 *   CACHE_TTL_SECONDS    = "86400"
 *
 * Deployment:
 *   1. Copy this file to your Worker project root (or a standalone Worker repo).
 *   2. `npm install @cloudflare/puppeteer wrangler`
 *   3. Update wrangler.toml with the bindings above.
 *   4. `wrangler secret put PRESTRUCT_SECRET`
 *   5. `wrangler deploy`
 *
 * Cache:
 *   Rendered HTML is stored in KV with a TTL. KV is eventually consistent --
 *   cache busts may take a few seconds to propagate globally.
 *
 * targetUrl vs siteUrl:
 *   Set PRESTRUCT_TARGET_URL in wrangler.toml [vars] to point the proxy at a
 *   different origin (WordPress, staging, localhost tunnel, etc.).
 *   Defaults to the `x-forwarded-host` of the incoming request if not set.
 *
 * Bot list:
 *   Maintained inline here. Sync with config.proxy.botList in ssr.config.js
 *   if you customise either. The Worker has no access to your build-time config.
 *
 * Security:
 *   - Cache refresh requires the PRESTRUCT_SECRET value in x-prestruct-refresh,
 *     compared with a full-length constant-time XOR (see refreshSecretMatches).
 *   - Only GET requests are processed. Others return 405.
 *   - Target URL is validated before passing to the browser.
 *
 * Import safety (for tests):
 *   `@cloudflare/puppeteer` is loaded lazily inside the render step, so
 *   importing this module -- in unit tests, CI, or a bundler -- never requires
 *   the package. Only requests that actually need a rendered page pay for it.
 *   The exported helpers (isBot, cacheKey, refreshSecretMatches) are pure and
 *   run in any JS runtime, not just Workers.
 */

// Keep this in sync with config.proxy.botList in ssr.config.js
const BOT_LIST = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'twitterbot',
  'facebookexternalhit',
  'discordbot',
  'linkedinbot',
  'slackbot',
  'telegrambot',
  'whatsapp',
]

export function isBot(ua) {
  if (!ua) return false
  const lower = String(ua).toLowerCase()
// Live-fire fix (2026-10): tokens were matched against the lowercased UA
// but kept their own case -- "Googlebot" never matched "googlebot" inside a
// real UA string, so every configured bot got a redirect. Lowercase both
// sides (mirrors the same fix in proxy.js).
  return BOT_LIST.some(token => lower.includes(String(token).toLowerCase()))
}

export function cacheKey(url) {
  // KV key: simple prefix + encoded path. Max 512 bytes, URL-safe.
  return `prestruct:${encodeURIComponent(url)}`
}

// Walk 2026-10 finding: KV keys are capped at 512 bytes -- a long query
// string (tracked urls, exported search params) blows past the cap and the
// KV put/get REJECTS, turning an already-successful render into a 500 on
// the response path. The legacy encoding stays the key for every normal
// URL (byte-identical existing cache entries); only oversized keys fall
// back to SHA-256 hex (collision-proof per the shared cache-key lesson)
// under a shape-tagged prefix. crypto.subtle is available in Workers AND any
// Web-Crypto runtime; Node >=20 ships it as a global.
export async function cacheKeyFor(url) {
  const legacy = cacheKey(url)
  if (legacy.length <= 500) return legacy
  const bytes = new TextEncoder().encode(String(url))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `prestruct:sha256:${hex}`
}

// -- Secret compare (constant time) -------------------------------------------
// Workers cannot import node:crypto, so there is no timingSafeEqual here.
// The XOR form is the standard constant-time comparator available in any
// runtime: every byte of both inputs is read and folded into one accumulator,
// regardless of where (or whether) they differ. The result depends only on
// whether the strings are equal -- never on how far in they diverge.
//
// Note: the return value requires BOTH equal content and equal byte length.
// A differing length never matches, but its comparison still burns the same
// work as an equal-length mismatch (full loop over the longer string).
export function refreshSecretMatches(secret, headerValue) {
  if (secret == null || secret === '' || headerValue == null) return false
  const a = new TextEncoder().encode(String(secret))
  const b = new TextEncoder().encode(String(headerValue))
  let diff = a.length ^ b.length
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    diff |= (a[i % a.length] || 0) ^ (b[i % b.length] || 0)
  }
  return diff === 0
}

export default {
  async fetch(request, env) {
    // Only GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed.', { status: 405 })
    }

    const ua  = request.headers.get('user-agent') || ''
    const bot = isBot(ua)

    // Build target URL
    const TARGET_URL = (env.PRESTRUCT_TARGET_URL || '').replace(/\/$/, '')
    if (!TARGET_URL) {
      return new Response('[proxy] PRESTRUCT_TARGET_URL not configured.', { status: 500 })
    }

    const requestUrl = new URL(request.url)
    let targetFullUrl
    try {
      const parsed = new URL(`${TARGET_URL}${requestUrl.pathname}${requestUrl.search}`)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol')
      targetFullUrl = parsed.toString()
    } catch {
      return new Response('Invalid request URL.', { status: 400 })
    }

    // Non-bots redirect to the live site
    if (!bot) {
      return Response.redirect(targetFullUrl, 302)
    }

    // Cache refresh check. Constant-time compare (see refreshSecretMatches):
    // response timing reveals nothing about where the submitted token diverges
    // from the secret.
    const SECRET       = env.PRESTRUCT_SECRET || null
    const refreshToken = request.headers.get('x-prestruct-refresh')
    const forceRefresh = refreshSecretMatches(SECRET, refreshToken)

    const TTL = parseInt(env.CACHE_TTL_SECONDS || '86400', 10)
    const key = await cacheKeyFor(requestUrl.pathname + requestUrl.search)

    // Try KV cache first (payload is the {html, cachedAt} JSON we now store)
    if (!forceRefresh) {
      const cachedRaw = await env.CACHE.get(key, { type: 'text' })
      if (cachedRaw) {
        let cached = { html: cachedRaw, cachedAt: 'unknown' }
        try { cached = JSON.parse(cachedRaw) } catch {}
        return new Response(cached.html, {
          headers: {
            'Content-Type':            'text/html; charset=utf-8',
            'X-Prestruct-Cache':       'HIT',
            'X-Prestruct-Rendered-At': String(cached.cachedAt || 'unknown'),
          },
        })
      }
    }

    // Render via Browser Rendering API. The binding is imported lazily so the
    // module (and its unit tests) never require the @cloudflare/puppeteer
    // package -- only the render path does.
    let html
    let browser
    let page
    try {
      const { default: workerPuppeteer } = await import('@cloudflare/puppeteer')
      browser = await workerPuppeteer.launch(env.BROWSER)
      page    = await browser.newPage()
      await page.setViewport({ width: 1280, height: 800 })
      await page.setExtraHTTPHeaders({ 'X-Prestruct-Proxy': 'true' })
      await page.goto(targetFullUrl, { waitUntil: 'networkidle0', timeout: 30000 })
      html = await page.content()
    } catch (err) {
      console.error('[proxy:worker] Render failed:', err.message)
      // Fall through to live site on render failure
      return Response.redirect(targetFullUrl, 302)
    } finally {
      if (page) {
        try {
          await page.close()
        } catch {}
      }
      if (browser) {
        try {
          await browser.close()
        } catch {}
      }
    }

    // Store in KV with TTL. JSON-encode with the render timestamp so the hit
    // path can report a real X-Prestruct-Rendered-At (the old form cached the
    // bare HTML and reported a stale/absent date on every HIT).
    await env.CACHE.put(key, JSON.stringify({ html, cachedAt: new Date().toISOString() }), { expirationTtl: TTL })

    return new Response(html, {
      headers: {
        'Content-Type':            'text/html; charset=utf-8',
        'X-Prestruct-Cache':       'MISS',
        'X-Prestruct-Rendered-At': new Date().toISOString(),
      },
    })
  },
}
