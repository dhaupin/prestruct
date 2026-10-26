import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { replaceRootDiv, injectMeta, generateSitemap, generate404, loadStaticRouter, mergeRoutes, enginePaths, readCache, writeCache } from '../engine/scripts/prerender.js'
import { validateConfig, formatDiagnostics, defineConfig, configKeyWarnings, formatConfigWarnings } from '../engine/scripts/validate-config.js'
import { toReplaceSafe, generateTitle } from '../engine/scripts/inject-brand.js'

/**
 * Engine import-surface tests.
 * The contract files run standalone after `cp -r init/*`, so these tests
 * import the engine copies directly; CI verifies engine == init == example
 * byte-identically (tests/qc.test.mjs), which keeps the surfaces equivalent.
 */

describe('replaceRootDiv (W8: attribute-tolerant)', () => {
  it('injects data-server-rendered into a bare root div', () => {
    const shell = '<html><div id="root"></div></html>'
    const out = replaceRootDiv(shell, '<h1>hi</h1>')
    expect(out).toBe('<html><div id="root" data-server-rendered="true"><h1>hi</h1></div></html>')
  })

  it('carries existing attributes through prerendering', () => {
    const shell = '<html><div id="root" data-deploy-id-footer></div></html>'
    const out = replaceRootDiv(shell, '<p>content</p>')
    expect(out).toContain('data-deploy-id-footer')
    expect(out).toContain('data-server-rendered="true"')
  })

  it('throws when the shell has no root div', () => {
    expect(() => replaceRootDiv('<html></html>', 'x')).toThrow(/not found in shell/)
  })

  it('preserves $-shaped SSR content literally (function replacer)', () => {
    // Route content may legitimately contain "$1", "$&", "$120"... The old
    // string-form replacement expanded those as regex references, mangling
    // the SSR output. A function replacer is literal.
    const shell = '<html><div id="root"></div></html>'
    const out = replaceRootDiv(shell, '<p>Price: $120 &amp; ref $&</p>')
    expect(out).toContain('<p>Price: $120 &amp; ref $&</p>')
    expect(out).toContain('data-server-rendered="true"')
  })
})

