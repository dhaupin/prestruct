import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, it, expect, afterEach } from 'vitest'
import { syncProxyBotList, injectBrand } from '../engine/scripts/inject-brand.js'

/**
 * inject-brand.js tests
 *
 * Tests the config parsing and meta injection logic without requiring fs
 * (except the syncProxyBotList suite, which exercises real file I/O in a
 * temp dir). The actual script integration tests run via npm run build in CI.
 */

// ── syncProxyBotList ───────────────────────────────────────────────────────────

// A realistic skeleton of scripts/proxy.worker.js -- same shape the engine
// ships. Kept in the test rather than read from init/ so the suite stays
// independent of the repo layout.
const WORKER_SKELETON = `import puppeteer from '@cloudflare/puppeteer'

// Keep this in sync with config.proxy.botList in ssr.config.js
const BOT_LIST = [
  'googlebot',
  'bingbot',
]

function isBot(ua) {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_LIST.some(token => lower.includes(token))
}

export default { async fetch() {} }
`

let tmpDirs = []
function makeTempProject(workerContent = WORKER_SKELETON) {
  const root = mkdtempSync(join(tmpdir(), 'prestruct-botlist-'))
  tmpDirs.push(root)
  mkdirSync(join(root, 'scripts'), { recursive: true })
  if (workerContent !== null) {
    writeFileSync(join(root, 'scripts', 'proxy.worker.js'), workerContent, 'utf8')
  }
  return root
}

afterEach(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true })
  tmpDirs = []
})

const workerContentOf = root => readFileSync(join(root, 'scripts', 'proxy.worker.js'), 'utf8')

describe('syncProxyBotList', () => {
  it('rewrites BOT_LIST in an existing proxy.worker.js from config.proxy.botList', () => {
    const root = makeTempProject()
    const config = { proxy: { url: 'https://proxy.example.com', botList: ['Googlebot', 'Bingbot'] } }

    const result = syncProxyBotList(config, root)
    const worker = workerContentOf(root)

    expect(result).toBe(true)
    expect(worker).toContain("'Googlebot',")
    expect(worker).toContain("'Bingbot',")
    expect(worker).toContain('BOT_LIST.some(token => lower.includes(token))') // rest of file intact
    expect(worker).not.toContain('\\') // no escaping glitches leaked into the array
  })

  it('is a no-op when the worker file does not exist', () => {
    const root = makeTempProject(null) // no scripts/proxy.worker.js
    const config = { proxy: { url: 'https://proxy.example.com', botList: ['Googlebot'] } }

    expect(syncProxyBotList(config, root)).toBe(false)
  })

  it('is a no-op when proxy.botList is missing, empty, or malformed', () => {
    const root = makeTempProject()
    const before = workerContentOf(root)

    expect(syncProxyBotList({ proxy: { url: 'https://x.example.com' } }, root)).toBe(false)
    expect(syncProxyBotList({ proxy: { url: 'https://x.example.com', botList: [] } }, root)).toBe(false)
    expect(syncProxyBotList({ proxy: { url: 'https://x.example.com', botList: 'googlebot' } }, root)).toBe(false)
    expect(workerContentOf(root)).toBe(before) // file untouched
  })

  it('is a no-op when proxy.url is not set', () => {
    const root = makeTempProject()
    const before = workerContentOf(root)

    // No proxy at all, or a proxy without a URL -- the Worker is not deployed
    expect(syncProxyBotList({}, root)).toBe(false)
    expect(syncProxyBotList({ proxy: { botList: ['Googlebot'] } }, root)).toBe(false)
    expect(workerContentOf(root)).toBe(before)
  })

  it('warns and returns false when BOT_LIST cannot be found in the file', () => {
    const root = makeTempProject('export default {}\n') // Worker without a BOT_LIST declaration
    const config = { proxy: { url: 'https://x.example.com', botList: ['Googlebot'] } }

    expect(syncProxyBotList(config, root)).toBe(false)
  })

  it('is idempotent: re-syncing with the same config changes nothing', () => {
    const root = makeTempProject()
    const config = { proxy: { url: 'https://x.example.com', botList: ['Googlebot', 'Bingbot', 'DuckDuckBot'] } }

    syncProxyBotList(config, root)
    const afterFirst = workerContentOf(root)
    syncProxyBotList(config, root)

    expect(workerContentOf(root)).toBe(afterFirst)
  })

  it('escapes single quotes in bot tokens', () => {
    const root = makeTempProject()
    const config = { proxy: { url: 'https://x.example.com', botList: [`evil'bot`] } }

    expect(syncProxyBotList(config, root)).toBe(true)
    expect(workerContentOf(root)).toContain("'evil\\'bot',")
  })

  it('keeps $-shaped bot tokens literal (function replacer, no $-expansion)', () => {
    const root = makeTempProject()
    const config = { proxy: { url: 'https://x.example.com', botList: ['$&', 'googlebot'] } }

    expect(syncProxyBotList(config, root)).toBe(true)
    const worker = workerContentOf(root)
    // A string-form replace() would expand "$&" into the whole match
    expect(worker).toContain("'$&',")
    expect(worker).toContain("'googlebot',")
  })
})

