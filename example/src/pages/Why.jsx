import usePageMeta from '../hooks/usePageMeta.js'
import * as rrdNS from 'react-router-dom'
// Namespace form: v7 ships CJS and vite SSR rejects named imports from it.
const rrd = rrdNS.default ?? rrdNS
const { Link } = rrd

const SITE_URL = 'https://prestruct.creadev.org'
const DOCS = 'https://docs.creadev.org/prestruct'

export default function Why() {
  usePageMeta({
    siteUrl: SITE_URL,
    path: '/why',
    title: 'Why | Prestruct',
    description: 'A Vite + React app ships an empty HTML shell, so crawlers and unfurlers see nothing. Why prerendering the real routes is the fix, and what it does not change.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">Why</p>
          <h1 className="page-heading fade-up delay-1">Ship HTML, not a shell.</h1>
          <p className="page-sub fade-up delay-2">
            A Vite + React app builds one <code>index.html</code> with an empty
            root. The browser fills it in; a crawler or a link unfurler does not
            wait around to find out.
          </p>
          <div className="u-mt-2 fade-up delay-3">
            <Link to="/what" className="btn btn-primary">What prestruct does</Link>
            <a href={`${DOCS}/guides/architecture`} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">Read the architecture</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">The problem</p>
          <p className="feature-desc">
            Client-side React renders after the JavaScript loads. Until then the
            HTML is a shell with no title, no description, no Open Graph tags,
            and no content. Search engines index the empty version, and chat and
            social unfurlers show a blank card. The site works for a human with
            a fast connection and fails for everything that reads the HTML.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">The thesis</p>
          <p className="feature-desc">
            Prerender the real routes at build time. Run the app through the
            same React components, capture the HTML per route, and stamp the
            head tags that route needs. The crawler gets real HTML; the human
            gets the same React app, hydrated over the HTML that was already
            there. No second framework, no rewrite - two Node scripts after{' '}
            <code>vite build</code>.
          </p>
          <div className="callout">
            <strong>The invariant: the page the crawler indexed is the page the browser paints</strong>
            <p>
              Because the prerender runs the same <code>AppLayout</code> the
              client runs, and the client hydrates over that HTML instead of
              replacing it, there is no second source of truth. A route that
              renders one way for the crawler and another for the browser would
              be a bug, and the build makes that shape impossible.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Who it is for</p>
          <p className="feature-desc">
            Teams on Vite + React + React Router who want real SEO and real
            unfurls without moving to a full SSR framework; and anyone on
            Cloudflare Pages who wants static files and no runtime server.
          </p>
        </div>
      </section>
    </>
  )
}
