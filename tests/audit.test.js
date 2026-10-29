import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, it, expect, afterEach } from 'vitest'
import { auditOutput, auditInternalLinks, auditExternalLinks } from '../engine/scripts/audit.js'
import { generateSitemap, assertXmlSafe } from '../engine/scripts/prerender.js'

/**
 * audit.js tests
 * Fixture-dist tests for the `prestruct audit` FAIL/WARN contract. The unit
 * battery pins the grade classes; the example build runs the audit live
 * against real prerendered output on every build.
 */

let tmpDirs = []
const makeRoot = () => {
  const dir = mkdtempSync(join(tmpdir(), 'prestruct-audit-'))
  tmpDirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true })
  tmpDirs = []
})

/** Full engine-shaped head (what inject-brand + prerender produce). */
const CLEAN_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Home | Site Co</title>
  <meta name="description" content="A description that comfortably clears the seventy-character band for search previews." />
  <meta name="author" content="Site" />
  <link rel="canonical" href="https://e2e.test" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://e2e.test" />
  <meta property="og:title" content="Home | Site Co" />
  <meta property="og:description" content="A description that comfortably clears the seventy-character band for search previews." />
  <meta property="og:image" content="https://e2e.test/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Brand mark" />
  <meta name="twitter:image" content="https://e2e.test/og.png" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:site_name" content="Site Co" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Home | Site Co" />
  <meta name="twitter:description" content="A description that comfortably clears the seventy-character band for search previews." />