describe('injectBrand title replacement (tarball e2e regression)', () => {
  // Mirrors the init/ shell: a build-instruction comment carries the literal
  // text '<title>,'; the real tag sits further down. A dotall `s` flag on the
  // title regex used to pair the comment fragment with the real closing tag,
  // eating the comment closer and landing the replacement on the wrong spot.
  // Caught live by the fresh-project tarball e2e on the packed package.
  function makeDist(root) {
    mkdirSync(join(root, 'dist'), { recursive: true })
    writeFileSync(join(root, 'dist', 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <!--
    Shell template. Do not add brand meta here directly.
      title, description, author, keywords, canonical,
      Open Graph, Twitter Card, JSON-LD.
  -->
  <title>Site</title>
  <meta name="description" content="" />
  <meta name="keywords"    content="" />
  <meta name="author"      content="" />
  <link rel="canonical"    href="https://yoursite.com/" />
</head>
<body>
  <div id="root"></div>
</body>
</html>
`, 'utf8')
  }

  const config = {
    siteUrl: 'https://e2e.test',
    siteName: 'E2E Trap',
    author: 'E2E',
    routes: [],
  }

  it('replaces only the real title tag and preserves the comment tree', () => {
    const root = makeTempProject()
    makeDist(root)

    injectBrand(config, join(root, 'dist'), { getDeployId: () => 'test-id' })
    const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8')

    expect(html).toContain('<title>E2E Trap</title>')
    expect(html).not.toContain('<title>Site</title>')
    expect(html).toContain('Shell template. Do not add brand meta here directly.')
    // Exactly one title element -- the comment fragment must never start a
    // cross-line match that eats the pre-existing closer
    expect(html.match(/<title>/g)).toHaveLength(1)
  })

  it('does not touch the title when the shell comment still carries <title>,', () => {
    const root = makeTempProject()
    makeDist(root)
    // Restore the exact init/ shell comment shape that used to be a trap
    const path = join(root, 'dist', 'index.html')
    writeFileSync(path, readFileSync(path, 'utf8').replace(
      'title, description', '<title>, description'), 'utf8')

    injectBrand(config, join(root, 'dist'), { getDeployId: () => 'test-id' })
    const html = readFileSync(path, 'utf8')

    // The old buggy regex matched the comment prose; not anymore
    expect(html).toContain('<title>E2E Trap</title>')
    expect(html).not.toContain('<title>Site</title>')
    expect(html).toContain('Shell template. Do not add brand meta here directly.')
  })
})

// Helper: toReplaceSafe (from inject-brand.js)
const toReplaceSafe = (value = '') => String(value).replace(/\$/g, '$$$$')

describe('toReplaceSafe', () => {
  it('escaps dollar signs for String.replace', () => {
    expect(toReplaceSafe('$120')).toBe('$$120')
    expect(toReplaceSafe('price $50')).toBe('price $$50')
    expect(toReplaceSafe('no dollars')).toBe('no dollars')
  })

  it('handles empty strings', () => {
    expect(toReplaceSafe('')).toBe('')
  })

  it('handles null/undefined', () => {
    expect(toReplaceSafe(null)).toBe('null')
    expect(toReplaceSafe(undefined)).toBe('')
  })
})

// Helper: title generation (from inject-brand.js)
const generateTitle = (siteName, tagline) =>
  tagline ? `${siteName} | ${tagline}` : siteName

describe('generateTitle', () => {
  it('appends tagline to siteName', () => {
    expect(generateTitle('Test Site', 'Tagline')).toBe('Test Site | Tagline')
  })

  it('defaults to siteName when no tagline', () => {
    expect(generateTitle('Test Site', '')).toBe('Test Site')
    expect(generateTitle('Test Site', null)).toBe('Test Site')
  })
})

// Helper: route finding (from inject-brand.js)
const findRoute = (routes, path) => routes.find((r) => r.path === path)

describe('findRoute', () => {
  const routes = [
    { path: '/', priority: '1.0', meta: { title: 'Home', description: 'Home page' } },
    { path: '/about', priority: '0.8', meta: { title: 'About', description: 'About page' } },
    { path: '/blog', priority: '0.7', meta: { title: 'Blog', description: 'Blog page' } },
  ]

  it('finds exact route', () => {
    expect(findRoute(routes, '/about')?.meta.title).toBe('About')
  })

  it('returns undefined for missing route', () => {
    expect(findRoute(routes, '/missing')).toBe(undefined)
  })

  it('finds home route', () => {
    expect(findRoute(routes, '/')?.priority).toBe('1.0')
  })
})

describe('config pass-through contract (real validateConfig validation lives in engine.test.js)', () => {
  // Audit cleanup 2026-10-21: the three describes that lived here before
  // ("ssr.config.js validation", "404 config", "proxy config") tested local
  // literal objects against themselves -- zero engine code — and the proxy
  // block carried the retired `config.proxy.secret` key that no shipped code
  // reads. What inject-brand.js actually consumes from config is platform
  // (default cloudflare) and deployId; the REAL validateConfig checks are
  // pinned in tests/engine.test.js. These tests pin what this module does:
  // unknown/extra config keys ride along harmlessly.

  it('does not consume notFound or proxy keys (pass through untouched)', () => {
    const root = makeTempProject()
    mkdirSync(join(root, 'dist'), { recursive: true })
    writeFileSync(join(root, 'dist', 'index.html'), `<!DOCTYPE html>
<html><head><title>x</title></head><body><div id="root"></div></body></html>`, 'utf8')

    expect(() => injectBrand({
      siteUrl: 'https://e2e.test', siteName: 'S', author: 'A', routes: [],
      notFound: { heading: 'x' }, proxy: { url: 'https://p.test', botList: ['B'] },
    }, join(root, 'dist'), { getDeployId: () => 't' })).not.toThrow()
  })
})

describe('default deploy-id stability (cache signature contract)', () => {
  // Perf audit 2026-10-20: the default deploy id embedded a random base36
  // timestamp, which changed the shell on every build. Prerender's cache
  // signature covers the whole shell, so every deployId:true project
  // re-rendered its full route list every time. The default id is now stable
  // per commit (git short hash; 'dev-local' outside git). Real content still
  // invalidates honestly via the vite asset hashes in the same shell.
  it('renders the same deploy-id meta on consecutive builds', () => {
    const mkDist = (root) => {
      mkdirSync(join(root, 'dist'), { recursive: true })
      writeFileSync(join(root, 'dist', 'index.html'), `<!DOCTYPE html>
<html><head><title>x</title></head><body><div id="root"></div></body></html>
`, 'utf8')
    }
    const rootA = makeTempProject()
    const rootB = makeTempProject()
    mkDist(rootA)
    mkDist(rootB)

    const ids = [rootA, rootB].map((root) => {
      injectBrand({ siteUrl: 'https://e2e.test', siteName: 'S', author: 'A', routes: [] }, join(root, 'dist'))
      return (readFileSync(join(root, 'dist', 'index.html'), 'utf8').match(/name="deploy-id" content="([^"]*)"/) || [])[1]
    })

    expect(ids[0]).toBeTruthy()
    expect(ids[0]).toBe(ids[1])
  })
})

describe('buildJsonLd contract (single object OR array of objects)', () => {
  // The config example documents "a single object or array of objects" but the
  // engine's array-only check silently dropped the bare-object shape -- the
  // most common thing a consumer writes. Caught in the crashtest vendored-copy
  // diff (their vendored inject-brand already accepted objects; the upstream
  // refactor lost it). Ported upstream so their vendored copy can retire in
  // place without regression.
  function makeLdDist(root) {
    mkdirSync(join(root, 'dist'), { recursive: true })
    writeFileSync(join(root, 'dist', 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Site</title>
  <meta name="description" content="" />
</head>
<body>
  <div id="root"></div>
</body>
</html>
`, 'utf8')
  }

  function injectWithLd(root, buildJsonLd) {
    makeLdDist(root)
    injectBrand({ siteUrl: 'https://e2e.test', siteName: 'LD', author: 'L',
      routes: [], buildJsonLd }, join(root, 'dist'), { getDeployId: () => 't' })
    return readFileSync(join(root, 'dist', 'index.html'), 'utf8')
  }

  function ldPayload(html) {
    const match = html.match(/<script type="application\/ld\+json">\n\s*([\s\S]*?)\n\s*<\/script>/)
    expect(match).not.toBeNull()
    return JSON.parse(match[1].replace(/\\u003c/g, '<'))
  }

  it('accepts a single bare object (the most common shape)', () => {
    const html = injectWithLd(makeTempProject(), () => ({
      '@type': 'WebSite', name: 'Bare',
    }))
    expect(ldPayload(html)).toEqual({ '@type': 'WebSite', name: 'Bare' })
    expect(html).toContain('application/ld+json')
  })

  it('keeps a single-element array unwrapped (retained behavior)', () => {
    const html = injectWithLd(makeTempProject(), () => [{ '@type': 'WebSite', name: 'One' }])
    expect(ldPayload(html)).toEqual({ '@type': 'WebSite', name: 'One' })
  })

  it('wraps a multi-element array in @graph (retained behavior)', () => {
    const html = injectWithLd(makeTempProject(), () => [
      { '@type': 'WebSite', name: 'One' },
      { '@type': 'Organization', name: 'Two' },
    ])
    const payload = ldPayload(html)
    expect(payload['@context']).toBe('https://schema.org')
    expect(payload['@graph']).toHaveLength(2)
  })

  it('skips an empty array silently (retained behavior)', () => {
    const html = injectWithLd(makeTempProject(), () => [])
    expect(html).not.toContain('application/ld+json')
  })

  it('ignores a non-object return (string) rather than injecting garbage', () => {
    const html = injectWithLd(makeTempProject(), () => 'not-an-object')
    expect(html).not.toContain('application/ld+json')
  })
})
