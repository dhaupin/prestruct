import usePageMeta from '../hooks/usePageMeta.js'
import { Link } from 'react-router-dom'
import ViewSource from '../components/ViewSource.jsx'
import ToolsBlock from '../components/ToolsBlock.jsx'

const SITE_URL = 'https://prestruct.creadev.org'
const GITHUB   = 'https://github.com/dhaupin/prestruct'

export default function Home() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/',
    title:       'Prestruct | SEO prerendering for Vite + React on Cloudflare Pages',
    description: 'Make your Vite + React app visible to search engines. Prestruct prerenders each route to static HTML with correct title, description, Open Graph, schema.org, and cache headers deployed to Cloudflare Pages.',
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
            Search engines crawl HTML. React apps serve an empty shell. Prestruct fixes that:
            rendering each route to static HTML at build time with correct SEO meta tags, Open Graph, schema.org, and caching headers. No framework migration, no edge runtime, just a smarter build step.
          </p>
          <div className="hero-actions fade-up delay-3">
            <Link to="/deploy" className="btn btn-primary">Get started</Link>
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
          <p className="section-label">What you gain</p>
          <p className="u-section-intro">
            The Prestruct engine is a purpose built tool, that delivers SEO server side rendering (for crawlers), while being completely serverless on Cloudflare Pages.
          </p>
          <div className="benefit-grid">
            <div className="benefit">
              <p className="benefit-num">rank</p>
              <h3 className="benefit-title">Crawlable content</h3>
              <p className="benefit-desc">Every route serves full HTML to bots. No JavaScript execution required. Googlebot, Bingbot, and social crawlers see exactly what a user sees. Your words are in the code that bots see.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">CTR</p>
              <h3 className="benefit-title">Rich search previews</h3>
              <p className="benefit-desc">Per-route title, description, and canonical baked into HTML. Your search result shows the right snippet for each page, not a generic site-wide fallback.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">share</p>
              <h3 className="benefit-title">Social cards that work</h3>
              <p className="benefit-desc">og:title, og:description, og:url, og:image correct on every route. When someone shares your /features page, the card shows features content, not just your homepage organization.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">trust</p>
              <h3 className="benefit-title">Structured data</h3>
              <p className="benefit-desc">JSON-LD injected from your config into every page head. Organization, WebSite, Product, Article: whatever your app needs to earn rich results.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">speed</p>
              <h3 className="benefit-title">Correct cache headers</h3>
              <p className="benefit-desc">Hashed JS/CSS assets cached immutably. HTML revalidates on every request. Users always get fresh content, browsers never re-download unchanged bundles.</p>
            </div>
            <div className="benefit">
              <p className="benefit-num">zero cost</p>
              <h3 className="benefit-title">No infrastructure change</h3>
              <p className="benefit-desc">Prestruct deploys to Cloudflare Pages as static files. No server, no edge worker, no new runtime dependencies. The tradeoff: Build time goes up by about 2 seconds for every 10 prerendered routes.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Verify it yourself</p>
          <p className="u-section-intro">
            Every tool below accepts a URL and reports what it finds. Use them on this site
            or on your own, after integrating Prestruct.
          </p>
          <ToolsBlock />
        </div>
      </section>
	  
      <section className="section">
        <div className="container">
          <p className="section-label">Dynamic islands</p>
          <p className="u-section-intro">
            Prerendered HTML is the same for every visitor. Islands punch holes through it
            for content that isn't: cart state, recently viewed items, logged-in user
            widgets. Each island mounts its own React root after hydration. Crawlers see
            a fallback. Humans see live data.
          </p>
          <div className="feature-grid">
            <div className="feature">
              <p className="feature-icon">eager</p>
              <h3 className="feature-title">Immediate</h3>
              <p className="feature-desc">
                Mounts right after hydration. For above-the-fold widgets that need to be
                interactive as soon as possible.
              </p>
            </div>
            <div className="feature">
              <p className="feature-icon">visible</p>
              <h3 className="feature-title">On scroll</h3>
              <p className="feature-desc">
                Mounts via <code>IntersectionObserver</code> when the element enters the
                viewport. Nothing loads until the user reaches it.
              </p>
            </div>
            <div className="feature">
              <p className="feature-icon">idle</p>
              <h3 className="feature-title">Background</h3>
              <p className="feature-desc">
                Mounts via <code>requestIdleCallback</code> during browser downtime.
                No competition with paint or interaction.
              </p>
            </div>
          </div>
          <div className="u-mt-2">
            <Link to="/islands" className="btn btn-primary">See islands in action</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">This site is the proof</p>
          <div className="callout u-mb-15">
            The repo running at <strong>{SITE_URL}</strong> is the same example app in
            the <a href={GITHUB} target="_blank" rel="noopener noreferrer">Prestruct GitHub repo</a>.
            Every page you visit here was prerendered by Prestruct at build time.
            The widget below fetches and parses the live HTML for the current route so you can
            see exactly what a search engine or social crawler sees.
          </div>
          <ViewSource />
          <div className="u-mt-2">
            <Link to="/about" className="btn btn-primary">Learn More</Link>
          </div>
        </div>
      </section>
		  
    </>
  )
}
