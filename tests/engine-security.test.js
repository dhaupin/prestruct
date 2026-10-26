import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, it, expect, afterEach } from 'vitest'

import { validateConfig } from '../engine/scripts/validate-config.js'
import { injectMeta, generateSitemap, generate404 } from '../engine/scripts/prerender.js'
import { injectBrand } from '../engine/scripts/inject-brand.js'

/**
 * Engine security battery: injection/traversal regression tests.
 *
 * These pin the four 2026-10 hardening fixes:
 *   1. route paths cannot traverse out of dist/ (validator + prerender guard)
 *   2. sitemap changefreq/priority are XML-escaped
 *   3. route meta values are HTML-escaped in baked per-route tags
 *   4. JSON-LD payloads cannot break out of <script type="application/ld+json">
 */

describe('route path traversal validation', () => {
  it('rejects ".." segments in route paths', () => {
    const { ok, errors } = validateConfig({
      siteUrl: 'https://example.com',
      routes: [{ path: '/../../etc/evil', meta: { title: 'x' } }],
    })
    expect(ok).toBe(false)
    expect(errors.join('\n')).toMatch(/"\.\." or backslash/)
  })

  it('rejects backslashes in route paths', () => {
    const { ok } = validateConfig({
      siteUrl: 'https://example.com',
      routes: [{ path: '/a\\b', meta: { title: 'x' } }],
    })
    expect(ok).toBe(false)
  })

  it('accepts normal nested routes', () => {
    const { ok } = validateConfig({
      siteUrl: 'https://example.com',
      routes: [{ path: '/blog/my-post/', meta: { title: 'x' } }],
    })
    expect(ok).toBe(true)
  })
})

describe('sitemap XML escaping', () => {
  it('escapes changefreq and priority values', () => {
    const xml = generateSitemap(
      [{ path: '/a', changefreq: '<bogus>&', priority: '"><script>' }],
      'https://example.com'
    )
    expect(xml).toContain('<changefreq>&lt;bogus&gt;&amp;</changefreq>')
    expect(xml).toContain('<priority>&quot;&gt;&lt;script&gt;</priority>')
    expect(xml).not.toContain('<bogus>')
    expect(xml).not.toContain('<script>')
  })

  it('escapes route paths in <loc>', () => {
    const xml = generateSitemap([{ path: '/a&<b' }], 'https://example.com')
    expect(xml).toContain('/a&amp;&lt;b')
  })
})

// Minimal shell fixture: the tags injectMeta/injectBrand rewrite on
// (single-line-per-tag shapes, exactly the shapes the regexes target).
const SHELL = [
  '<!doctype html>',
  '<html><head>',
  '<title>Shell</title>',
  '<meta name="description" content="" />',
  '<meta name="author" content="" />',
  '<meta property="og:title" content="" />',
  '<meta name="twitter:title" content="" />',
  '<meta property="og:image" content="" />',
  '<meta name="twitter:image" content="" />',
  '<link rel="canonical" href="" />',
  '</head><body><div id="root"></div></body></html>',
].join('\n')

describe('injectMeta HTML escaping (route meta)', () => {
  it('escapes quotes and tags in description content attributes', () => {
    const html = injectMeta(SHELL, {
      title: 'A</title><script>alert(1)</script>',
      description: 'He said "hi" & left <quickly>',
      ogImage: '/x"><script>',
    }, '/about', 'https://example.com', '')

    const head = html.slice(0, html.indexOf('</head>'))
    // No raw <script> reached the output -- title is escaped, not injected
    expect(head).not.toContain('<script>alert')
    expect(head).toContain('&lt;/title&gt;&lt;script&gt;')
    // Attribute stays intact: no unescaped quote breaks content="..."
    expect(head).toContain('content="He said &quot;hi&quot; &amp; left &lt;quickly&gt;"')
    expect(head).toContain('/x&quot;&gt;')
  })

  it('keeps well-formed meta strings byte-identical in meaning (& entities)', () => {
    const html = injectMeta(SHELL, { title: 'Home & About' }, '/home', 'https://example.com', '')
    expect(html).toContain('<title>Home &amp; About</title>')
  })
})