describe('validateConfig', () => {
  it('passes a minimal valid config', () => {
    const { ok, errors } = validateConfig({ siteUrl: 'https://example.com', routes: [{ path: '/' }] })
    expect(ok).toBe(true)
    expect(errors).toEqual([])
  })

  it('fails without siteUrl', () => {
    const { ok, errors } = validateConfig({ routes: [] })
    expect(ok).toBe(false)
    expect(errors[0]).toMatch(/siteUrl is required/)
  })

  it('rejects an explicitly empty routes array (hammer finding: 0 routes validated green)', () => {
    const { ok, errors } = validateConfig({ siteUrl: 'https://x.com', routes: [] })
    expect(ok).toBe(false)
    expect(errors.some(e => e.includes('routes is empty'))).toBe(true)
  })

  it('accepts a subroutes-only list (vite still ships index.html; hammer finding: only ZERO routes is a misconfiguration)', () => {
    const { ok, errors } = validateConfig({ siteUrl: 'https://x.com', routes: [{ path: '/about', meta: { title: 'A', description: 'B' } }] })
    expect(ok).toBe(true)
    expect(errors).toEqual([])
  })

  it('flags route paths not starting with /', () => {
    const { ok, errors } = validateConfig({ siteUrl: 'https://x.com', routes: [{ path: 'about' }] })
    expect(ok).toBe(false)
    expect(errors.some(e => e.includes('routes[0].path'))).toBe(true)
  })

  it('flags non-numeric priority and bad changefreq', () => {
    const cfg = { siteUrl: 'https://x.com', routes: [{ path: '/', priority: 'high', changefreq: 'sometimes' }] }
    const { errors } = validateConfig(cfg)
    expect(errors.some(e => e.includes('priority'))).toBe(true)
    expect(errors.some(e => e.includes('changefreq'))).toBe(true)
  })

  it('flags unknown platform', () => {
    const { ok } = validateConfig({ siteUrl: 'https://x.com', routes: [], platform: 'heroku' })
    expect(ok).toBe(false)
  })

  it('flags duplicate route paths (cache-key and dist collision)', () => {
    const { ok, errors } = validateConfig({
      siteUrl: 'https://x.com',
      routes: [{ path: '/' }, { path: '/about' }, { path: '/about' }],
    })
    expect(ok).toBe(false)
    expect(errors.some(e => e.includes('duplicate path "/about"'))).toBe(true)
  })

  it('accepts distinct route paths', () => {
    const { ok, errors } = validateConfig({
      siteUrl: 'https://x.com',
      routes: [{ path: '/' }, { path: '/about' }, { path: '/about/' }],
    })
    expect(ok).toBe(true)
    expect(errors).toHaveLength(0) // trailing-slash variant is a distinct path
  })

  it('formats diagnostics with the prestruct prefix', () => {
    const lines = formatDiagnostics(['siteUrl is required'])
    expect(lines[0]).toBe('[prestruct] config: siteUrl is required')
  })

  it('warns on unknown config keys without failing validation (#52)', () => {
    // A typo'd seam (`ogimg` vs `ogImage`) used to pass a green build while
    // silently dropping the SEO surface it was meant to drive
    const config = { siteUrl: 'https://example.com', ogimg: 'x.png', routes: [{ path: '/' }] }
    const { ok } = validateConfig(config)
    expect(ok).toBe(true)
    const warnings = configKeyWarnings(config)
    expect(warnings).toContain('unknown config key "ogimg" (typo? see the config reference)')
    expect(formatConfigWarnings(warnings)[0]).toBe('[prestruct] config warning: unknown config key "ogimg" (typo? see the config reference)')
  })

  it('known keys never warn (#52)', () => {
    const known = {
      siteUrl: 'https://example.com',
      siteName: 'S', author: 'A', tagline: 'T', ogImage: 'o.png', keywords: 'k',
      appLayoutPath: '/src/AppLayout.jsx',
      routes: [{ path: '/' }], notFound: {}, robots: { aeo: true }, proxy: { url: 'https://p' },
      faqs: [], deployId: true, deployIdFooter: false, buildJsonLd: () => [],
      fetchRoutes: async () => [], platform: 'cloudflare',
    }
    expect(configKeyWarnings(known)).toEqual([])
  })
})

describe('inject-brand helpers (import surface)', () => {
  it('matches the legacy inline helper behavior', () => {
    expect(toReplaceSafe('$120')).toBe('$$120')
    expect(toReplaceSafe(null)).toBe('')
    expect(generateTitle('Test Site', 'Tagline')).toBe('Test Site | Tagline')
  })
})

