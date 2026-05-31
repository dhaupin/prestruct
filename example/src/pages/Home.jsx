import usePageMeta from '../hooks/usePageMeta.js'
import { Link } from 'react-router-dom'
import ViewSource from '../components/ViewSource.jsx'
import ToolsBlock from '../components/ToolsBlock.jsx'
import CodeBlock from '../components/CodeBlock.jsx'
import { Accordion, AccordionItem } from '../components/Accordion.jsx'
import config from '../../ssr.config.js'

const SITE_URL = 'https://prestruct.creadev.org'
const GITHUB   = 'https://github.com/dhaupin/prestruct'

export default function Home() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/',
    title:       config.routes[0].meta.title,
    description: config.routes[0].meta.description,
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

          <p className="hero-sub fade-up delay-2">
            Prestruct is a build-time prerender layer for Vite and React applications. It generates static HTML for every route with correct SEO metadata, schema.org markup, and cache headers, enabling React apps to be fully crawlable and indexed by search engines and AI models without needing server runtime.
          </p>

          <div className="fade-up delay-2" style={{ marginTop: '2rem' }}>
            <CodeBlock lang="sh" label="sh">
{`# Quick start (AI agents)
git clone https://github.com/dhaupin/prestruct
cp init/ssr.config.example.js ssr.config.js
npm run build

# Config: ssr.config.js
# Source: example/ (live)
# Docs: README.md`}
            </CodeBlock>
          </div>

          <p className="hero-sub fade-up delay-3">
            Prestruct is built for frontend developers and site maintainers deploying React applications who want reliable SEO without changing their stack.
          </p>

          <div className="hero-actions fade-up delay-3">
            <Link to="/deploy" className="btn btn-primary">Start deploying</Link>
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
              <h2 className="benefit-title">Config-first</h2>
              <p className="benefit-desc">
                All SEO, routes, and meta in <code>ssr.config.js</code>. 
                No coupling to app code. Extend via hooks.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">02</p>
              <h2 className="benefit-title">Incremental builds</h2>
              <p className="benefit-desc">
                Caches rendered HTML per route. Skip unchanged routes on rebuild. 
                <code>--force</code> to rebuild all.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">03</p>
              <h2 className="benefit-title">Dynamic routes</h2>
              <p className="benefit-desc">
                <code>fetchRoutes()</code> hook pulls from any CMS at build time. 
                Renders to static. No runtime calls.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">04</p>
              <h2 className="benefit-title">Dynamic islands</h2>
              <p className="benefit-desc">
                <code>&lt;pre-island&gt;</code> placeholders mount client-only React. 
                Fallback for crawlers, live data for humans.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">05</p>
              <h2 className="benefit-title">Multi-platform</h2>
              <p className="benefit-desc">
                Auto-detects Cloudflare, Vercel, Netlify. Injects correct 
                headers, redirects, config per host.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">06</p>
              <h2 className="benefit-title">Zero deps</h2>
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
          <Accordion>
            {config.faqs?.map((faq, i) => (
              <AccordionItem key={i} q={faq.q}>
                <p>{faq.a}</p>
              </AccordionItem>
            ))}
          </Accordion>
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
              <h2 className="feature-title">Immediate</h2>
              <p className="feature-desc">Mounts right after hydration.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">visible</p>
              <h2 className="feature-title">On scroll</h2>
              <p className="feature-desc">IntersectionObserver when in view.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">idle</p>
              <h2 className="feature-title">Background</h2>
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