describe('404 CTA href scheme guard (walk 2026-10)', () => {
  // escapeXml handles the markup-breaking class (a `"` in the attribute)
  // but nothing can turn a javascript:/data: URL into a safe destination --
  // it would ship as a WORKING script href on the one page whose contract
  // is zero JS. Only real anchors pass: relative, absolute http(s),
  // mailto:, tel:, and a plain hash. Everything else falls back to '/'.
  const SHELL = '<!DOCTYPE html>\n<html>\n<head>\n  <title>Site</title>\n  <meta name="description" content="" />\n</head>\n<body><div id="root"></div></body>\n</html>'

  const hrefIn = (cfg) => {
    const html = generate404(SHELL, { siteName: 'S', notFound: { primaryCta: { label: 'X', href: cfg } } }, 'https://e2e.test')
    const m = html.match(/<a href="([^"]*)"/)
    return m ? m[1] : null
  }

  it('ships a working javascript: href NEVER (falls back to \'/\')', () => {
    expect(hrefIn('javascript:alert(1)')).toBe('/')
    expect(hrefIn('JaVaScRiPt:alert(1)')).toBe('/') // case-insensitive scheme
  })

  it('ships a data: href never', () => {
    expect(hrefIn('data:text/html,<script>alert(1)</script>')).toBe('/')
  })

  it('keeps the anchors that are real destinations', () => {
    expect(hrefIn('/support')).toBe('/support')
    expect(hrefIn('https://support.e2e.test/')).toBe('https://support.e2e.test/')
    expect(hrefIn('mailto:CareOfNeed@example.com')).toBe('mailto:CareOfNeed@example.com')
    expect(hrefIn('tel:+15551234567')).toBe('tel:+15551234567')
    expect(hrefIn('#top')).toBe('#top')
  })

  it('escapes quote injection into the attribute (escape-grade, not scheme-grade)', () => {
    // A " inside a relative URL cannot break out of the href attribute --
    // escapeXml turns it into &quot;. The anchor stays a real destination.
    expect(hrefIn('/x?a=1"onmouseover=alert(1)')).toBe('/x?a=1&quot;onmouseover=alert(1)')
  })
})

describe('inject-brand hardening', () => {
  let dir
  afterEach(() => { if (dir) { rmSync(dir, { recursive: true, force: true }); dir = null } })

  function tmpSite(config, shell) {
    dir = mkdtempSync(join(tmpdir(), 'prestruct-sec-'))
    writeFileSync(join(dir, 'index.html'), shell, 'utf8')
    return injectBrand(config, dir, { getDeployId: () => 'test-id' })
  }

  it('JSON-LD payload cannot break out of the ld+json script tag', () => {
    const evil = '</script><script>alert("xss")</script>'
    tmpSite(
      {
        siteUrl: 'https://example.com',
        buildJsonLd: () => [{ '@type': 'Organization', name: evil }],
      },
      SHELL
    )
    const html = readFileSync(join(dir, 'index.html'), 'utf8')
    // The only <script> opening in the shell is the ld+json one itself;
    // a breakout would add a second one.
    expect((html.match(/<script/g) || []).length).toBe(1)
    expect(html).toContain('\\u003c/script>\\u003cscript>')
    expect(html).not.toContain('</script><script>')
  })

  it('escapes config meta into safe attribute values', () => {
    tmpSite(
      {
        siteUrl: 'https://example.com',
        siteName: 'Evil "Name"',
        author: 'A & B',
        routes: [{ path: '/', meta: { description: 'd "quoted" <tag>' } }],
      },
      SHELL
    )
    const html = readFileSync(join(dir, 'index.html'), 'utf8')
    expect(html).toContain('content="Evil &quot;Name&quot;"')
    expect(html).toContain('content="A &amp; B"')
    expect(html).toContain('content="d &quot;quoted&quot; &lt;tag&gt;"')
  })
})
