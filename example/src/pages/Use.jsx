import usePageMeta from '../hooks/usePageMeta.js'

const SITE_URL = 'https://prestruct.creadev.org'
const GITHUB   = 'https://github.com/dhaupin/prestruct'

export default function Use() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/use',
    title:       'Use it | prestruct',
    description: 'Add SEO prerendering to your Vite + React app in minutes. Copy three files, write ssr.config.js, update your build script.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">Use it</p>
          <h1 className="page-heading fade-up delay-1">Add SEO in minutes.</h1>
          <p className="page-sub fade-up delay-2">
            Works with any existing Vite + React + React Router v6 app on Cloudflare Pages.
            The only structural change is extracting AppLayout from App.jsx.
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
              <p className="feature-desc">~15 minutes. The AppLayout extraction is the only structural change. Everything else is additive.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">build cost</p>
              <p className="feature-desc">~2 seconds added to build time for a typical 3-10 route app. Scales linearly with route count.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Integration steps</p>
          <div className="quickstart">

            <div className="qs-block">
              <p className="qs-label">1. Copy the engine files into your app</p>
              <pre><code>{`# from the prestruct repo
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
  tagline:       'What your site does.',
  ogImage:       'https://yoursite.com/og-image.jpg',
  keywords:      'keyword one, keyword two',
  appLayoutPath: '/src/AppLayout.jsx',

  routes: [
    {
      path: '/', priority: '1.0', changefreq: 'weekly',
      meta: {
        title:       'Your Site | What your site does.',
        description: 'Homepage description, 50-160 chars.',
      },
    },
    {
      path: '/about', priority: '0.8', changefreq: 'monthly',
      meta: {
        title:       'About | Your Site',
        description: 'About page description.',
      },
    },
    // one entry per route -- unlisted routes won't be prerendered
  ],

  // schema.org JSON-LD -- injected into every page <head>
  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type':    'Organization',
        name:       'Your Org',
        url:        'https://yoursite.com',
      },
    ]
  },
}`}</code></pre>
              <div className="callout" style={{ marginTop: '1rem' }}>
                <strong>Apostrophe rule:</strong> use double quotes for any string containing a contraction.
                <code>"We're open Mon-Fri"</code> works. <code>'We\'re open Mon-Fri'</code> breaks the parser.
              </div>
            </div>

            <div className="qs-block">
              <p className="qs-label">3. Extract AppLayout from App.jsx</p>
              <div className="callout">
                <strong>Critical:</strong> AppLayout must never import BrowserRouter -- anywhere in its module graph.
                BrowserRouter initializing at SSR time causes every route to prerender as <code>/</code>. See <a href="/about">how it works</a>.
              </div>
              <pre><code>{`// src/AppLayout.jsx -- NO BrowserRouter, ever
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

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
        <Route path="/"      element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*"      element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  )
}

// src/App.jsx -- BrowserRouter lives ONLY here
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
  // rest of your component
}`}</code></pre>
              <p className="qs-label" style={{ marginTop: '1rem' }}>Tip: wrap it to avoid repeating siteUrl</p>
              <pre><code>{`// src/hooks/useMeta.js
import usePageMeta from './usePageMeta.js'
const SITE = 'https://yoursite.com'
export default (args) => usePageMeta({ siteUrl: SITE, ...args })`}</code></pre>
            </div>

            <div className="qs-block">
              <p className="qs-label">5. Update main.jsx -- use hydrateRoot for SSR content</p>
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
              <p className="qs-label">7. Remove SPA fallback from public/_redirects</p>
              <div className="callout">
                <strong>Remove</strong> <code>/* /index.html 200</code> if it exists.
                prestruct gives every route its own HTML file -- the SPA fallback creates
                an infinite redirect loop with Cloudflare Pages' Pretty URLs feature.
              </div>
            </div>

            <div className="qs-block">
              <p className="qs-label">8. Guard any localStorage / window access</p>
              <pre><code>{`// Wrong -- throws in Node during prerender
const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

// Correct -- SSR-safe
const [theme, setTheme] = useState(() => {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem('theme') || 'dark'
})`}</code></pre>
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
