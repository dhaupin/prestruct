import usePageMeta from '../hooks/usePageMeta.js'
import { Link } from 'react-router-dom'

const SITE_URL = 'https://prestruct.creadev.org'

export default function About() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/about',
    title:       'How it works | prestruct',
    description: 'How prestruct prerenders Vite + React routes to static HTML. The build pipeline, caching strategy, and key architectural decisions explained.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">How it works</p>
          <h1 className="page-heading fade-up delay-1">The build pipeline.</h1>
          <p className="page-sub fade-up delay-2">
            prestruct adds two Node scripts to your existing Vite build. They run after
            <code>vite build</code>, take about 2 seconds, and leave you with a dist/
            that search engines can actually crawl.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Step by step</p>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-body">
                <p className="step-title">vite build</p>
                <p className="step-text">Your standard Vite production build. Produces <code>dist/</code> with content-hashed JS and CSS bundles. <code>dist/index.html</code> is a shell -- meta tags are empty placeholders at this point.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-body">
                <p className="step-title">node scripts/inject-brand.js</p>
                <p className="step-text">Reads your <code>ssr.config.js</code> and writes global title, meta description, Open Graph tags, Twitter Card tags, and JSON-LD schema into <code>dist/index.html</code>. This becomes the shell that step 3 builds per-route HTML on top of.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-body">
                <p className="step-title">node scripts/prerender.js</p>
                <p className="step-text">Spins up a Vite dev server, loads your <code>AppLayout</code> via <code>ssrLoadModule</code>, wraps it in <code>StaticRouter</code> for each route, renders to string, stamps per-route title/description/canonical/og:url, and writes <code>dist/route/index.html</code>. Also generates <code>404.html</code> with a real HTTP 404 status and a fresh <code>sitemap.xml</code> with today's date.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-body">
                <p className="step-title">Cloudflare Pages deploy</p>
                <p className="step-text">CF uploads only changed files. Each route's HTML is served with HTTP 200 and <code>Cache-Control: no-cache</code> -- always fresh. Hashed JS/CSS assets get <code>max-age=31536000, immutable</code>. <code>404.html</code> is served automatically with HTTP 404 for unmatched paths.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Caching strategy</p>
          <div className="feature-grid">
            <div className="feature">
              <p className="feature-icon">HTML pages</p>
              <h3 className="feature-title">Cache-Control: no-cache</h3>
              <p className="feature-desc">Every HTML file revalidates on each request. Users always get the latest deploy. Since the actual content is on Cloudflare's CDN, the revalidation is fast and cheap.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">JS + CSS assets</p>
              <h3 className="feature-title">Immutable, 1 year</h3>
              <p className="feature-desc">Vite content-hashes every bundle filename. The hash changes when content changes -- so <code>index-DnaYLP7Z.js</code> will never change. Safe to cache forever.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">404 + sitemap</p>
              <h3 className="feature-title">Short TTL</h3>
              <p className="feature-desc">sitemap.xml and robots.txt cache for 24 hours. Long enough to avoid hammering the origin, short enough to pick up route changes quickly after a deploy.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Key technical decisions</p>

          <div className="callout">
            <strong>Why ssrLoadModule instead of vite build --ssr</strong><br />
            A compiled SSR bundle creates a separate module instance from the client bundle.
            StaticRouter and Routes end up with different copies of react-router-dom --
            location context never propagates, every route silently renders as the homepage.
            ssrLoadModule uses Vite's unified registry: one instance, one context, correct output.
          </div>

          <div className="callout">
            <strong>Why AppLayout must never import BrowserRouter</strong><br />
            ssrLoadModule executes all imports at load time. BrowserRouter initializes
            immediately against <code>window.location</code>, which defaults to <code>/</code> in
            Node. This fires before StaticRouter can set the correct location.
            BrowserRouter lives only in <code>App.jsx</code>. AppLayout only uses Routes, Route, useLocation.
          </div>

          <div className="callout">
            <strong>Why hydrateRoot instead of createRoot</strong><br />
            createRoot replaces the entire DOM on mount, causing a repaint even when the SSR
            HTML matches perfectly -- users see a flash (FOUC). hydrateRoot attaches React to
            the existing SSR DOM without touching it. The page that the crawler indexed is
            identical to what the user's browser paints. No flash, no mismatch.
          </div>

          <div style={{ marginTop: '2rem' }}>
            <Link to="/use" className="btn btn-primary">Ready to integrate →</Link>
          </div>
        </div>
      </section>
    </>
  )
}
