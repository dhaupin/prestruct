/**
 * inject-brand.js
 * ===============
 * Post-build script. Runs after `vite build` via `npm run build`.
 * Reads brand.js and injects all head meta into dist/index.html:
 *   - <title>
 *   - <meta name="description">
 *   - <meta name="author">
 *   - <meta name="keywords">
 *   - <link rel="canonical">
 *   - Open Graph tags
 *   - Twitter card tags
 *   - JSON-LD structured data (schema.org)
 *
 * Everything in <head> that references brand identity comes from brand.js.
 * Nothing is hardcoded in index.html — it is the template, not the source.
 *
 * Fails gracefully — exits 0 on any error so the deploy is never blocked.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

const distDir  = resolve('dist')
const htmlPath = join(distDir, 'index.html')

if (!existsSync(htmlPath)) {
  console.warn('[inject-brand] dist/index.html not found — skipping injection')
  process.exit(0)
}

let brand
try {
  brand = await import('../src/brand.js')
} catch (err) {
  console.warn('[inject-brand] Could not load brand.js — skipping injection:', err.message)
  process.exit(0)
}

const {
  FESTIVAL_NAME, ORG_NAME, AUTHOR, TAGLINE, KEYWORDS,
  SITE_URL, OG_IMAGE, VENUE, EVENT, buildJsonLd,
} = brand

const title       = `${FESTIVAL_NAME}: ${TAGLINE}`
const description = `Three days of flow arts, fire, music, healing, and camping on the edge of the Allegheny forest. ${EVENT.dateDisplay} at ${VENUE.name}, ${VENUE.cityState}.`
const canonical   = `${SITE_URL}/`

let html = readFileSync(htmlPath, 'utf8')

// ── Primary meta ──────────────────────────────────────────────────────────────

html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)

html = html.replace(
  /<meta name="description"[^>]*>/,
  `<meta name="description" content="${description}" />`
)

html = html.replace(
  /<meta name="author"[^>]*>/,
  `<meta name="author" content="${AUTHOR}" />`
)

html = html.replace(
  /<meta name="keywords"[^>]*>/,
  `<meta name="keywords" content="${KEYWORDS}" />`
)

html = html.replace(
  /<link rel="canonical"[^>]*>/,
  `<link rel="canonical" href="${canonical}" />`
)

// Add sitemap link if not already present
if (!html.includes('rel="sitemap"')) {
  html = html.replace(
    '<link rel="canonical"',
    `<link rel="sitemap" type="application/xml" href="${SITE_URL}/sitemap.xml" />
    <link rel="canonical"`
  )
}

// ── Remove any previously injected OG / JSON-LD blocks (safe on rebuild) ─────

html = html.replace(/\n\s*<!-- Open Graph -->[\s\S]*?<\/script>\s*/g, '\n  ')

// ── Open Graph ────────────────────────────────────────────────────────────────

const ogTags = `
    <!-- Open Graph -->
    <meta property="og:type"         content="website" />
    <meta property="og:url"          content="${canonical}" />
    <meta property="og:title"        content="${title}" />
    <meta property="og:description"  content="${description}" />
    <meta property="og:image"        content="${OG_IMAGE}" />
    <meta property="og:image:width"  content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt"    content="${FESTIVAL_NAME}: fire arts and flow at ${VENUE.name}" />
    <meta property="og:locale"       content="en_US" />
    <meta property="og:site_name"    content="${FESTIVAL_NAME}" />

    <!-- Twitter / X Card -->
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:title"       content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image"       content="${OG_IMAGE}" />
    <meta name="twitter:image:alt"   content="${FESTIVAL_NAME}: fire arts and flow at ${VENUE.name}" />`

// ── JSON-LD ───────────────────────────────────────────────────────────────────

const jsonLd = `
    <!-- JSON-LD Structured Data — generated from src/brand.js -->
    <script type="application/ld+json">
    ${buildJsonLd()}
    </script>`

html = html.replace('</head>', `${ogTags}\n${jsonLd}\n  </head>`)

writeFileSync(htmlPath, html, 'utf8')

console.log('[inject-brand] ✓ injection complete')
console.log(`  Title:       ${title}`)
console.log(`  Author:      ${AUTHOR}`)
console.log(`  Canonical:   ${canonical}`)
console.log(`  Description: ${description.slice(0, 80)}...`)
