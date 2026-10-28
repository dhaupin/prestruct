/**
 * tests/issue-walk.test.js
 * Battery for the 2026-10 issue-walk surfaces (prestruct#29/30/35/36/41/42/43/49):
 * IndexNow key + submission contract, the postBuild hook seam, the grouped
 * head additions (per-route JSON-LD, feed discovery, hreflang, verification,
 * SearchAction), config-driven JSON-LD defaults, the RRD-7 named-import
 * interop rewrite, the llms.txt generator, and the OG-image generation
 * block's validation + loud-skip posture.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  injectMeta,
  mergeRoutes,
  generateLlms,
  rewriteRrdNamedImports,
  cacheSignature,
  cacheEntryValid,
} from '../engine/scripts/prerender.js'

import { buildDefaultJsonLd } from '../engine/scripts/inject-brand.js'

import {
  isValidIndexNowKey,
  resolveIndexNowKey,
  emitIndexNowKeyFile,
  readSitemapUrls,
  submitIndexNow,
} from '../engine/scripts/indexnow.js'

import { runPostBuildHooks } from '../engine/scripts/hooks.js'

import {
  resolveOgImageGeneration,
  renderRouteOgImage,
} from '../engine/scripts/ogimage.js'

const tmpdir = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'))
const SITE = 'https://example.com'

// -- IndexNow (#36) ------------------------------------------------------------

describe('indexnow', () => {
  it('accepts only the documented key shape', () => {
    expect(isValidIndexNowKey('a'.repeat(32))).toBe(true)
    expect(isValidIndexNowKey('A'.repeat(32))).toBe(false) // uppercase hex out
    expect(isValidIndexNowKey('a'.repeat(31))).toBe(false)
    expect(isValidIndexNowKey(null)).toBe(false)
  })

  it('resolves the config key first, then the persisted file, else generates once', () => {
    const dir = tmpdir('in-key')
    expect(resolveIndexNowKey({ indexNow: false }, dir)).toBe(null)
    expect(resolveIndexNowKey({}, dir)).toBe(null)

    const persisted = path.join(dir, 'indexnow-key.txt')
    fs.writeFileSync(persisted, 'b'.repeat(32) + '\n', 'utf8')
    const fromFile = resolveIndexNowKey({ indexNow: true }, dir)
    expect(fromFile).toEqual({ key: 'b'.repeat(32), source: 'persisted (indexnow-key.txt)' })

    const cfg = resolveIndexNowKey({ indexNow: { key: 'c'.repeat(32) } }, dir)
    expect(cfg).toEqual({ key: 'c'.repeat(32), source: 'config' })

    const fromGenerated = resolveIndexNowKey({ indexNow: true }, tmpdir('in-key2'))
    expect(isValidIndexNowKey(fromGenerated.key)).toBe(true)
    expect(fromGenerated.source).toBe('generated')
  })

  it('refuses a malformed config key instead of shipping a broken keyLocation', () => {
    expect(resolveIndexNowKey({ indexNow: 'not-hex' }, tmpdir('in-bad'))).toBe(null)
  })

  it('emits <key>.txt into the output dir', () => {
    const out = tmpdir('in-emit')
    const file = emitIndexNowKeyFile('d'.repeat(32), out)
    expect(fs.readFileSync(file, 'utf8').trim()).toBe('d'.repeat(32))
    expect(path.basename(file)).toBe('d'.repeat(32) + '.txt')
  })

  it('readSitemapUrls walks the baked sitemap, null on absence/emptiness', () => {
    const out = tmpdir('in-sm')
    expect(readSitemapUrls(out)).toBe(null)
    fs.writeFileSync(path.join(out, 'sitemap.xml'), '<urlset><url><loc>SITE/</loc><url></urlset>'.replace(/SITE/g, SITE), 'utf8')
    expect(readSitemapUrls(out)).toEqual([SITE + '/'])
  })

  it('--dry-run submits nothing but prints the payload; not-configured fails clean', async () => {
    const out = tmpdir('in-dry')
    fs.writeFileSync(path.join(out, 'sitemap.xml'),
      `<urlset><url><loc>${SITE}/</loc></url></urlset>`, 'utf8')
    const dry = await submitIndexNow({ config: { indexNow: { key: 'e'.repeat(32) }, siteUrl: SITE }, configDir: out, outputDir: out, dryRun: true })
    expect(dry).toEqual({ ok: true, status: 'dry-run', reason: 'dry-run' })
    const off = await submitIndexNow({ config: {}, configDir: out, outputDir: out, dryRun: true })
    expect(off).toEqual({ ok: false, status: null, reason: 'not-configured' })
  })
})

// -- postBuild hooks (#41) ------------------------------------------------------

describe('hooks.postBuild', () => {
  it('is inert without a config seam', () => {
    expect(runPostBuildHooks({})).toEqual([])
    expect(runPostBuildHooks({ hooks: { postBuild: [] } })).toEqual([])
  })

  it('refuses to execute without runHooks: true (loud, nothing runs)', () => {
    const dir = tmpdir('hooks-gate')
    const sentinel = path.join(dir, 'sentinel.txt')
    const failures = runPostBuildHooks({
      hooks: { postBuild: [`node -e "require('fs').writeFileSync(process.argv[1], 'x')" ${JSON.stringify(sentinel)}`] },
    })
    expect(failures).toEqual([])
    expect(fs.existsSync(sentinel)).toBe(false) // gate held
  })

  it('runs the chain when runHooks: true, substituting placeholders and env facts', () => {
    const dir = tmpdir('hooks-run')
    const outResult = path.join(dir, 'out.txt')
    // The command learns the output dir from the PRESTRUCT_OUTPUT_DIR env var.
    const failures = runPostBuildHooks({
      runHooks: true,
      hooks: { postBuild: ['node -e "require(\'fs\').writeFileSync(process.argv[1], process.env.PRESTRUCT_SITE_URL)" ${OUTPUT_DIR}/out.txt'] },
    }, { siteUrl: SITE, outputDir: dir })
    expect(failures).toEqual([])
    expect(fs.readFileSync(outResult, 'utf8')).toBe(SITE)
  })

  it('collects nonzero hook exits as failures instead of riding through green', () => {
    const failures = runPostBuildHooks({
      runHooks: true,
      hooks: { postBuild: ['node -e "process.exit(3)"'] },
    }, { siteUrl: SITE, outputDir: os.tmpdir() })
    expect(failures.length).toBe(1)
    expect(failures[0].command).toContain('process.exit(3)')
  })

  it('kills a hung hook via the 30s timeout instead of stalling the build', async () => {
    const start = Date.now()
    const failures = runPostBuildHooks({
      runHooks: true,
      hooks: { postBuild: ['node -e "setTimeout(() => {}, 60000)"'] },
    }, { siteUrl: SITE, outputDir: os.tmpdir() })
    // execSync blocks, but the timeout guarantees it CANNOT block longer than
    // ~31s. This assertion guards the guardrail from drifting open again.
    expect(Date.now() - start).toBeLessThan(40000)
    expect(failures.length).toBe(1)
    expect(failures[0].signal).toBe('SIGTERM') // killed by timeout, not a clean exit
  }, 45000)
})

// -- grouped head additions (#35 + #49) -----------------------------------------

describe('injectMeta grouped head additions', () => {
  const SHELL = '<html><head><title>s</title></head><div id="root"></div></html>'

  it('injects per-route JSON-LD as its own block (single node)', () => {
    const out = injectMeta(SHELL, { jsonLd: { '@type': 'FAQPage', name: 'F' } }, '/faq', SITE, '', null)
    expect(out).toContain('<!-- JSON-LD (route) -->')
    expect(out).toContain('"@type": "FAQPage"')
  })

  it('wraps multiple route nodes in a @graph', () => {
    const out = injectMeta(SHELL,
      { jsonLd: [{ '@type': 'FAQPage' }, { '@type': 'Service' }] }, '/faq', SITE, '', null)
    expect(out).toContain('"@graph"')
    expect(out).toContain('"@type": "FAQPage"')
    expect(out).toContain('"@type": "Service"')
  })

  it('is rebuild-idempotent: a second pass replaces the route block, never stacks', () => {
    const once = injectMeta(SHELL, { jsonLd: { '@type': 'FAQPage', name: 'One' } }, '/faq', SITE, '', null)
    const twice = injectMeta(once, { jsonLd: { '@type': 'FAQPage', name: 'Two' } }, '/faq', SITE, '', null)
    expect((twice.match(/JSON-LD \(route\)/g) || []).length).toBe(1)
    expect(twice).toContain('Two')
    expect(twice).not.toContain('One')
  })

  it('emits feed autodiscovery, hreflang alternates (route override wins), and verification metas', () => {
    const out = injectMeta(SHELL,
      {
        alternates: [{ hreflang: 'de', href: SITE + '/de' }],
      },
      '/about', SITE, '',
      {
        feed: { url: SITE + '/feed.xml', title: 'Site feed' },
        alternates: [{ hreflang: 'en', href: SITE }, { hreflang: 'x-default', href: SITE }],
        verification: { 'google-site-verification': 'tok-123' },
      })
    expect(out).toContain('<link rel="alternate" type="application/rss+xml" title="Site feed" href="' + SITE + '/feed.xml" />')
    expect(out).toContain('hreflang="de"')   // route override wins: full takeover
    expect(out).not.toContain('hreflang="en"')
    expect(out).not.toContain('hreflang="x-default"')
    expect(out).toContain('<meta name="google-site-verification" content="tok-123" />')
  })

  it('SearchAction rides the home route only, wrapped in WebSite', () => {
    const home = injectMeta(SHELL, {}, '/', SITE, '', { searchUrl: SITE + '/search?q={query}' })
    const about = injectMeta(SHELL, {}, '/about', SITE, '', { searchUrl: SITE + '/search?q={query}' })
    expect(home).toContain('"SearchAction"')
    expect(home).toContain('"WebSite"')
    expect(about).not.toContain('"SearchAction"')
  })

  it('junk values render nothing: malformed verification keys and non-object jsonLd drop silently', () => {
    const out = injectMeta(SHELL, { jsonLd: 'not-a-node' }, '/about', SITE, '', {
      verification: { 'bad key<n': 'x', good: '' },
    })
    expect(out).not.toContain('JSON-LD (route)')
    expect(out).not.toContain('bad key')
    expect(out).not.toContain('content="x"')
  })

  // -- Tail escaping (audit B2): the tail rides a FUNCTION replacer, which
  //    does not process `$`-syntax. Values must be escapeHtml'd only; a
  //    doubled `$$` from escapeReplacement shipped literally before the fix.
  it('tail values keep a literal $ (no $$ doubling from the replacement pipeline)', () => {
    const out = injectMeta(SHELL, {}, '/about', SITE, '', {
      feed: { url: SITE + '/feed$1.xml', title: 'Feed $& cost $120' },
      verification: { 'google-site-verification': 'tok$1$&' },
    })
    expect(out).toContain('href="' + SITE + '/feed$1.xml"')
    expect(out).toContain('title="Feed $&amp; cost $120"')
    expect(out).toContain('content="tok$1$&amp;"')
    expect(out).not.toContain('$$')
  })

  it('tail values still escape markup (the escapeHtml class survives)', () => {
    const out = injectMeta(SHELL, {}, '/about', SITE, '', {
      feed: { url: SITE + '/f.xml?a=1&b=2', title: '<b>&</b>' },
      alternates: [{ hreflang: 'de', href: SITE + '/de?a=1&b=2' }],
    })
    expect(out).toContain('href="' + SITE + '/f.xml?a=1&amp;b=2"')
    expect(out).toContain('title="&lt;b&gt;&amp;&lt;/b&gt;"')
    expect(out).toContain('href="' + SITE + '/de?a=1&amp;b=2"')
  })

  // -- Per-route og:image object companions (audit B4) -------------------------
  const OG_SHELL = '<html><head><title>s</title>'
    + '<meta property="og:image" content="https://cdn.test/global.png" />'
    + '<meta name="twitter:image" content="https://cdn.test/global.png" />'
    + '<meta property="og:image:width" content="1200" />'
    + '<meta property="og:image:height" content="630" />'
    + '<meta property="og:image:alt" content="global alt" />'
    + '</head><div id="root"></div></html>'

  it('a route object og:image replaces the global companions with its own', () => {
    const out = injectMeta(OG_SHELL, { ogImage: { url: 'https://cdn.test/route.png', width: 800, height: 400, alt: 'route alt' } },
      '/about', SITE, '', null)
    expect(out).toContain('content="https://cdn.test/route.png"')
    expect(out).toContain('property="og:image:width" content="800"')
    expect(out).toContain('property="og:image:height" content="400"')
    expect(out).toContain('property="og:image:alt" content="route alt"')
    expect(out).not.toContain('content="1200"') // global width gone
    expect(out).not.toContain('content="630"')
    expect(out).not.toContain('global alt')
  })

  it('a route object og:image with no companions strips the stale globals', () => {
    const out = injectMeta(OG_SHELL, { ogImage: { url: 'https://cdn.test/route.png' } },
      '/about', SITE, '', null)
    expect(out).toContain('content="https://cdn.test/route.png"')
    expect(out).not.toContain('og:image:width')
    expect(out).not.toContain('og:image:height')
    expect(out).not.toContain('og:image:alt')
  })

  it('a string og:image override leaves the global companions in place', () => {
    const out = injectMeta(OG_SHELL, { ogImage: 'https://cdn.test/route.png' }, '/about', SITE, '', null)
    expect(out).toContain('content="https://cdn.test/route.png"')
    expect(out).toContain('property="og:image:width" content="1200"')
    expect(out).toContain('property="og:image:alt" content="global alt"')
  })
})

// -- JSON-LD defaults (#30) ------------------------------------------------------

describe('inject-brand JSON-LD defaults', () => {
  it('builds Organization + WebSite from config identity keys', () => {
    const ld = buildDefaultJsonLd({ siteUrl: SITE + '/', siteName: 'Creadev', author: 'dhaupin' })
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@graph'][0]).toEqual({ '@type': 'Organization', name: 'Creadev', url: SITE })
    expect(ld['@graph'][1]).toEqual({ '@type': 'WebSite', name: 'Creadev', url: SITE })
  })

  it('falls back to the author as the org name and returns null with nothing derivable', () => {
    expect(buildDefaultJsonLd({ author: 'dhaupin' })['@graph'][0].name).toBe('dhaupin')
    expect(buildDefaultJsonLd({})).toBe(null)
  })

  it('injectBrand ships the defaults only when buildJsonLd is absent and not opted out', async () => {
    const dir = tmpdir('inj-def')
    const shell = '<html><head><title>x</title></head><body><div id="root"></div></body></html>'
    fs.writeFileSync(path.join(dir, 'index.html'), shell, 'utf8')
    const { injectBrand } = await import('../engine/scripts/inject-brand.js')
    injectBrand(
      { siteUrl: SITE, siteName: 'S', buildJsonLd: () => [] },
      dir,
    )
    expect(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')).not.toContain('ld+json')

    injectBrand({ siteUrl: SITE, siteName: 'S' }, dir)
    const injected = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
    expect(injected).toContain('"@type": "Organization"')

    injectBrand({ siteUrl: SITE, siteName: 'S', jsonLdDefaults: false }, dir)
    expect(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')).not.toContain('ld+json')
  })
})

// -- RRD-7 named-import interop (#29) --------------------------------------------

describe('rewriteRrdNamedImports', () => {
  it('rewrites a named import into the dual-major namespace interop', () => {
    const out = rewriteRrdNamedImports("import { Routes, Route, useLocation } from 'react-router-dom'\n")
    expect(out).toContain("import * as rrdInteropNs_1 from 'react-router-dom'")
    expect(out).toContain('const { Routes, Route, useLocation } = rrdInteropNs_1.default ?? rrdInteropNs_1')
    expect(out).not.toMatch(/import\s+\{[^}]+\}\s+from\s+['"]react-router-dom['"]/)
  })

  it('numbers the namespace per statement (no duplicate consts across statements)', () => {
    const out = rewriteRrdNamedImports([
      "import { Routes } from 'react-router-dom'",
      "import { Link } from 'react-router-dom'",
    ].join('\n'))
    expect(out).toContain('rrdInteropNs_1')
    expect(out).toContain('rrdInteropNs_2')
  })

  it('leaves namespace imports and subpath imports untouched', () => {
    const src = "import * as rrd from 'react-router-dom'\nimport { StaticRouter } from 'react-router-dom/server.js'\nimport { useState } from 'react'\n"
    expect(rewriteRrdNamedImports(src)).toBe(src)
  })

  it('rewrites the default+named form too (audit E1: the old regex skipped it)', () => {
    const out = rewriteRrdNamedImports("import rrd, { useLocation } from 'react-router-dom'\n")
    expect(out).toContain("import * as rrdInteropNs_1 from 'react-router-dom'")
    expect(out).toContain('const rrd = rrdInteropNs_1.default ?? rrdInteropNs_1;')
    expect(out).toContain('const { useLocation } = rrdInteropNs_1.default ?? rrdInteropNs_1')
    expect(out).not.toMatch(/import\s+rrd\s*,/)
  })
})

// -- llms.txt (#49) ---------------------------------------------------------------

describe('generateLlms', () => {
  const ROUTES = [
    { path: '/', meta: { title: 'Home', description: 'Landing' } },
    { path: '/about', meta: { title: 'About | Site' } },
  ]

  it('writes the llmstxt.org shape with absolute URLs', () => {
    const dir = tmpdir('llms')
    generateLlms(ROUTES, { siteUrl: SITE, siteName: 'Site', tagline: 'bake SEO' }, dir)
    const text = fs.readFileSync(path.join(dir, 'llms.txt'), 'utf8')
    expect(text).toContain('# Site')
    expect(text).toContain('> bake SEO')
    expect(text).toContain('- [Home](' + SITE + '/): Landing')
    expect(text).toContain('- [About | Site](' + SITE + '/about)')
  })

  it('is generated-only: an existing llms.txt is never touched', () => {
    const dir = tmpdir('llms2')
    fs.writeFileSync(path.join(dir, 'llms.txt'), 'hand-rolled\n', 'utf8')
    expect(generateLlms(ROUTES, { siteUrl: SITE }, dir)).toBe(null)
    expect(fs.readFileSync(path.join(dir, 'llms.txt'), 'utf8')).toBe('hand-rolled\n')
  })

  it('is opted out by llms: false', () => {
    const dir = tmpdir('llms3')
    expect(generateLlms(ROUTES, { siteUrl: SITE, llms: false }, dir)).toBe(null)
    expect(fs.existsSync(path.join(dir, 'llms.txt'))).toBe(false)
  })
})

// -- QC sweep: cache correctness over the config-gated extras ---------------------

describe('cacheSignature covers the head extras (QC sweep)', () => {
  const route = { path: '/a', meta: { title: 'T' } }

  it('flipping verification/feed/searchUrl/hreflang on between builds invalidates the cache', () => {
    const baseSig = cacheSignature(route, SITE, '<html></html>', { feed: null, alternates: null, verification: null, searchUrl: null })
    const onSig = cacheSignature(route, SITE, '<html></html>', { feed: null, alternates: null, verification: { 'google-site-verification': 'x' }, searchUrl: null })
    expect(onSig).not.toBe(baseSig)
    // A stale cache entry (pre-extras sig) must miss and re-render.
    expect(cacheEntryValid({ sig: baseSig, html: '<html></html>' }, route, SITE, '<html></html>', onExtrasOn)).toBe(false)
  })

  it('stays stable when the extras input is unchanged (no spurious re-renders)', () => {
    const e1 = cacheSignature(route, SITE, '<html></html>', { feed: null, alternates: null, verification: null, searchUrl: null })
    const e2 = cacheSignature(route, SITE, '<html></html>', { feed: null, alternates: null, verification: null, searchUrl: null })
    expect(e1).toBe(e2)
    // And an entry signed with the same shape validates.
    expect(cacheEntryValid({ sig: e1, html: 'x' }, route, SITE, '<html></html>', { feed: null, alternates: null, verification: null, searchUrl: null })).toBe(true)
  })
})

const onExtrasOn = { feed: null, alternates: null, verification: { 'google-site-verification': 'x' }, searchUrl: null }

// -- OG image generation (#43) -----------------------------------------------------

describe('ogImageGeneration', () => {
  it('is inert unconfigured and loud-invalid otherwise', () => {
    const dir = tmpdir('og')
    expect(resolveOgImageGeneration({}, dir)).toBe(null)
    expect(resolveOgImageGeneration({ ogImageGeneration: { template: 'nope.svg' } }, dir)).toBe(null)
    expect(resolveOgImageGeneration({ ogImageGeneration: 'svg' }, dir)).toBe(null)
  })

  it('resolves a valid block: template read, dimensions normalized', () => {
    const dir = tmpdir('og2')
    fs.writeFileSync(path.join(dir, 'og.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8')
    const gen = resolveOgImageGeneration({ ogImageGeneration: { template: 'og.svg' } }, dir)
    expect(gen.template).toContain('<svg')
    expect(gen.width).toBe(1200)
    expect(gen.height).toBe(630)
  })

  it('skips loudly (null, not a crash) when no optional rasterizer is installed', () => {
    const dir = tmpdir('og3')
    fs.writeFileSync(path.join(dir, 'og.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8')
    const gen = resolveOgImageGeneration({ ogImageGeneration: { template: 'og.svg' } }, dir)
    expect(renderRouteOgImage(gen, { path: '/a', meta: { title: 'T' } }, SITE, dir)).toBe(null)
    expect(fs.existsSync(path.join(dir, 'og'))).toBe(false)
  })
})
