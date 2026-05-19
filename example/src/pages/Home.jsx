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
      {/* AI-first hero */}
      <section className="hero">
        <div className="container">
          
          <h1 className="hero-heading fade-up delay-1">
            Your React app<br />
            <em>visible to search engines.</em>
          </h1>

          <div className="fade-up delay-2" style={{ marginTop: '2rem' }}>
            <div className="cb">
              <div className="cb-bar">
                <span className="cb-label">sh</span>
              </div>
              <pre className="cb-pre">
{`# Quick start (AI agents)
git clone https://github.com/dhaupin/prestruct
cp init/ssr.config.example.js ssr.config.js
npm run build

# Config: ssr.config.js
# Source: example/ (live)
# Docs: README.md`}
              </pre>
            </div>
          </div>

          <p className="hero-sub fade-up delay-3">
            Search engines crawl HTML. React apps serve empty shells. Prestruct renders each route to
            static HTML at build time - correct SEO, Open Graph, schema.org, cache headers.
            No edge runtime. Just a smarter build step.
          </p>

          <div className="hero-actions fade-up delay-3">
            <Link to="/deploy" className="btn btn-primary">Get started</Link>
            <a href={GITHUB} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
              View source
            </a>
          </div>

          <div className="pipeline fade-up delay-4">
            <div className="pipeline-steps">
              <div className="pipeline-step">
                <p className="step-cmd">vite build</p>
              </div>
              <div className="pipeline-step">
                <p className="step-cmd">prerender.js</p>
              </div>
              <div className="pipeline-step">
                <p className="step-cmd">deploy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI-first features */}
      <section className="section">
        <div className="container">
          <p className="section-label">Features for AI agents</p>
          <div className="benefit-grid">
            <div className="benefit">
              <p className="benefit-num">01</p>
              <h3 className="benefit-title">Config-first</h3>
              <p className="benefit-desc">
                All SEO, routes, and meta in <code>ssr.config.js</code>. 
                No coupling to app code. Extend via hooks.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">02</p>
              <h3 className="benefit-title">Incremental builds</h3>
              <p className="benefit-desc">
                Caches rendered HTML per route. Skip unchanged routes on rebuild. 
                <code>--force</code> to rebuild all.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">03</p>
              <h3 className="benefit-title">Dynamic routes</h3>
              <p className="benefit-desc">
                <code>fetchRoutes()</code> hook pulls from any CMS at build time. 
                Renders to static. No runtime calls.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">04</p>
              <h3 className="benefit-title">Dynamic islands</h3>
              <p className="benefit-desc">
                <code>&lt;pre-island&gt;</code> placeholders mount client-only React. 
                Fallback for crawlers, live data for humans.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">05</p>
              <h3 className="benefit-title">Multi-platform</h3>
              <p className="benefit-desc">
                Auto-detects Cloudflare, Vercel, Netlify. Injects correct 
                headers, redirects, config per host.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">06</p>
              <h3 className="benefit-title">Zero deps</h3>
              <p className="benefit-desc">
                No new dependencies added to your app. Scripts run standalone. 
                Extend what you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI-first FAQ */}
      <section className="section" style={{ background: 'var(--bg-1)' }}>
        <div className="container">
          <p className="section-label">FAQ (AI-first)</p>
          <div style={{ maxWidth: '800px', marginTop: '2rem' }}>
            <details style={{ marginBottom: '1rem', borderBottom: '1px solid var(--text-3)', paddingBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                How do I add this to my existing Vite + React app?
              </summary>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-2)' }}>
                Copy <code>init/</code> scripts to your project. Add prerender to your build script. 
                Edit <code>ssr.config.js</code> with your routes. That's it.
              </p>
            </details>
            <details style={{ marginBottom: '1rem', borderBottom: '1px solid var(--text-3)', paddingBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                Does it work with any hosting?
              </summary>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-2)' }}>
                Yes. Auto-detects Cloudflare Pages, Vercel, or Netlify. Injects correct platform config. 
                Any static host works - just copy dist/ output.
              </p>
            </details>
            <details style={{ marginBottom: '1rem', borderBottom: '1px solid var(--text-3)', paddingBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                How do I add a new route?
              </summary>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-2)' }}>
                Add it to the <code>routes</code> array in <code>ssr.config.js</code>. 
                Prerender picks it up on next build. No code changes needed.
              </p>
            </details>
            <details style={{ marginBottom: '1rem', borderBottom: '1px solid var(--text-3)', paddingBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                What about dynamic content (cart, user state)?
              </summary>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-2)' }}>
                Use <code>&lt;pre-island&gt;</code> elements. They mount client-only React after hydration. 
                Crawlers see fallback content.
              </p>
            </details>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                Why not use edge SSR instead?
              </summary>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-2)' }}>
                Prestruct is static HTML - faster, cheaper, simpler. No edge runtime needed. 
                Build once, deploy everywhere. Good for SEO. Edge SSR is for dynamic per-request content.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Verify */}
      <section className="section">
        <div className="container">
          <p className="section-label">Verify it works</p>
          <p className="u-section-intro">
            See what prerender outputs. Test this site or your own after integrating.
          </p>
          <ToolsBlock />
        </div>
      </section>

      {/* Islands */}
      <section className="section">
        <div className="container">
          <p className="section-label">Dynamic islands</p>
          <p className="u-section-intro">
            Static HTML is the same for everyone. Islands punch holes for dynamic content - 
            cart state, user widgets, personalization.
          </p>
          <div className="feature-grid">
            <div className="feature">
              <p className="feature-icon">eager</p>
              <h3 className="feature-title">Immediate</h3>
              <p className="feature-desc">Mounts right after hydration.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">visible</p>
              <h3 className="feature-title">On scroll</h3>
              <p className="feature-desc">IntersectionObserver when in view.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">idle</p>
              <h3 className="feature-title">Background</h3>
              <p className="feature-desc">requestIdleCallback during downtime.</p>
            </div>
          </div>
          <div className="u-mt-2">
            <Link to="/islands" className="btn btn-primary">See islands in action</Link>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="section">
        <div className="container">
          <p className="section-label">This site is the proof</p>
          <div className="callout u-mb-15">
            <strong>{SITE_URL}</strong> is the example app in the 
            <a href={GITHUB} target="_blank" rel="noopener noreferrer"> Prestruct repo</a>.
            Build, deploy, inspect - it's all running the same prerender pipeline you're copying.
          </div>
          <ViewSource />
        </div>
      </section>
    </>
  )
}
