import usePageMeta from '../hooks/usePageMeta.js'
import { Link } from 'react-router-dom'

const SITE_URL = 'https://prestruct.creadev.org'
const GITHUB   = 'https://github.com/dhaupin/prestruct'

export default function Home() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/',
    title:       'prestruct | SEO prerendering for Vite + React on Cloudflare Pages',
    description: 'Make your Vite + React app visible to search engines. prestruct prerenders each route to static HTML with correct title, description, Open Graph, schema.org, and cache headers -- deployed to Cloudflare Pages.',
  })

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="hero-kicker fade-up">Open source / MIT</p>
          <h1 className="hero-heading fade-up delay-1">
            Your React app,<br />
            <em>visible to search engines.</em>
          </h1>
          <p className="hero-sub fade-up delay-2">
            Search engines crawl HTML. SPAs serve an empty shell. prestruct fixes that --
            rendering each route to static HTML at build time with correct title,
            description, Open Graph, schema.org, and cache headers. No framework migration.
            No edge runtime. Just a smarter build step.
          </p>
          <div className="hero-actions fade-up delay-3">
            <Link to="/use" className="btn btn-primary">Get started →</Link>
            <a href={GITHUB} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
              View source
            </a>
          </div>

          <div className="pipeline fade-up delay-4">
            <p className="pipeline-label">Build pipeline</p>
            <div className="pipeline-steps">
              <div className="pipeline-step">
                <p className="step-cmd">vite build</p>
                <p className="step-desc">Hashed JS + CSS bundles to dist/</p>
              </div>
              <div className="pipeline-step">
                <p className="step-cmd">inject-brand.js</p>
                <p className="step-desc">Global SEO meta into index.html</p>
              </div>
              <div className="pipeline-step">
                <p className="step-cmd">prerender.js</p>
                <p className="step-desc">Each route rendered to static HTML</p>
              </div>
              <div className="pipeline-step">
                <p className="step-cmd">CF Pages deploy</p>
                <p className="step-desc">Globally cached, correct HTTP status</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">The SPA SEO problem</p>
          <div className="compare">
            <div className="compare-row header">
              <div className="compare-cell"></div>
              <div className="compare-cell">Plain SPA</div>
              <div className="compare-cell">SPA + prestruct</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Googlebot sees</div>
              <div className="compare-cell bad">Empty &lt;div id="root"&gt;</div>
              <div className="compare-cell good">Full rendered HTML</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Per-route title</div>
              <div className="compare-cell bad">Wrong or missing</div>
              <div className="compare-cell good">Baked in at build time</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Open Graph / social</div>
              <div className="compare-cell bad">Site-wide default only</div>
              <div className="compare-cell good">Per-route og:title, og:description, og:url</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">schema.org JSON-LD</div>
              <div className="compare-cell bad">Not present</div>
              <div className="compare-cell good">Injected from config</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Asset caching</div>
              <div className="compare-cell bad">No cache strategy</div>
              <div className="compare-cell good">Immutable assets, no-cache HTML</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">404 status</div>
              <div className="compare-cell bad">HTTP 200 on all routes</div>
              <div className="compare-cell good">Real HTTP 404 from 404.html</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Sitemap</div>
              <div className="compare-cell bad">Manual, goes stale</div>
              <div className="compare-cell good">Auto-generated on every build</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">What you gain</p>
          <div className="benefit-grid">
            <div className="benefit">
              <p className="benefit-num">↑ rank</p>
              <h3 className="benefit-title">Crawlable content</h3>
              <p className="benefit-desc">Every route serves its full HTML to bots. No JavaScript execution required. Googlebot, Bingbot, and social crawlers see exactly what a user sees.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">↑ CTR</p>
              <h3 className="benefit-title">Rich search previews</h3>
              <p className="benefit-desc">Per-route title and description baked into HTML. Your search result shows the right snippet for each page, not a generic site-wide fallback.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">↑ share</p>
              <h3 className="benefit-title">Social cards that work</h3>
              <p className="benefit-desc">og:title, og:description, og:url, og:image correct on every route. When someone shares your /pricing page, the card shows pricing content, not your homepage.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">↑ trust</p>
              <h3 className="benefit-title">Schema.org structured data</h3>
              <p className="benefit-desc">JSON-LD injected from your config into every page head. Organization, WebSite, Product, Article -- whatever your app needs to earn rich results.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">↑ speed</p>
              <h3 className="benefit-title">Correct cache headers</h3>
              <p className="benefit-desc">Hashed JS/CSS assets cached immutably. HTML revalidates on every request. Users always get fresh content, browsers never re-download unchanged bundles.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">0 cost</p>
              <h3 className="benefit-title">No infrastructure change</h3>
              <p className="benefit-desc">Still deploying to Cloudflare Pages as static files. No server, no edge worker, no new dependencies at runtime. Build time goes up by ~2 seconds.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">This page, right now</p>
          <div className="proof-panel">
            <div className="proof-bar">
              <span className="proof-dot" />
              <span className="proof-dot" />
              <span className="proof-dot" />
              <span className="proof-url">view-source:{SITE_URL}</span>
            </div>
            <div className="proof-body">
              <p className="proof-line"><span className="hl-muted">&lt;!-- injected by inject-brand.js from ssr.config.js --&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;title&gt;</span><span className="hl-value">prestruct | SEO prerendering for Vite + React on Cloudflare Pages</span><span className="hl-tag">&lt;/title&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;meta</span> <span className="hl-attr">name</span>=<span className="hl-value">"description"</span> <span className="hl-attr">content</span>=<span className="hl-value">"Make your Vite + React app visible to search engines..."</span> <span className="hl-tag">/&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;link</span> <span className="hl-attr">rel</span>=<span className="hl-value">"canonical"</span> <span className="hl-attr">href</span>=<span className="hl-value">"{SITE_URL}/"</span> <span className="hl-tag">/&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;meta</span> <span className="hl-attr">property</span>=<span className="hl-value">"og:url"</span> <span className="hl-attr">content</span>=<span className="hl-value">"{SITE_URL}/"</span> <span className="hl-tag">/&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;script</span> <span className="hl-attr">type</span>=<span className="hl-value">"application/ld+json"</span><span className="hl-tag">&gt;</span><span className="hl-muted">{"{ \"@type\": \"SoftwareApplication\", ... }"}</span><span className="hl-tag">&lt;/script&gt;</span></p>
              <p className="proof-line"><span className="hl-muted">&lt;!-- then the full rendered HTML of this route, no JS needed --&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;div</span> <span className="hl-attr">id</span>=<span className="hl-value">"root"</span> <span className="hl-attr">data-server-rendered</span>=<span className="hl-value">"true"</span><span className="hl-tag">&gt;</span><span className="hl-muted">...full HTML...</span><span className="hl-tag">&lt;/div&gt;</span></p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