describe('prerender pure functions (import surface)', () => {
  const siteUrl = 'https://example.com'

  it('injects per-route meta into shell', () => {
    const shell = `<html><head><title>x</title><meta name="description" content="y"><meta property="og:url" content="z"><link rel="canonical" href="z"></head><div id="root"></div></html>`
    const out = injectMeta(shell, { title: 'Home', description: 'Hello world' }, '/', siteUrl, '')
    expect(out).toContain('<title>Home</title>')
    expect(out).toContain('content="Hello world"')
    expect(out).toContain(`content="${siteUrl}"`)
  })

  it('escapes dollar signs in injected content', () => {
    const shell = `<head><title>x</title></head><div id="root"></div>`
    const out = injectMeta(shell, { title: 'Costs $100' }, '/', siteUrl, '')
    expect(out).toContain('<title>Costs $100</title>')
  })

  it('does not let a commented-out og:title fragment start a cross-line match (dotall trap class)', () => {
    // Same class as the Pass-7 title-regex trap: shell prose carries the
    // literal `content="` of a commented-out og:title with no closing quote
    // on its own line. A cross-line `[^"]*` pairs the fragment with the REAL
    // tag's closing quote, lands the replacement inside the comment and
    // shreds both tags. Matched proven live before the single-line fix.
    const shell = [
      '<html><head>',
      '<!-- <meta property="og:title" content=" -->',
      '<meta property="og:title" content="Real Route" />',
      '</head><div id="root"></div></html>',
    ].join('\n')
    const out = injectMeta(shell, { title: 'Trap Check | Site' }, '/x', siteUrl, '')
    // The REAL tag gets the route title
    expect(out).toContain('<meta property="og:title" content="Trap Check | Site" />')
    // The comment survives byte-for-byte; the match never starts on it
    expect(out).toContain('<!-- <meta property="og:title" content=" -->')
    // No shredded debris between the two
    expect(out).not.toContain('"og:title" content="Real Route"')
  })

  it('generates sitemap entries', () => {
    const xml = generateSitemap([{ path: '/', priority: '1.0' }, { path: '/about' }], siteUrl)
    expect(xml).toContain(`<loc>${siteUrl}</loc>`)
    expect(xml).toContain(`<loc>${siteUrl}/about</loc>`)
  })

  it('normalizes a trailing-slash siteUrl at every URL seam (#53)', () => {
    // A consumer pasting the common `siteUrl: 'https://x/'` shape used to get
    // `https://x//` on the most SEO-critical tag on every page
    const slashed = 'https://x.example.com/'
    const shell = `<html><head><title>t</title><meta property="og:url" content="z"><link rel="canonical" href="z"><meta property="og:title" content="z"><meta name="twitter:title" content="z"></head><div id="root"></div></html>`
    const meta = injectMeta(shell, { title: 'T' }, '/about', slashed, '')
    expect(meta).toContain('content="https://x.example.com/about"')
    const xml = generateSitemap([{ path: '/about' }], slashed)
    expect(xml).toContain('<loc>https://x.example.com/about</loc>')
    const p404 = generate404(shell, { siteName: 'S' }, slashed)
    expect(p404).toContain('href="https://x.example.com/"')
  })

  it('404 head tags carry real values, never literal $1/$2 (#33)', () => {
    // Function replacers use their return value LITERALLY: the old
    // `() => \`$1Page Not Found...$2\`` shipped literal $1/$2 garbage into
    // dist/404.html and destroyed the description/og:title/twitter:title/
    // canonical tags. Proven live against 1.1.0 (grep "\$1" dist/404.html).
    const shell = `<html><head><title>s</title><meta name="description" content="d"><meta property="og:title" content="d"><meta name="twitter:title" content="d"><link rel="canonical" href="d"></head><div id="root"></div></html>`
    const html = generate404(shell, { siteName: 'Creadev' }, siteUrl)
    expect(html).not.toMatch(/\$1|\$2/)
    expect(html).toContain('<meta property="og:title" content="Page Not Found | Creadev">')
    expect(html).toContain('<meta name="twitter:title" content="Page Not Found | Creadev">')
    expect(html).toContain('<meta name="description" content="The page you were looking for does not exist.">')
    expect(html).toContain('<link rel="canonical" href="https://example.com/">')
  })

  it('generates a static 404 page and strips the bundle script', () => {
    const shell = `<html><head><title>x</title><meta name="author" content="a"></head><div id="root"></div><script type="module" src="x.js"></script></html>`
    const html = generate404(shell, { siteName: 'Test' }, siteUrl)
    expect(html).toContain('root-404')
    expect(html).toContain('Page Not Found | Test')
    expect(html).toContain('noindex')
    expect(html).not.toContain('<script type="module"')
  })

  it('404 strips modulepreload chunk links (no JS prefetch on a no-JS page)', () => {
    // Page-weight audit 2026-10-20: vite emits `<link rel=modulepreload>` per
    // imported chunk beside the entry script; the script strip alone left the
    // 404 prefetching the 160KB vendor bundle, defeating the zero-JS-load
    // contract on every 404 hit.
    const shell = `<html><head><title>x</title></head><div id="root"></div><script type="module" src="/assets/i.js"></script><link rel="modulepreload" crossorigin href="/assets/vendor.js" /></html>`
    const html = generate404(shell, { siteName: 'Test' }, siteUrl)
    expect(html).not.toContain('modulepreload')
    expect(html).not.toContain('/assets/vendor.js')
    expect(html).not.toContain('<script type="module"')
  })

  it('404 CTA is theme-neutral (no hardcoded fill/color pair)', () => {
    // #19: the filled black button was invisible on dark hosts. The CTA must
    // draw its text AND outline from currentColor so it reads on any theme.
    const shell = `<html><head><title>x</title></head><div id="root"></div></html>`
    const html = generate404(shell, { siteName: 'Test' }, siteUrl)
    expect(html).not.toMatch(/background:\s*#000/i)
    expect(html).not.toMatch(/background:\s*#fff/i)
    expect(html).toContain('color:inherit')
    expect(html).toContain('border:2px solid currentColor')
    expect(html).toContain('text-transform:uppercase') // CTA link exists
  })

  it('html-escapes user-supplied notFound text (no script injection into static HTML)', () => {
    const shell = `<html><head><title>x</title></head><div id="root"></div></html>`
    const html = generate404(shell, {
      siteName: 'Test',
      notFound: { heading: '<script>alert(1)</script>', body: 'Try <img src=x onerror=1>', primaryCta: { label: '"quoted"', href: '/a?x=1&y=2' } },
    }, siteUrl)
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;quoted&quot;')
    expect(html).toContain('/a?x=1&amp;y=2')
  })

  it('keeps $-shaped notFound text literal (no regex-reference expansion)', () => {
    const shell = `<html><head><title>x</title></head><div id="root"></div></html>`
    const html = generate404(shell, { siteName: 'Test', notFound: { heading: '$& (lost page)' } }, siteUrl)
    expect(html).toContain('&amp;')
    expect(html).toContain('$&')
    expect(html).not.toContain('$& (lost page)$&')
  })

  it('robots noindex does not eat a cross-line commented robots fragment (dotall trap class)', () => {
    // Same class as above: the robots-strip regex used `[^"]*` + dotall, so
    // a commented-out robots meta without a closing quote on its line paired
    // with the real tag's closing quote and consumed both lines.
    const shell = [
      '<html><head>',
      '<!-- <meta name="robots" content=" -->',
      '<meta name="robots" content="index, follow" />',
      '<meta name="author" content="a">',
      '</head><div id="root"></div></html>',
    ].join('\n')
    const html = generate404(shell, { siteName: 'Test' }, siteUrl)
    // The real robots meta is still replaced with the noindex directive
    expect(html).toContain('noindex, nofollow')
    // The comment survives byte-for-byte
    expect(html).toContain('<!-- <meta name="robots" content=" -->')
    // The comment opener did not swallow the line after it
    expect(html).not.toContain(' --> <meta name="author"')
  })
})

describe('loadStaticRouter (v6/v7 compat, offline)', () => {
  it('resolves via the v6 ./server.js subpath first', async () => {
    const importer = async (m) => {
      if (m === 'react-router-dom/server.js') return { StaticRouter: 'v6-router' }
      throw new Error('not reached')
    }
    expect(await loadStaticRouter(importer)).toBe('v6-router')
  })

  it('falls back to the package root when ./server.js is gone (react-router-dom v7)', async () => {
    const importer = async (m) => {
      if (m === 'react-router-dom/server.js') throw new Error('ERR_INVALID_PACKAGE_EXPORTS')
      return { StaticRouter: 'v7-router' }
    }
    expect(await loadStaticRouter(importer)).toBe('v7-router')
  })

  it('errors loudly when neither entry provides StaticRouter', async () => {
    await expect(loadStaticRouter(async () => ({}))).rejects.toThrow(/Could not load StaticRouter/)
  })
})

describe('mergeRoutes (fetchRoutes hook merge contract)', () => {
  it('appends CMS routes to the static list', () => {
    const out = mergeRoutes(
      [{ path: '/' }],
      [{ path: '/blog/a', }, { path: '/blog/b' }],
    )
    expect(out.map(r => r.path)).toEqual(['/', '/blog/a', '/blog/b'])
  })

  it('static routes take precedence on path collisions (documented dedupe)', () => {
    const out = mergeRoutes(
      [{ path: '/about', meta: { title: 'Static' } }],
      [{ path: '/about', meta: { title: 'CMS' } }],
    )
    expect(out).toHaveLength(1)
    expect(out[0].meta.title).toBe('Static')
  })

  it('tolerates null-ish fetched input (hook returning nothing)', () => {
    const out = mergeRoutes([{ path: '/' }], null)
    expect(out.map(r => r.path)).toEqual(['/'])
  })
})

describe('cleanCache', () => {
  it('removes the cache file so the next build renders fresh', async () => {
    const { writeFileSync, existsSync, readFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { cleanCache } = await import('../engine/scripts/prerender.js')
    const dir = mkdtempSync(join(tmpdir(), 'clean-cache-'))
    const cacheFile = join(dir, 'cache.json')
    writeFileSync(cacheFile, JSON.stringify({ '/x': { html: 'a' } }))
    cleanCache({ cacheFile })
    // Contract: reset-to-empty, not deletion -- a custom cacheFile never
    // dangles, and the next build treats the empty map as fresh.
    expect(existsSync(cacheFile)).toBe(true)
    expect(JSON.parse(readFileSync(cacheFile, 'utf8'))).toEqual({})
    // idempotent reset
    cleanCache({ cacheFile })
    expect(JSON.parse(readFileSync(cacheFile, 'utf8'))).toEqual({})
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('engine cache-module surface (gap audit 2026-10-21)', () => {
  // These four exports had heavy indirect coverage through the prerender
  // pipeline but no direct contract: enginePaths shape, readCache miss
  // behavior, and the read/write roundtrip. cleanCache was already pinned.

  it('enginePaths derives dist and cache paths from root', () => {
    const p = enginePaths('/tmp/whatever-root')
    expect(p).toEqual({
      root: '/tmp/whatever-root',
      dist: '/tmp/whatever-root/dist',
      cacheDir: '/tmp/whatever-root/.prestruct/cache',
      cacheFile: '/tmp/whatever-root/.prestruct/cache/routes.json',
    })
  })

  it('readCache returns {} for a missing cache file (no throw)', () => {
    expect(readCache({ cacheFile: '/nonexistent-definitely/routes.json' })).toEqual({})
  })

  it('readCache returns {} for a corrupt cache file instead of crashing', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const dir = mkdtempSync(join(tmpdir(), 'cache-corrupt-'))
    const file = join(dir, 'routes.json')
    writeFileSync(file, '{not json')
    expect(readCache({ cacheFile: file })).toEqual({})
    rmSync(dir, { recursive: true, force: true })
  })

  it('writeCache -> readCache roundtrip persists entries', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const dir = mkdtempSync(join(tmpdir(), 'cache-roundtrip-'))
    const p = enginePaths(dir)
    writeCache({ '/a': { sig: 'x', html: 'y' } }, { cacheDir: p.cacheDir, cacheFile: p.cacheFile })
    expect(readCache({ cacheFile: p.cacheFile })).toEqual({ '/a': { sig: 'x', html: 'y' } })
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('defineConfig + config extras (gap audit 2026-10-21)', () => {
  it('defineConfig is an identity pass-through (typed-config DX)', () => {
    const cfg = { siteUrl: 'https://x.com', routes: [{ path: '/' }] }
    expect(defineConfig(cfg)).toBe(cfg)
  })
})
