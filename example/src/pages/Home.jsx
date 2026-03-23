import usePageMeta from '../hooks/usePageMeta.js'

const SITE_URL = 'https://cf-seo-ssr-example.pages.dev'

export default function Home() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/',
    title:       'cf-seo-ssr example | Vite + React + CF Pages prerender',
    description: 'A minimal example app showing build-time prerendering for Vite + React on Cloudflare Pages. View source to see baked-in SEO meta.',
  })

  return (
    <div>
      <p className="page-eyebrow">cf-seo-ssr / example</p>
      <h1 className="page-heading">Build-time prerender<br />for Vite + React.</h1>
      <p className="page-body">
        This is the example app for <strong>cf-seo-ssr</strong> -- a thin prerender
        layer that runs after <code>vite build</code> and renders each route to static
        HTML before deploying to Cloudflare Pages.
      </p>
      <p className="page-body">
        Every page on this site has its own <code>index.html</code> with correct
        title, description, Open Graph, canonical, and JSON-LD baked in at build
        time. No JavaScript required for bots or initial paint.
      </p>

      <div className="card">
        <p className="card-label">Try it</p>
        <p className="card-value">view-source:{SITE_URL}</p>
      </div>

      <div className="card">
        <p className="card-label">Navigate to</p>
        <p className="card-value">{SITE_URL}/about &nbsp;&mdash;&nbsp; {SITE_URL}/contact</p>
      </div>
    </div>
  )
}