</head>
<body><h1>Welcome home</h1><div id="root"></div></body>
</html>`

function writeArtifacts(root, { sitemap = true, robots = true } = {}) {
  mkdirSync(join(root, 'dist'), { recursive: true })
  if (sitemap) {
    writeFileSync(join(root, 'dist', 'sitemap.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      '<url><loc>https://e2e.test</loc><lastmod>2026-10-26</lastmod></url></urlset>', 'utf8')
  }
  if (robots) {
    writeFileSync(join(root, 'dist', 'robots.txt'),
      'User-agent: *\nAllow: /\n\nSitemap: https://e2e.test/sitemap.xml\n', 'utf8')
  }
}

function writeFixture(root, files) {
  for (const [rel, html] of Object.entries(files)) {
    const target = join(root, 'dist', rel)
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, html, 'utf8')
  }
}

function audit(root, config, opts = {}) {
  return auditOutput({ outputDir: join(root, 'dist'), config: config ?? { siteUrl: 'https://e2e.test' }, capture: true, ...opts })
}

describe('auditOutput: the clean grade', () => {
  it('clean tree: 0 failures, page count, sitemap locs counted', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD })
    const r = audit(root)
    expect(r.fails).toEqual([])
    expect(r.pages).toBe(1)
    expect(r.sitemapLocs).toBe(1)
  })

  it('404 pages grade ONLY the noindex contract', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { '404.html': '<html><head><meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"></head><body>404</body></html>' })
    const r = audit(root)
    expect(r.fails).toEqual([])
  })

  it('404 without noindex is a FAIL', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { '404.html': '<html><head></head><body>404</body></html>' })
    const r = audit(root)
    expect(r.fails.some(f => f.msg.includes('noindex'))).toBe(true)
  })

  it('a file parked at the outputDir path lands a named missing shape, not an uncaught crash', () => {
    const root = makeRoot()
    writeFileSync(join(root, 'dist'), 'i am a file', 'utf8')
    const r = audit(root)
    expect(r.fails).toEqual([{ page: 'outputDir', msg: 'missing' }])
  })
})

describe('auditOutput: FAIL classes', () => {
  it('missing meta description', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD.replace(/<meta name="description"[^>]*>\n/, '') })
    const r = audit(root)
    expect(r.fails.some(f => f.msg === 'missing meta description')).toBe(true)
  })

  it('relative canonical link', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD.replace('href="https://e2e.test"', 'href="/"') })
    const r = audit(root)
    expect(r.fails.some(f => f.msg.includes('canonical not absolute'))).toBe(true)
  })

  it('duplicate <title> (the rebuild-idempotency guard)', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, {
      'index.html': CLEAN_HEAD.replace('</head>', '<title>Home | Site Co</title>\n</head>'),
    })
    const r = audit(root)
    expect(r.fails.some(f => f.msg.includes('multiple <title>'))).toBe(true)
  })

  it('SVG og:image stays FAIL-grade (the social-raster trap)', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD.replace('/og.png', '/og.svg') })
    const r = audit(root)
    expect(r.fails.some(f => f.msg.includes('og:image is SVG'))).toBe(true)
  })

  it('missing sitemap is a FAIL; empty sitemap is a FAIL', () => {
    const root = makeRoot()
    writeArtifacts(root, { sitemap: false })
    writeFixture(root, { 'index.html': CLEAN_HEAD })
    expect(audit(root).fails.some(f => f.page === 'sitemap.xml' && f.msg.includes('missing'))).toBe(true)

    const root2 = makeRoot()
    writeArtifacts(root2)
    writeFileSync(join(root2, 'dist', 'sitemap.xml'), '<?xml version="1.0"?><urlset></urlset>', 'utf8')
    expect(audit(root2).fails.some(f => f.msg === 'no <loc> entries')).toBe(true)
  })

  it('robots graded only when config.robots is set (the author-owned copy is never engine-touched)', () => {
    const root = makeRoot()
    writeArtifacts(root, { robots: false })
    writeFixture(root, { 'index.html': CLEAN_HEAD })
    // No config.robots: nothing to grade.
    expect(audit(root, { siteUrl: 'https://e2e.test' }).fails.some(f => f.page === 'robots.txt')).toBe(false)
    // config.robots set: the missing file is the engine's failure.
    expect(audit(root, { siteUrl: 'https://e2e.test', robots: true }).fails.some(f => f.page === 'robots.txt' && f.msg.includes('missing'))).toBe(true)

    // And a pointerless robots.txt (author-supplied, engine-configured) fails
    // the pointer contract, not the file-existence one.
    const root2 = makeRoot()
    writeArtifacts(root2)
    writeFileSync(join(root2, 'dist', 'robots.txt'), 'User-agent: *\nAllow: /\n', 'utf8')
    expect(audit(root2, { siteUrl: 'https://e2e.test', robots: true }).fails.some(f => f.msg === 'no Sitemap: pointer')).toBe(true)
  })
})

describe('auditOutput: WARN classes (report-grade, never fail)', () => {
  it('long titles warn through the band instead of failing', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD.replace('<title>Home | Site Co</title>', '<title>A very long headline that goes well past the sixty-five character search preview band</title>') })
    const r = audit(root)
    expect(r.fails).toEqual([])
    expect(r.warns.some(w => w.msg.includes('title') && w.msg.includes('> 65'))).toBe(true)
  })

  it('og:image without companions warns via the object-form hint', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD.replace(/<meta property="og:image:width"[^>]*>\n/, '') })
    const r = audit(root)
    expect(r.warns.some(w => w.msg.includes('og:image:width/height/alt absent'))).toBe(true)
  })

  it('og:image disk-missing is a WARN (same-host CDN setups stay valid)', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD })
    const r = audit(root)
    expect(r.warns.some(w => w.msg.includes('does not exist on disk'))).toBe(true)
  })

  it('og:image WITH a real raster on disk stays clean of the disk warning', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFileSync(join(root, 'dist', 'og.png'), 'pngbytes', 'utf8')
    writeFixture(root, { 'index.html': CLEAN_HEAD })
    const r = audit(root)
    expect(r.warns.some(w => w.msg.includes('og:image points at'))).toBe(false)
  })

  it('missing h1 warns', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, { 'index.html': CLEAN_HEAD.replace('<h1>Welcome home</h1>', '') })
    expect(audit(root).warns.some(w => w.msg.includes('non-empty <h1>'))).toBe(true)
  })

  it('LocalBusiness recommended-fields warns; unparseable LD still fails', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, {
      'index.html': CLEAN_HEAD.replace('</head>', `<script type="application/ld+json">
      { "@context": "https://schema.org", "@type": "LocalBusiness", "name": "X" }
      </script>
      </head>`),
    })
    const r = audit(root)
    expect(r.warns.some(w => w.msg.includes('LocalBusiness missing recommended'))).toBe(true)

    const root2 = makeRoot()
    writeArtifacts(root2)
    writeFixture(root2, {
      'index.html': CLEAN_HEAD.replace('</head>', '<script type="application/ld+json">not json</script>\n</head>'),
    })
    expect(audit(root2).fails.some(f => f.msg.includes('invalid JSON-LD'))).toBe(true)
  })
})

describe('auditInternalLinks', () => {
  it('broken pretty-URL targets report; resolved ones do not', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, {
      'index.html': '<html><body><a href="/nowhere">gone</a><a href="/about">ok</a></body></html>',
      'about/index.html': '<html><head><title>About | Site Co</title></head><body><h1>About</h1></body></html>',
    })
    const broken = auditInternalLinks({ outputDir: join(root, 'dist') })
    expect(broken).toEqual([{ file: 'index.html', link: '/nowhere' }])
  })

  it('schemes and asset-like targets skip the route check', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, {
      'index.html': '<html><body><a href="mailto:x@y.z">m</a><a href="/assets/index.js">js</a><a href="https://ext.test/">e</a></body></html>',
    })
    expect(auditInternalLinks({ outputDir: join(root, 'dist') })).toEqual([])
  })

  it('code payloads are stripped: teach-shapes are not routes (freestruct Pass 26.14 lesson)', () => {
    const root = makeRoot()
    writeArtifacts(root)
    writeFixture(root, {
      'index.html': '<html><body><pre><a href="/docs-taught">teach</a></pre><code><a href="/code-shape">shape</a></code><a href="/real">real</a></body></html>',
    })
    const broken = auditInternalLinks({ outputDir: join(root, 'dist') })
    expect(broken).toEqual([{ file: 'index.html', link: '/real' }])
  })
})

describe('auditExternalLinks', () => {
  it('missing dir returns the empty shape', async () => {
    const r = await auditExternalLinks({ outputDir: join(makeRoot(), 'noop') })
    expect(r).toEqual({ warns: [], checked: 0 })
  })
})

describe('generateSitemap: honest lastmod + xml safety', () => {
  it('lastmod rides the provided mtime, not the build stamp', () => {
    const mtimes = new Map([['/', new Date('2025-01-15T10:30:00Z')]])
    const xml = generateSitemap([{ path: '/' }], 'https://e2e.test', mtimes)
    expect(xml).toContain('<lastmod>2025-01-15</lastmod>')
  })

  it('unknown routes fall back to a same-day stamp', () => {
    const xml = generateSitemap([{ path: '/' }], 'https://e2e.test')
    const today = new Date().toISOString().split('T')[0]
    expect(xml).toContain('<lastmod>' + today + '</lastmod>')
  })

  it('escapes XML-significant route chars', () => {
    const xml = generateSitemap([{ path: '/a&b' }], 'https://e2e.test')
    expect(xml).toContain('<loc>https://e2e.test/a&amp;b</loc>')
  })
})

it('assertXmlSafe refuses control characters loudly', () => {
  expect(assertXmlSafe('fine', 'x')).toBe('fine')
  expect(() => assertXmlSafe('bad\u0000value', 'sitemap loc')).toThrow(/control character U\+0000/)
})
