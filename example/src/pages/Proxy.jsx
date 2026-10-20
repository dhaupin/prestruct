import usePageMeta from '../hooks/usePageMeta.js'
import { Link } from 'react-router-dom'
import CodeBlock from '../components/CodeBlock.jsx'
import { Accordion, AccordionItem } from '../components/Accordion.jsx'

const SITE_URL = 'https://prestruct.creadev.org'
const GITHUB   = 'https://github.com/dhaupin/prestruct'

export default function Proxy() {
  usePageMeta({
    siteUrl:     SITE_URL,
    path:        '/proxy',
    title:       'Bot proxy | Prestruct',
    description: 'Serve fresh content to bots without edge SSR. Prestruct proxy renders dynamic pages to static HTML for search crawlers.',
  })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1 className="page-heading fade-up">Bot proxy for dynamic routes.</h1>
          <p className="page-sub fade-up delay-1">
            Serve fresh content to search bots without edge SSR.
            Prerender covers static routes. The proxy renders dynamic pages on request.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-1)' }}>
        <div className="container">
          <p className="section-label">Why proxy?</p>
          <div className="benefit-grid">
            <div className="benefit">
              <p className="benefit-num">01</p>
              <p className="benefit-title">Build-time misses</p>
              <p className="benefit-desc">
                Paginated routes, search results, dated content - too many URLs to prerender. Proxy renders on-request.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">02</p>
              <p className="benefit-title">Freshness</p>
              <p className="benefit-desc">
                Content changed since last build? Proxy re-renders and caches. Bots see current pages.
              </p>
            </div>
            <div className="benefit">
              <p className="benefit-num">03</p>
              <p className="benefit-title">Bots only</p>
              <p className="benefit-desc">
                Humans get static HTML from prerender. Only bots hitting uncached dynamic URLs hit proxy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">How it works</p>
          <CodeBlock lang="sh" label="sh">
{`# Bot hits /blog/page/5
# Not prerendered? → Proxy renders

# 1. Detect bot from the User-Agent (config.proxy.botList)
# 2. Humans: 302 redirect to the live site -- they never reach the proxy
# 3. Bots: render targetUrl with Puppeteer (VPS) / Browser Rendering (Worker)
# 4. Cache the HTML (disk on VPS, KV on the Worker) and serve it

# Render responses self-describe: X-Prestruct-Cache: HIT|MISS and
# X-Prestruct-Rendered-At. Concurrency is bounded (5 parallel renders).

# Config in ssr.config.js (the build only uses proxy.url to widen CSP)
proxy: {
  url: 'https://my-proxy.example.com',
  botList: ['googlebot', 'bingbot', 'claudebot'],
}
# TTLs live on the proxy host, not here:
#   VPS: CACHE_TTL constant in scripts/proxy.js (24h)
#   Worker: CACHE_TTL_SECONDS var in wrangler.toml (default 86400)`}
          </CodeBlock>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-1)' }}>
        <div className="container">
          <p className="section-label">Implementation</p>
          <Accordion>
            <AccordionItem q="VPS (Node + Puppeteer)">
              <p>Use <code>scripts/proxy.js</code>. Runs Express with Puppeteer. Works on any VPS with Node 18+.</p>
            </AccordionItem>
            <AccordionItem q="Cloudflare Worker">
              <p>Use <code>scripts/proxy.worker.js</code> with Browser Rendering API. Requires Workers Paid plan.</p>
            </AccordionItem>
            <AccordionItem q="Cache refresh">
              <p>GET the target path with an <code>x-prestruct-refresh</code> header matching <code>PRESTRUCT_SECRET</code> (env var on the proxy host) to bust the cache for that path. With no secret set, refresh is disabled entirely -- unset never means allow-all.</p>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Enable proxy</p>
          <CodeBlock lang="js" label="ssr.config.js">
{`export default {
  routes: [...],
  proxy: {
    url: 'https://your-proxy.workers.dev',
    // or null to disable
    botList: ['googlebot', 'bingbot', 'claudebot', 'perplexitybot'],
    // targetUrl: only when the proxy renders a different origin
    // (staging, localhost, WordPress origin). Defaults to siteUrl.
  },
}`}
          </CodeBlock>
        </div>
      </section>
    </>
  )
}