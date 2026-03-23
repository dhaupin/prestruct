/**
 * scripts/prerender.js
 * ====================
 * Runs after `vite build` via `npm run build`.
 * Uses Vite's ssrLoadModule to render each route to static HTML.
 *
 * ssrLoadModule is used (not `vite build --ssr`) because it resolves
 * all modules through Vite's unified registry — no duplicate module
 * instances, no ESM/CJS interop issues. StaticRouter's location context
 * correctly propagates to useLocation() in all components.
 *
 * Output:
 *   dist/index.html          → /
 *   dist/about/index.html    → /about
 *   dist/tickets/index.html  → /tickets
 *   ... etc
 *   dist/sitemap.xml
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SITE_URL, PASSES, EVENT, VENUE } from '../src/brand.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')
const DIST      = path.join(ROOT, 'dist')

// ── Routes ───────────────────────────────────────────────────────────────────

const ROUTES = [
  {
    path: '/',
    priority: '1.0', changefreq: 'weekly',
    meta: {
      title: `Vibe Flow Festival: ${EVENT.tagline || 'Wake up the woods.'}`,
      description: `Three days of flow arts, fire, music, healing, and camping on the edge of the Allegheny forest. ${EVENT.dateDisplay} at ${VENUE.name}, ${VENUE.cityState}.`,
    },
  },
  {
    path: '/about',
    priority: '0.9', changefreq: 'monthly',
    meta: {
      title: 'About — Vibe Flow Festival',
      description: 'Flow arts, fire, music, healing workshops, and camping at the summer solstice. Kinzua Heritage Grounds, Russell, PA.',
    },
  },
  {
    path: '/schedule',
    priority: '0.9', changefreq: 'weekly',
    meta: {
      title: 'Schedule — Vibe Flow Festival',
      description: 'Full weekend program for Vibe Flow Festival 2026. Flow arts, fire performances, healing sessions, music, and medicinal plant walks across three days.',
    },
  },
  {
    path: '/tickets',
    priority: '1.0', changefreq: 'weekly',
    meta: {
      title: 'Get Your Pass — Vibe Flow Festival',
      description: `${PASSES.map(p => `${p.name} (${p.priceDisplay})`).join(', ')}. All passes include access to workshops, music, and the heritage grounds.`,
    },
  },
  {
    path: '/vendors',
    priority: '0.7', changefreq: 'monthly',
    meta: {
      title: 'Vendors — Vibe Flow Festival',
      description: 'Apply for the Wooded Vendor Row at Vibe Flow Festival. Curated spots for makers, artisans, and healers. Applications via PandaDoc.',
    },
  },
  {
    path: '/volunteer',
    priority: '0.7', changefreq: 'monthly',
    meta: {
      title: 'Volunteer — Vibe Flow Festival',
      description: 'Eight hours of your time gets you a full weekend pass. Gate check-in, land stewardship, workshop support. Sign up via PandaDoc.',
    },
  },
  {
    path: '/musicians',
    priority: '0.7', changefreq: 'monthly',
    meta: {
      title: 'Musicians — Vibe Flow Festival',
      description: 'Perform at Vibe Flow Festival. Main stage, acoustic fire circle, ambient stage, and workshop stage. Submit your EPK via PandaDoc.',
    },
  },
  {
    path: '/news',
    priority: '0.8', changefreq: 'weekly',
    meta: {
      title: 'News — Vibe Flow Festival',
      description: 'Lineup announcements, pass updates, and festival news for Vibe Flow Festival 2026.',
    },
  },
  {
    path: '/contact',
    priority: '0.6', changefreq: 'yearly',
    meta: {
      title: 'Contact — Vibe Flow Festival',
      description: 'Get in touch with the Vibe Flow Festival team. General inquiries, passes, vendors, volunteers, musicians, and sponsors.',
    },
  },
  {
    path: '/terms',
    priority: '0.3', changefreq: 'yearly',
    meta: {
      title: 'Terms — Vibe Flow Festival',
      description: 'Website terms of use, ticketing policy, PandaDoc agreements, event rules, and Kinzua Heritage Grounds land use guidelines.',
    },
  },
  {
    path: '/privacy',
    priority: '0.3', changefreq: 'yearly',
    meta: {
      title: 'Privacy — Vibe Flow Festival',
      description: 'Privacy policy for Vibe Flow Festival. How we handle web, ticketing, and event data. We never sell your information.',
    },
  },
]

// ── Meta injection ────────────────────────────────────────────────────────────

function injectMeta(html, meta, routePath) {
  const title   = meta.title
  // Escape $ signs — without this, '$120' becomes a regex backreference in .replace()
  const desc    = meta.description.replace(/\$/g, '$$$$')
  const ogImage = meta.ogImage || `${SITE_URL}/og-image.jpg`
  const url     = `${SITE_URL}${routePath === '/' ? '' : routePath}`

  html = html.replace(/<title>[^<]*<\/title>/,                                      `<title>${title}</title>`)
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s,          `$1${desc}$2`)
  html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/s,         `$1${title}$2`)
  html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/s,   `$1${desc}$2`)
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/s,           `$1${url}$2`)
  html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/s,         `$1${ogImage}$2`)
  html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/s,        `$1${title}$2`)
  html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,  `$1${desc}$2`)
  html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/s,        `$1${ogImage}$2`)
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/s,                `$1${url}$2`)

  return html
}

// ── Sitemap ───────────────────────────────────────────────────────────────────

function generateSitemap(routes) {
  const now  = new Date().toISOString().split('T')[0]
  const urls = routes.map(r => `
  <url>
    <loc>${SITE_URL}${r.path === '/' ? '' : r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`
}

// ── 404 page ─────────────────────────────────────────────────────────────────

function generate404(shell) {
  // Build 404 body as array join — avoids template literal quoting issues.
  // Uses id="root-404" (not "root") so main.jsx does not trigger hydrateRoot.
  // hydrateRoot expects SSR React content; this is plain static HTML.
  const lines = [
    '<div id="root-404">',
    '<div class="page-content" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem">',
    '<span class="eyebrow">404</span>',
    '<h1 style="margin-bottom:1rem">Lost in the woods.</h1>',
    '<p style="max-width:480px;font-size:1.1rem;line-height:1.8;margin-bottom:0.75rem">The path you followed does not lead anywhere on these grounds. Could be a broken link, an old URL, or just the forest doing its thing.</p>',
    '<p style="max-width:480px;font-size:1rem;color:var(--text-muted);margin-bottom:2.5rem">Head back to the homepage, or reach out if you were looking for something specific.</p>',
    '<div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center">',
    '<a href="/" class="btn btn-fire btn-primary">Back to the festival</a>',
    '<a href="/contact" class="btn btn-outline">Get in touch</a>',
    '</div>',
    '</div>',
    '</div>',
  ]
  const notFoundBody = lines.join('\n')

  let html = shell.replace('<div id="root"></div>', notFoundBody)

  html = html.replace(/<title>[^<]*<\/title>/, '<title>Page Not Found — Vibe Flow Festival</title>')
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/s,
    '$1The page you were looking for does not exist. Return to Vibe Flow Festival.$2'
  )
  html = html.replace(
    /(<meta\s+property="og:title"\s+content=")[^"]*(")/s,
    '$1Page Not Found — Vibe Flow Festival$2'
  )
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/s,
    '$1' + SITE_URL + '/$2'
  )
  html = html.replace(
    '<meta name="author"',
    '<meta name="robots" content="noindex, nofollow" />\n    <meta name="author"'
  )
  // Remove the React bundle — 404 is pure static HTML, no React needed
  html = html.replace(/<script type="module"[^>]*><\/script>/, '')

  return html
}
// ── Main ──────────────────────────────────────────────────────────────────────

async function prerender() {
  console.log('\n[prerender] Starting static HTML generation...')

  const { createServer }   = await import('vite')
  const { renderToString } = await import('react-dom/server')
  const React              = (await import('react')).default
  const { StaticRouter }   = await import('react-router-dom/server.js')

  // Spin up a Vite dev server in SSR mode.
  // ssrLoadModule resolves all imports through Vite's unified module registry.
  // This guarantees a single instance of react-router-dom — StaticRouter's
  // location context reaches useLocation() inside Routes correctly.
  const vite = await createServer({
    root: ROOT,
    server: { middlewareMode: true },
    appType: 'custom',
    customLogger: {
      info:           () => {},
      warn:           (msg) => { if (!msg.includes('ExperimentalWarning')) process.stderr.write('[prerender:warn] ' + msg + '\n') },
      error:          (msg) => process.stderr.write('[prerender:err] ' + msg + '\n'),
      clearScreen:    () => {},
      hasErrorLogged: () => false,
      hasWarned:      false,
      warnOnce:       () => {},
    },
  })

  try {
    const { default: AppLayout } = await vite.ssrLoadModule('/src/AppLayout.jsx')
    const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8')
    let succeeded = 0

    for (const route of ROUTES) {
      try {
        const appHtml = renderToString(
          React.createElement(
            StaticRouter,
            { location: route.path },
            React.createElement(AppLayout)
          )
        )

        let html = shell.replace(
          '<div id="root"></div>',
          `<div id="root" data-server-rendered="true">${appHtml}</div>`
        )

        html = injectMeta(html, route.meta, route.path)

        if (route.path === '/') {
          fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf-8')
        } else {
          const dir = path.join(DIST, route.path.slice(1))
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8')
        }

        console.log(`[prerender] ✓ ${route.path}`)
        succeeded++
      } catch (err) {
        console.error(`[prerender] ✗ ${route.path}: ${err.message}`)
      }
    }

    // Generate 404.html — served by CF Pages for all unmatched routes.
    // Uses the same shell as other pages so CSS/fonts are consistent.
    // The HTTP 404 status is set automatically by CF Pages when it serves this file.
    const notFoundHtml = generate404(shell)
    fs.writeFileSync(path.join(DIST, '404.html'), notFoundHtml, 'utf-8')
    console.log('[prerender] ✓ /404.html')

    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), generateSitemap(ROUTES), 'utf-8')
    console.log('[prerender] ✓ /sitemap.xml')
    console.log(`[prerender] Done. ${succeeded}/${ROUTES.length} pages rendered.\n`)

  } finally {
    await vite.close()
  }
}

prerender().catch(err => {
  console.warn('[prerender] Fatal — deploying as SPA:', err.message)
  process.exit(0)
})
