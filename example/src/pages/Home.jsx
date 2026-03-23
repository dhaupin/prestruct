import usePageMeta from '../hooks/usePageMeta.js'
import { Link } from 'react-router-dom'

const SITE_URL = 'https://cf-seo-ssr-example.pages.dev'
const GITHUB   = 'https://github.com/dhaupin/cf-seo-ssr'

export default function Home() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/',
    title:       'cf-seo-ssr | Build-time prerender for Vite + React + Cloudflare Pages',
    description: 'Drop-in build-time prerender layer for Vite + React apps on Cloudflare Pages. Per-route HTML, correct SEO meta, sitemap, and 404 -- no framework required.',
  })

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="hero-kicker fade-up">Open source / MIT</p>
          <h1 className="hero-heading fade-up delay-1">
            SSR prerender for<br />
            <em>Vite + React</em> on CF Pages.
          </h1>
          <p className="hero-sub fade-up delay-2">
            Two Node scripts that run after <code>vite build</code>. Each route
            gets its own static HTML with correct title, description, Open Graph,
            canonical, and JSON-LD baked in. No framework. No edge runtime. No lock-in.
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
                <p className="step-desc">Global meta into dist/index.html</p>
              </div>
              <div className="pipeline-step">
                <p className="step-cmd">prerender.js</p>
                <p className="step-desc">Each route rendered to static HTML</p>
              </div>
              <div className="pipeline-step">
                <p className="step-cmd">CF Pages deploy</p>
                <p className="step-desc">Static files, global CDN, HTTP 200</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">What you get</p>
          <div className="feature-grid">
            <div className="feature">
              <p className="feature-icon">→ per-route HTML</p>
              <h3 className="feature-title">Static HTML per route</h3>
              <p className="feature-desc">Each route gets its own <code>index.html</code> with correct head tags. Bots see real content, no JS required.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">→ meta injection</p>
              <h3 className="feature-title">Title, OG, canonical</h3>
              <p className="feature-desc">Per-route title, description, og:url, og:title, og:description, canonical -- all baked in at build time.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">→ hydration</p>
              <h3 className="feature-title">Zero FOUC</h3>
              <p className="feature-desc"><code>hydrateRoot</code> attaches React to the existing SSR DOM. No repaint, no flash of unstyled content.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">→ sitemap + 404</p>
              <h3 className="feature-title">Sitemap + 404</h3>
              <p className="feature-desc">sitemap.xml generated from your routes config with today's date. 404.html served by CF Pages with real HTTP 404.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Proof -- view-source on this page</p>
          <div className="proof-panel">
            <div className="proof-bar">
              <span className="proof-dot" />
              <span className="proof-dot" />
              <span className="proof-dot" />
              <span className="proof-url">view-source:{SITE_URL}</span>
            </div>
            <div className="proof-body">
              <p className="proof-line"><span className="hl-muted">&lt;!-- Primary SEO (populated by inject-brand.js) --&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;title&gt;</span><span className="hl-value">cf-seo-ssr | Build-time prerender for Vite + React + Cloudflare Pages</span><span className="hl-tag">&lt;/title&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;meta</span> <span className="hl-attr">name</span>=<span className="hl-value">"description"</span> <span className="hl-attr">content</span>=<span className="hl-value">"Drop-in build-time prerender layer..."</span> <span className="hl-tag">/&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;link</span> <span className="hl-attr">rel</span>=<span className="hl-value">"canonical"</span> <span className="hl-attr">href</span>=<span className="hl-value">"{SITE_URL}/"</span> <span className="hl-tag">/&gt;</span></p>
              <p className="proof-line"><span className="hl-tag">&lt;meta</span> <span className="hl-attr">property</span>=<span className="hl-value">"og:title"</span> <span className="hl-attr">content</span>=<span className="hl-value">"cf-seo-ssr | Build-time prerender..."</span> <span className="hl-tag">/&gt;</span></p>
              <p className="proof-line"><span className="hl-muted">&lt;!-- ...and the full rendered HTML of this page, no JS needed --&gt;</span></p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
