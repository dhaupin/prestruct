import usePageMeta from '../hooks/usePageMeta.js'
import * as rrdNS from 'react-router-dom'
const rrd = rrdNS.default ?? rrdNS
const { Link } = rrd
import CodeBlock from '../components/CodeBlock.jsx'

const SITE_URL = 'https://prestruct.creadev.org'
const DOCS = 'https://docs.creadev.org/prestruct'

export default function What() {
  usePageMeta({
    siteUrl: SITE_URL,
    path: '/what',
    title: 'What | Prestruct',
    description: 'Two Node scripts after vite build: inject-brand stamps the shell, prerender writes each route to its own HTML with per-route head tags, plus 404 and sitemap.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">What</p>
          <h1 className="page-heading fade-up delay-1">Two scripts, real HTML.</h1>
          <p className="page-sub fade-up delay-2">
            prestruct is a build step. It adds two Node scripts that run after{' '}
            <code>vite build</code>, take about two seconds, and leave a{' '}
            <code>dist/</code> that crawlers can read.
          </p>
          <div className="u-mt-2 fade-up delay-3">
            <Link to="/deploy" className="btn btn-primary">Add it in minutes</Link>
            <Link to="/about" className="btn btn-ghost">How it works</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">The build step</p>
          <CodeBlock lang="bash" label="package.json">{`vite build \\
  && node scripts/inject-brand.js \\
  && node scripts/prerender.js`}</CodeBlock>
          <p className="feature-desc u-mt-1">
            <code>inject-brand.js</code> reads <code>ssr.config.js</code> and
            writes the global title, description, Open Graph, Twitter Card, and
            JSON-LD into the shell. <code>prerender.js</code> renders each route
            through <code>AppLayout</code> in a <code>StaticRouter</code>,
            stamps per-route head tags, and writes{' '}
            <code>dist/&lt;route&gt;/index.html</code>, plus <code>404.html</code>{' '}
            and a fresh <code>sitemap.xml</code>.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">What you configure</p>
          <p className="feature-desc">
            One file: <code>ssr.config.js</code>. It carries the site identity
            (URL, name, author, tagline, Open Graph image) and the route list,
            where each route names its path and the head tags it should bake.
            That list is the contract the prerender walks.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">What it does not change</p>
          <p className="feature-desc">
            Your Vite config, your React components, and your client bundle.
            The one structural change is extracting <code>AppLayout</code> from{' '}
            <code>App.jsx</code> so both the client and the prerender can import
            it. <code>BrowserRouter</code> stays in <code>App.jsx</code> only -
            anywhere the prerender loads it, every route renders as the
            homepage.
          </p>
          <div className="u-mt-2">
            <Link to="/about" className="btn btn-ghost">Next: how it works</Link>
            <a href={`${DOCS}/guides/cli`} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">CLI reference</a>
          </div>
        </div>
      </section>
    </>
  )
}
