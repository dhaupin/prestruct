import usePageMeta from '../hooks/usePageMeta.js'
import CodeBlock from '../components/CodeBlock.jsx'

const SITE_URL = 'https://prestruct.creadev.org'
const GITHUB   = 'https://github.com/dhaupin/prestruct'

export default function Deploy() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/deploy',
    title:       'Deploy | Prestruct',
    description: 'Add SEO prerendering to your Vite + React app in minutes. Copy three files, write ssr.config.js, update your build script.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">Deploy</p>
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
              <p className="feature-desc">About 15 minutes. The AppLayout extraction is the only structural change. Everything else is additive.</p>
            </div>
            <div className="feature">
              <p className="feature-icon">build cost</p>
              <p className="feature-desc">About 2 seconds added to build time for a typical 3-10 route app. Scales linearly with route count.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Integration steps</p>
          <div className="quickstart">

            <div className="qs-block">
              <p className="qs-label">1. Add prestruct to your app</p>
              <CodeBlock lang="sh">{`npm i -D prestruct
npx prestruct init   # scaffolds scripts/ + template files, never clobbers
# Dep-free alternative: copy scripts/prerender.js + scripts/inject-brand.js
# and src/hooks/usePageMeta.js out of the repo yourself.`}</CodeBlock>
            </div>

            <div className="qs-block">
              <p className="qs-label">2. Create ssr.config.js in your project root</p>
              <CodeBlock lang="js" label="ssr.config.js">{`export default {
  siteUrl:       'https://yoursite.com',
  siteName:      'Your Site',
  author:        'Your Org',
  tagline:       'What your site does.',
  ogImage:       'https://yoursite.com/og-image.jpg',
  keywords:      'keyword one, keyword two',
  appLayoutPath: '/src/AppLayout.jsx',
  // optional render proxy (see step 7); auth is the PRESTRUCT_SECRET env var

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
  ],

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
}`}</CodeBlock>
              <div className="callout u-mt-1">
                <strong>Apostrophe rule:</strong> use double quotes for strings containing a contraction.{' '}
                <code>"We're open Mon-Fri"</code> works. <code>{'\'We\\\'re open Mon-Fri\''}</code> breaks the parser.
              </div>
            </div>

            <div className="qs-block">
              <p className="qs-label">3. Extract AppLayout from App.jsx</p>
              <div className="callout u-mb-1">
                <strong>Critical:</strong> AppLayout must never import BrowserRouter, anywhere in its module graph.
                BrowserRouter initializing at SSR time causes every route to prerender as <code>/</code>.{' '}
                See <a href="/about">how it works</a>.
              </div>
              <CodeBlock lang="js" label="src/AppLayout.jsx">{`// NO BrowserRouter here, ever
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
}`}</CodeBlock>
              <CodeBlock lang="js" label="src/App.jsx">{`// BrowserRouter lives ONLY here
import { BrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
export default function App() {
  return <BrowserRouter><AppLayout /></BrowserRouter>
}`}</CodeBlock>
            </div>

            <div className="qs-block">
              <p className="qs-label">4. Add usePageMeta to each page</p>
              <CodeBlock lang="js">{`import usePageMeta from '../hooks/usePageMeta.js'

export default function About() {
  usePageMeta({
    siteUrl:     'https://yoursite.com',
    path:        '/about',
    title:       'About | Your Site',
    description: 'About page description.',
  })
}`}</CodeBlock>
              <p className="u-tip-label">Tip: wrap it to avoid repeating siteUrl</p>
              <CodeBlock lang="js" label="src/hooks/useMeta.js">{`import usePageMeta from './usePageMeta.js'
const SITE = 'https://yoursite.com'
export default (args) => usePageMeta({ siteUrl: SITE, ...args })`}</CodeBlock>
            </div>

            <div className="qs-block">
              <p className="qs-label">5. Update main.jsx: use hydrateRoot for SSR content</p>
              <CodeBlock lang="js">{`const root = document.getElementById('root')
if (root && root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else if (root) {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}`}</CodeBlock>
            </div>

            <div className="qs-block">
              <p className="qs-label">6. Update package.json build script</p>
              <CodeBlock lang="js" label="package.json">{`"build": "vite build && node scripts/inject-brand.js && node scripts/prerender.js"`}</CodeBlock>
            </div>

            <div className="qs-block">
              <p className="qs-label">7. Optional: enable the render proxy for dynamic bot routes</p>
              <div className="callout u-mb-1">
                Keep build-time prerendering for static routes, then add the proxy to cover routes not listed in
                <code> ssr.config.js</code> (search pages, pagination, dynamic IDs, recently changed content).
                Humans still get your normal Cloudflare Pages site.
              </div>
              <CodeBlock lang="js" label="ssr.config.js (proxy block)">{`proxy: {
  url:       'https://proxy.yoursite.com', // VPS or Worker URL
  targetUrl: null,                         // defaults to siteUrl
  botList:   ['Googlebot', 'bingbot'],
}
// Cache-refresh auth is the PRESTRUCT_SECRET env var on the proxy host,
// never a config key. Unset secret = refresh disabled entirely.`}</CodeBlock>
              <p className="u-tip-label">
                Use <code>scripts/proxy.js</code> for VPS or <code>scripts/proxy.worker.js</code> for Cloudflare Workers.
                Full setup: <a href={`${GITHUB}/blob/main/README-proxy.md`} target="_blank" rel="noopener noreferrer">README-proxy.md</a>.
              </p>
            </div>

            <div className="qs-block">
              <p className="qs-label">8. Remove SPA fallback from public/_redirects</p>
              <div className="callout">
                Remove <code>{'/* /index.html 200'}</code> if present.
                Prestruct gives every route its own HTML file. The SPA fallback creates
                an infinite redirect loop with Cloudflare Pages' Pretty URLs feature.
              </div>
            </div>

            <div className="qs-block">
              <p className="qs-label">9. Guard any localStorage / window access</p>
              <CodeBlock lang="js">{`// Wrong: throws in Node during prerender
const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

// Correct: SSR-safe
const [theme, setTheme] = useState(() => {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem('theme') || 'dark'
})`}</CodeBlock>
            </div>

          </div>

          <div className="u-row u-mt-25">
            <a href={GITHUB} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              View full source
            </a>
            <a href={`${GITHUB}/blob/main/AGENTS.md`} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
              Read AGENTS.md
            </a>
            <a href={`${GITHUB}/blob/main/SCOPE.md`} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
              Read SCOPE.md
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
