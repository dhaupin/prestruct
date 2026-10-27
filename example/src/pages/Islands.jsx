import usePageMeta from '../hooks/usePageMeta.js'
import CodeBlock from '../components/CodeBlock.jsx'

const SITE_URL = 'https://prestruct.creadev.org'
const GITHUB   = 'https://github.com/dhaupin/prestruct'

export default function Islands() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/islands',
    title:       'Dynamic islands | Prestruct',
    description: 'Punch holes through prerendered HTML for client-only content. Cart widgets, recently viewed, personalization -- served to humans, invisible to crawlers.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-kicker fade-up">Dynamic islands</p>
          <h1 className="page-heading fade-up delay-1">Static HTML.<br /><em>Dynamic Components.</em></h1>
          <p className="page-sub fade-up delay-2">
            Some content shouldn't be in the prerendered HTML: cart state, recently viewed
            products, logged-in user widgets, etc. Islands let you punch those holes through the
            static page and fill them in the browser, after hydration. It's like a window to your app, within a static page.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">The problem islands solve</p>
          <p className="u-section-intro">
            Prerendered HTML is the same for every visitor. That's what makes it fast and
            crawlable. But some content is inherently per-visitor: what's in their cart,
            which pages they've seen, what they've favorited. You can't bake that into
            static HTML at build time.
          </p>

          <div className="compare">
            <div className="compare-row header">
              <div className="compare-cell"></div>
              <div className="compare-cell">Without islands</div>
              <div className="compare-cell">With islands</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">User-specific content</div>
              <div className="compare-cell bad">Skipped or deferred to a full re-render</div>
              <div className="compare-cell good">Mounted into a placeholder after hydration</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Crawler exposure</div>
              <div className="compare-cell bad">Dynamic content leaks into static HTML</div>
              <div className="compare-cell good">Fallback text only. Component never runs at build time</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Load timing</div>
              <div className="compare-cell bad">All or nothing on hydration</div>
              <div className="compare-cell good">eager, visible, or idle per island</div>
            </div>
            <div className="compare-row">
              <div className="compare-cell label">Hydration risk</div>
              <div className="compare-cell bad">Dynamic content causes SSR mismatch</div>
              <div className="compare-cell good">Islands are outside the hydrated tree</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">How it works</p>

          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-body">
                <p className="step-title">Place a {'<pre-island>'} in your JSX</p>
                <p className="step-text">
                  The custom element ships in the prerendered HTML as an inert placeholder.
                  Crawlers see the fallback content inside it. React's{' '}
                  <code>renderToString</code> passes unknown elements through unchanged.
                </p>
                <div className="u-mt-1">
                  <CodeBlock lang="html">{`<pre-island data-pre-island="cart-widget" data-pre-load="visible">
  <span class="island-loading">Loading cart...</span>
</pre-island>`}</CodeBlock>
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-num">02</div>
              <div className="step-body">
                <p className="step-title">Register the component in AppIslands.jsx</p>
                <p className="step-text">
                  One file maps island names to React components. That's the entire
                  registry. No config, no decorators, no build plugin.
                </p>
                <div className="u-mt-1">
                  <CodeBlock lang="js" label="src/AppIslands.jsx">{`import CartWidget from './islands/CartWidget.jsx'

export const islands = {
  'cart-widget': CartWidget,
}`}</CodeBlock>
                </div>
              </div>
            </div>

            <div className="step">
              <div className="step-num">03</div>
              <div className="step-body">
                <p className="step-title">mountIslands() does the rest</p>
                <p className="step-text">
                  Called in <code>main.jsx</code> after <code>hydrateRoot</code>.
                  Scans the DOM for <code>pre-island</code> elements, finds the matching
                  component, and calls <code>ReactDOM.createRoot(el).render()</code> into
                  each one. Each island is its own React root, independent of the main tree.
                </p>
                <div className="u-mt-1">
                  <CodeBlock lang="js" label="src/main.jsx">{`import { mountIslands } from './islands.js'
import { islands }      from './AppIslands.jsx'

// after hydrateRoot / createRoot:
mountIslands(islands)`}</CodeBlock>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Load strategies</p>
          <p className="u-section-intro">
            The <code>data-pre-load</code> attribute controls when each island mounts.
            Match the strategy to the priority of the content.
          </p>
          <div className="feature-grid">
            <div className="feature">
              <p className="feature-icon">eager</p>
              <h3 className="feature-title">Immediate</h3>
              <p className="feature-desc">
                Default. Mounts right after <code>mountIslands()</code> runs.
                Use for above-the-fold widgets that need to be interactive quickly.
              </p>
            </div>
            <div className="feature">
              <p className="feature-icon">visible</p>
              <h3 className="feature-title">On scroll</h3>
              <p className="feature-desc">
                Mounts when the element enters the viewport via{' '}
                <code>IntersectionObserver</code>. Use for below-the-fold content that
                isn't needed until the user reaches it.
              </p>
            </div>
            <div className="feature">
              <p className="feature-icon">idle</p>
              <h3 className="feature-title">Background</h3>
              <p className="feature-desc">
                Mounts via <code>requestIdleCallback</code> during browser downtime.
                Use for low-priority widgets that shouldn't compete with
                paint or interaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Live demo · visible</p>
          <p className="u-section-intro">
            The widget below is a <code>pre-island</code> with{' '}
            <code>data-pre-load="visible"</code>. It did not mount when this page
            loaded -- it waits for <code>IntersectionObserver</code> to report it in
            your viewport (threshold 0.1). Scroll it into view and it mounts.
            The eager strategy is live on <code>/contact</code>; the idle demo is
            the section above.
          </p>

          <pre-island data-pre-island="scroll-marker" data-pre-load="visible">
            <p className="island-fallback">Scroll this widget into view to mount it.</p>
          </pre-island>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">What islands can't do</p>
          <div className="callout">
            <strong>Islands don't receive props from the React tree.</strong>
            <p>
              Each island is a separate <code>ReactDOM.createRoot</code>, outside the
              main <code>hydrateRoot</code> tree. React context from the parent app
              doesn't reach them. Pass data via <code>data</code> attributes on the
              element itself, read from <code>localStorage</code>, or fetch from an API.
            </p>
          </div>
          <div className="callout">
            <strong>Island content is invisible to crawlers.</strong>
            <p>
              The component never runs during SSR. Crawlers see the fallback text inside
              the <code>pre-island</code> element. If you need dynamic content indexed,
              prerender it into a dedicated route instead.
            </p>
          </div>
          <div className="callout">
            <strong>Islands are not a replacement for a server.</strong>
            <p>
              They're browser-only. If your dynamic content requires auth, per-request
              data, or database access, you need edge SSR or an API endpoint. Islands
              handle client state, localStorage, and public fetches well. Everything else
              belongs server-side.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Live demo</p>
          <p className="u-section-intro">
            The widget below is a <code>pre-island</code> with{' '}
            <code>data-pre-load="idle"</code>. It tracks which pages you've visited
            this session using <code>sessionStorage</code>. The prerendered HTML for
            this page contains none of this -- a fallback line is what the crawler sees.
            Navigate to a few pages and come back.
          </p>

          <div className="callout u-mb-15">
            Right-click this page and choose <strong>View Page Source</strong> to see the
            raw prerendered HTML. Search for <code>pre-island</code> and you'll find the
            placeholder with the fallback text and nothing else. The session data below
            was never on the server.
          </div>

          <pre-island data-pre-island="session-trail" data-pre-load="idle">
            <p className="island-fallback">Session data loads after hydration.</p>
          </pre-island>

          <div className="u-row u-mt-25">
            <a href={GITHUB} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              View source
            </a>
            <a href={`${GITHUB}/blob/main/init/src/islands.js`} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
              islands.js
            </a>
            <a href="https://docs.creadev.org/prestruct/guides/advanced-islands" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
              Full islands guide
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
