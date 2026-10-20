import { describe, it, expect } from 'vitest'
import { replaceRootDiv, injectMeta, generateSitemap, generate404 } from '../engine/scripts/prerender.js'
import { validateConfig, formatDiagnostics } from '../engine/scripts/validate-config.js'
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

  it('generates sitemap entries', () => {
    const xml = generateSitemap([{ path: '/', priority: '1.0' }, { path: '/about' }], siteUrl)
    expect(xml).toContain(`<loc>${siteUrl}</loc>`)
    expect(xml).toContain(`<loc>${siteUrl}/about</loc>`)
  })

  it('generates a static 404 page and strips the bundle script', () => {
    const shell = `<html><head><title>x</title><meta name="author" content="a"></head><div id="root"></div><script type="module" src="x.js"></script></html>`
    const html = generate404(shell, { siteName: 'Test' }, siteUrl)
    expect(html).toContain('root-404')
    expect(html).toContain('Page Not Found | Test')
    expect(html).toContain('noindex')
    expect(html).not.toContain('<script type="module"')
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
})
