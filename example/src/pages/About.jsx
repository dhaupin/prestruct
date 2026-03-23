import usePageMeta from '../hooks/usePageMeta.js'

const SITE_URL = 'https://cf-seo-ssr-example.pages.dev'

export default function About() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/about',
    title:       'About | cf-seo-ssr example',
    description: "About the cf-seo-ssr prerender layer. What it does, what it doesn't do, and how it works.",
  })

  return (
    <div>
      <p className="page-eyebrow">About</p>
      <h1 className="page-heading">What cf-seo-ssr does.</h1>
      <p className="page-body">
        After <code>vite build</code> produces the standard <code>dist/</code> output,
        two Node scripts run in sequence:
      </p>
      <p className="page-body">
        <strong>inject-brand.js</strong> reads your <code>ssr.config.js</code> and
        writes the global title, description, Open Graph, Twitter Card, and JSON-LD
        into <code>dist/index.html</code>.
      </p>
      <p className="page-body">
        <strong>prerender.js</strong> spins up a Vite dev server, loads your
        AppLayout via <code>ssrLoadModule</code>, renders each route with
        <code>StaticRouter</code>, injects per-route meta, and writes the HTML
        files. It also generates <code>sitemap.xml</code> and <code>404.html</code>.
      </p>

      <div className="card">
        <p className="card-label">What it is not</p>
        <p className="card-value">
          Not a framework. Not edge SSR. Not a competitor to Remix or Astro.
          Just ~200 lines of readable Node that run at build time.
        </p>
      </div>
    </div>
  )
}
