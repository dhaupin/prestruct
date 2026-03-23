import usePageMeta from '../hooks/usePageMeta.js'

const SITE_URL = 'https://cf-seo-ssr-example.pages.dev'
const GITHUB   = 'https://github.com/dhaupin/cf-seo-ssr'

export default function Use() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/use',
    title:       'Use it | cf-seo-ssr',
    description: 'How to integrate cf-seo-ssr into your Vite + React app. Copy three files, write a config, update your build script.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">Use it</p>
          <h1 className="page-heading fade-up delay-1">Integrate in minutes.</h1>
          <p className="page-sub fade-up delay-2">
            Copy three files, write a config, update your build script.
            Works with any existing Vite + React + React Router v6 app on Cloudflare Pages.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Requirements</p>
          <div className="feature-grid">
            <div className="feature">
              <p className="feature-icon">stack</p>
              <p className="feature-desc">Vite 5+, React 18+, React Router v6, Cloudflare Pages, Node 18+</p>
            </div>
            <div className="feature">
              <p className="feature-icon">time</p>
              <p className="feature-desc">~15 minutes for a simple app. The AppLayout refactor is the only structural change required.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Quick start</p>
          <div className="quickstart">

            <div className="qs-block">
              <p className="qs-label">1. Copy the engine files</p>
              <pre><code>{`# from the cf-seo-ssr repo
cp scripts/prerender.js               your-app/scripts/
cp scripts/inject-brand.js            your-app/scripts/
cp templates/src/hooks/usePageMeta.js your-app/src/hooks/`}</code></pre>
            </div>

            <div className="qs-block">
              <p className="qs-label">2. Create ssr.config.js in your project root</p>
              <pre><code>{`export default {
  siteUrl:       'https://yoursite.com',
  siteName:      'Your Site',
  author:        'Your Org',
  tagline:       'Your tagline.',
  ogImage:       'https://yoursite.com/og-image.jpg',
  keywords:      'keyword one, keyword two',
  appLayoutPath: '/src/AppLayout.jsx',

  routes: [
    {
      path: '/', priority: '1.0', changefreq: 'weekly',
      meta: {
        title:       'Your Site | Your tagline.',
        description: 'Homepage description.',
      },
    },
    // one entry per route
  ],

  buildJsonLd() {
    return [{ '@context': 'https://schema.org', '@type': 'Organization', ... }]
  },
}`}</code></pre>
            </div>

            <div className="qs-block">
              <p className="qs-label">3. Extract AppLayout from App.jsx</p>
              <div className="callout">
                <strong>Critical:</strong> AppLayout must never import BrowserRouter -- anywhere in its module graph.
                If it does, every route prerenders as <code>/</code>. See <a href="/about">About</a> for why.
              </div>
              <pre><code>{`// AppLayout.jsx -- NO BrowserRouter, ever
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Nav from './components/Nav'
import Home from './pages/Home'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function AppLayout() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </>
  )
}

// App.jsx -- BrowserRouter lives ONLY here
import { BrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
export default function App() {
  return <BrowserRouter><AppLayout /></BrowserRouter>
}`}</code></pre>
            </div>

            <div className="qs-block">
              <p className="qs-label">4. Add usePageMeta to each page</p>
              <pre><code>{`import usePageMeta from '../hooks/usePageMeta.js'

export default function About() {
  usePageMeta({
    siteUrl:     'https://yoursite.com',
    path:        '/about',
    title:       'About | Your Site',
    description: 'About page description.',
  })
  // ...
}`}</code></pre>
            </div>

            <div className="qs-block">
              <p className="qs-label">5. Update main.jsx</p>
              <pre><code>{`const root = document.getElementById('root')

if (root && root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else if (root) {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}`}</code></pre>
            </div>

            <div className="qs-block">
              <p className="qs-label">6. Update package.json build script</p>
              <pre><code>{`"build": "vite build && node scripts/inject-brand.js && node scripts/prerender.js"`}</code></pre>
            </div>

            <div className="qs-block">
              <p className="qs-label">7. Remove the SPA fallback from public/_redirects</p>
              <div className="callout">
                <strong>Remove</strong> <code>/* /index.html 200</code> from <code>_redirects</code>.
                With prerendering, every route has its own HTML file. The SPA fallback causes
                an infinite redirect loop with CF Pages.
              </div>
            </div>

          </div>

          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={GITHUB} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              View full source →
            </a>
            <a href={`${GITHUB}/blob/main/AGENTS.md`} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
              Read AGENTS.md
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
