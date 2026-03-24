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
            Prestruct adds two Node scripts to your existing Vite build. They run after{' '}
            <code>vite build</code>, take about 2 seconds, and leave you with a{' '}
            <code>dist/</code> that search engines can crawl.
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
                <p className="step-text">
                  Your standard Vite production build. Produces <code>dist/</code> with
                  content-hashed JS and CSS bundles. <code>dist/index.html</code> is a
                  shell with empty meta placeholders at this point.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-body">
                <p className="step-title">node scripts/inject-brand.js</p>
                <p className="step-text">
                  Reads your <code>ssr.config.js</code> and writes global title, meta
                  description, Open Graph tags, Twitter Card tags, and JSON-LD schema into{' '}
                  <code>dist/index.html</code>. This becomes the shell that step 3 stamps
                  per-route meta on top of.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-body">
                <p className="step-title">node scripts/prerender.js</p>
                <p className="step-text">
                  Spins up a Vite dev server, loads <code>AppLayout</code> via{' '}
                  <code>ssrLoadModule</code>, wraps it in <code>StaticRouter</code> for
                  each route, renders to string, stamps per-route title, description,
                  canonical, and og:url, then writes <code>dist/route/index.html</code>.
                  Also generates <code>404.html</code> with a real HTTP 404 status and a
                  fresh <code>sitemap.xml</code> dated today.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-body">
                <p className="step-title">Cloudflare Pages deploy</p>
                <p className="step-text">
                  CF uploads only changed files. Each route's HTML is served with HTTP 200
                  and <code>Cache-Control: no-cache</code>, so users always get the latest
                  deploy. Hashed JS/CSS assets get <code>max-age=31536000, immutable</code>.{' '}
                  <code>404.html</code> is served automatically with HTTP 404 for unmatched paths.
                </p>
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
              <h3 className="feature-title"><code>Cache-Control: no-cache</code></h3>
              <p className="feature-desc">
                Every HTML file revalidates on each request. Users always get the latest
                deploy. The revalidation is fast because the content lives on Cloudflare's CDN edge.
              </p>
            </div>
            <div className="feature">
              <p className="feature-icon">JS + CSS assets</p>
              <h3 className="feature-title">Immutable, 1 year</h3>
              <p className="feature-desc">
                Vite content-hashes every bundle filename. The hash changes when content
                changes, so <code>index-DnaYLP7Z.js</code> will never change. Safe to
                cache forever.
              </p>
            </div>
            <div className="feature">
              <p className="feature-icon">404 + sitemap</p>
              <h3 className="feature-title">Short TTL</h3>
              <p className="feature-desc">
                <code>sitemap.xml</code> and <code>robots.txt</code> cache for 24 hours.
                Long enough to avoid hammering the origin, short enough to pick up route
                changes quickly after a deploy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Key technical decisions</p>

          <div className="callout">
            <strong>Why <code>ssrLoadModule</code> instead of <code>vite build --ssr</code></strong>
            <p>
              A compiled SSR bundle creates a separate module instance from the client
              bundle. <code>StaticRouter</code> and <code>Routes</code> end up with
              different copies of <code>react-router-dom</code>. Location context never
              propagates, and every route silently renders as the homepage.{' '}
              <code>ssrLoadModule</code> uses Vite's unified registry: one instance,
              one context, correct output.
            </p>
          </div>

          <div className="callout">
            <strong>Why <code>AppLayout</code> must never import <code>BrowserRouter</code></strong>
            <p>
              <code>ssrLoadModule</code> executes all imports at load time.{' '}
              <code>BrowserRouter</code> initializes immediately against{' '}
              <code>window.location</code>, which defaults to <code>/</code> in Node.
              This fires before <code>StaticRouter</code> can set the correct location.
              <code>BrowserRouter</code> lives only in <code>App.jsx</code>.{' '}
              <code>AppLayout</code> only uses <code>Routes</code>, <code>Route</code>,
              and <code>useLocation</code>.
            </p>
          </div>

          <div className="callout">
            <strong>Why <code>hydrateRoot</code> instead of <code>createRoot</code></strong>
            <p>
              <code>createRoot</code> replaces the entire DOM on mount, causing a repaint
              even when the SSR HTML matches perfectly. Users see a flash (FOUC).{' '}
              <code>hydrateRoot</code> attaches React to the existing SSR DOM without
              touching it. The page the crawler indexed is identical to what the browser
              paints. No flash, no mismatch.
            </p>
          </div>

          <pre><code>{`// main.jsx: the hydrateRoot conditional
const root = document.getElementById('root')
if (root && root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else if (root) {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}`}</code></pre>

          <div style={{ marginTop: '2rem' }}>
            <Link to="/deploy" className="btn btn-primary">Ready to integrate</Link>
          </div>
        </div>
      </section>
    </>
  )
}
