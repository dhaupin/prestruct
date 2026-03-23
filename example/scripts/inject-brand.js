/**
 * scripts/inject-brand.js
 * =======================
 * ENGINE FILE -- copy once, never edit.
 *
 * Post-build script. Runs after `vite build` via `npm run build`.
 * Reads ssr.config.js and injects all head meta into dist/index.html:
 *   - <title>
 *   - <meta name="description">
 *   - <meta name="author">
 *   - <meta name="keywords">
 *   - <link rel="canonical">
 *   - Open Graph tags (og:type, og:url, og:title, og:description, og:image, og:site_name)
 *   - Twitter Card tags
 *   - JSON-LD structured data (from config.buildJsonLd())
 *
 * index.html is the shell template. All brand identity comes from ssr.config.js.
 * Nothing is hardcoded in index.html -- it is the template, not the source of truth.
 *
 * Fails gracefully -- exits 0 on any error so a bad config never blocks deployment.
 * The site will still deploy as a working SPA without prerendered meta.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

const distDir  = resolve('dist')
const htmlPath = join(distDir, 'index.html')

if (!existsSync(htmlPath)) {
  console.warn('[inject-brand] dist/index.html not found -- skipping')
  process.exit(0)
}

let config
try {
  config = (await import('../ssr.config.js')).default
} catch (err) {
  console.warn('[inject-brand] Could not load ssr.config.js -- skipping:', err.message)
  process.exit(0)
}

const {
  siteUrl, siteName, author, tagline, ogImage, keywords,
  routes = [], buildJsonLd,
} = config

// Homepage meta as the global description fallback
const homeRoute   = routes.find(r => r.path === '/') || {}
const title       = `${siteName} | ${tagline}`
const description = homeRoute.meta?.description ?? ''
const canonical   = `${siteUrl}/`

let html = readFileSync(htmlPath, 'utf8')

// ── Primary meta ──────────────────────────────────────────────────────────────

html = html.replace(/<title>.*?<\/title>/s,
  `<title>${title}</title>`)

html = html.replace(/<meta name="description"[^>]*>/,
  `<meta name="description" content="${description}" />`)

html = html.replace(/<meta name="author"[^>]*>/,
  `<meta name="author" content="${author}" />`)

if (keywords) {
  html = html.replace(/<meta name="keywords"[^>]*>/,
    `<meta name="keywords" content="${keywords}" />`)
}

html = html.replace(/<link rel="canonical"[^>]*>/,
  `<link rel="canonical" href="${canonical}" />`)

// ── Remove previously injected OG / JSON-LD blocks (safe to run on rebuild) ──

html = html.replace(/\n\s*<!-- Open Graph -->[\s\S]*?<\/script>\s*/g, '\n  ')

// ── Open Graph + Twitter Card ─────────────────────────────────────────────────

const ogTags = `
    <!-- Open Graph -->
    <meta property="og:type"         content="website" />
    <meta property="og:url"          content="${canonical}" />
    <meta property="og:title"        content="${title}" />
    <meta property="og:description"  content="${description}" />
    <meta property="og:image"        content="${ogImage}" />
    <meta property="og:locale"       content="en_US" />
    <meta property="og:site_name"    content="${siteName}" />

    <!-- Twitter / X Card -->
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:title"       content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image"       content="${ogImage}" />`

// ── JSON-LD ───────────────────────────────────────────────────────────────────

let jsonLdBlock = ''
if (typeof buildJsonLd === 'function') {
  const jsonLdData = buildJsonLd()
  if (Array.isArray(jsonLdData) && jsonLdData.length > 0) {
    // Wrap in @graph if multiple objects, or use directly if single
    const payload = jsonLdData.length === 1
      ? jsonLdData[0]
      : { '@context': 'https://schema.org', '@graph': jsonLdData }
    jsonLdBlock = `
    <!-- JSON-LD Structured Data -- generated from ssr.config.js -->
    <script type="application/ld+json">
    ${JSON.stringify(payload, null, 2)}
    </script>`
  }
}

html = html.replace('</head>', `${ogTags}\n${jsonLdBlock}\n  </head>`)

writeFileSync(htmlPath, html, 'utf8')

console.log('[inject-brand] ✓ injection complete')
console.log(`  Title:     ${title}`)
console.log(`  Canonical: ${canonical}`)
