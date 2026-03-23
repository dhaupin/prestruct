import usePageMeta from '../hooks/usePageMeta.js'
import { Link } from 'react-router-dom'

const SITE_URL = 'https://cf-seo-ssr-example.pages.dev'

export default function About() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/about',
    title:       'About | cf-seo-ssr',
    description: "How cf-seo-ssr works under the hood. ssrLoadModule, StaticRouter, hydrateRoot, and the decisions that make it debuggable.",
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">About</p>
          <h1 className="page-heading fade-up delay-1">How it works.</h1>
          <p className="page-sub fade-up delay-2">
            The full build pipeline, the key architectural decisions, and why
            each one was made. Read this before integrating.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">The build pipeline</p>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-body">
                <p className="step-title">vite build</p>
                <p className="step-text">Standard Vite production build. Produces <code>dist/</code> with hashed JS and CSS bundles. <code>dist/index.html</code> is the shell template -- meta tags are placeholders at this point.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-body">
                <p className="step-title">node scripts/inject-brand.js</p>
                <p className="step-text">Reads <code>ssr.config.js</code> and writes global title, description, Open Graph, Twitter Card, and JSON-LD into <code>dist/index.html</code>. This becomes the shell that prerender.js stamps per-route meta on top of.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-body">
                <p className="step-title">node scripts/prerender.js</p>
                <p className="step-text">Spins up a Vite dev server, loads <code>AppLayout</code> via <code>ssrLoadModule</code>, wraps it in <code>StaticRouter</code> for each route, renders to string, injects per-route meta, and writes <code>dist/route/index.html</code>. Also generates <code>404.html</code> and <code>sitemap.xml</code>.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">04</div>
              <div className="step-body">
                <p className="step-title">CF Pages deploy</p>
                <p className="step-text">Cloudflare uploads only changed files (content-addressed). Each route's <code>index.html</code> is served as static HTML with a real HTTP 200. <code>404.html</code> gets a real HTTP 404. Assets are cached immutably.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Key decisions</p>

          <div className="callout">
            <strong>Why ssrLoadModule instead of vite build --ssr?</strong><br />
            A compiled SSR bundle creates a separate module instance from the client bundle.
            StaticRouter and Routes end up with different copies of react-router-dom, so
            location context never propagates -- every route silently renders as the homepage.
            ssrLoadModule uses Vite's unified registry: one instance, one context, correct output.
          </div>

          <div className="callout">
            <strong>Why AppLayout must never import BrowserRouter.</strong><br />
            When ssrLoadModule loads a file, it executes all imports. BrowserRouter initializes
            immediately against <code>window.location</code>, which defaults to <code>/</code> in Node.
            This overrides StaticRouter before it can set the correct location.
            Solution: BrowserRouter lives only in <code>App.jsx</code>. AppLayout only uses Routes, Route, useLocation.
          </div>

          <div className="callout">
            <strong>Why hydrateRoot instead of createRoot.</strong><br />
            createRoot replaces the entire DOM on mount -- even if the SSR HTML is identical,
            the browser repaints everything. Users see styled content flash blank and reappear.
            hydrateRoot attaches React to the existing SSR DOM without touching it. No repaint, no flash.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">What it is not</p>
          <div className="feature-grid">
            <div className="feature">
              <p className="feature-icon">✗ not edge SSR</p>
              <p className="feature-desc">This is build-time prerender. Routes are rendered once at deploy time, not per-request. Per-request SSR requires a different architecture entirely.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">✗ not a framework</p>
              <p className="feature-desc">No opinions about your component structure, styling, or state management. Drop it into any Vite + React app. Two scripts, one config file.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">✗ not Remix / Astro</p>
              <p className="feature-desc">If you need streaming, nested layouts, loaders, or server actions -- use a proper framework. This is for SPAs that want better SEO without the migration cost.</p>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <Link to="/use" className="btn btn-primary">Ready to integrate →</Link>
          </div>
        </div>
      </section>
    </>
  )
}
