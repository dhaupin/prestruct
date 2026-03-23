import usePageMeta from '../hooks/usePageMeta.js'

const SITE_URL = 'https://cf-seo-ssr-example.pages.dev'

export default function Contact() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/contact',
    title:       'Contact | cf-seo-ssr example',
    description: 'Contact page for the cf-seo-ssr example app. Demonstrates per-route meta injection on a simple contact page.',
  })

  return (
    <div>
      <p className="page-eyebrow">Contact</p>
      <h1 className="page-heading">This page has its<br />own prerendered HTML.</h1>
      <p className="page-body">
        Check <code>view-source:{SITE_URL}/contact</code> -- you will see a fully
        populated <code>&lt;title&gt;</code>, <code>meta[description]</code>,
        og:title, og:description, og:url, and canonical all pointing to this
        specific route.
      </p>
      <p className="page-body">
        None of that required JavaScript to produce. It was written to
        <code>dist/contact/index.html</code> at build time by prerender.js.
      </p>

      <div className="card">
        <p className="card-label">This page's canonical</p>
        <p className="card-value">{SITE_URL}/contact</p>
      </div>
    </div>
  )
}
