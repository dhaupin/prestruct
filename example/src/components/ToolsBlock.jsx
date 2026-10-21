import * as rrdNS from 'react-router-dom'
// Namespace form: v7 ships CJS and vite SSR rejects named imports from it;
// the node interop namespace only reliably carries `default`, so destructure
// from whichever side the exports object lives on (v6 is ESM, no default).
const rrd = rrdNS.default ?? rrdNS
const { Link } = rrd

/**
 * ToolsBlock.jsx
 * Links to external tools for verifying SEO, schema, and crawl status.
 * URL param is injected per-site -- change SITE_URL to match the deployed domain.
 *
 * 8 external tools + 1 internal CTA = 9 cards.
 * At 3-col grid width: 3 full rows, no orphan.
 * At 2-col: 4 rows + 1 (CTA spans to fill). At 1-col: stacked.
 */

const SITE_URL = 'https://prestruct.creadev.org'
const ENC = encodeURIComponent(SITE_URL)

const TOOLS = [
  {
    label: 'schema.org',
    name: 'Schema markup validator',
    desc: 'Validates JSON-LD structured data. Checks for errors and warnings in your schema.org output.',
    href: `https://validator.schema.org/#url=${ENC}`,
  },
  {
    label: 'google',
    name: 'Rich results test',
    desc: "Google's tool for checking if your structured data is eligible for rich results in search.",
    href: `https://search.google.com/test/rich-results?url=${ENC}`,
  },
  {
    label: 'html standards',
    name: 'W3C HTML validator',
    desc: 'Checks your prerendered HTML against the W3C spec - catches tag nesting and attribute errors a prerenderer can introduce.',
    href: `https://validator.w3.org/nu/?doc=${ENC}`,
  },
  {
    label: 'open graph',
    name: 'OG debugger (Facebook)',
    desc: 'Shows how Facebook and most social platforms will render your og: tags when a link is shared.',
    href: `https://developers.facebook.com/tools/debug/?q=${ENC}`,
  },
  {
    label: 'social',
    name: 'Social card preview',
    desc: 'Previews how your og: and twitter: card tags render when shared. X retired its official card validator, so social previews live here now.',
    href: `https://metatags.io/?url=${ENC}`,
  },
  {
    label: 'crawl',
    name: 'Sitemap checker',
    desc: 'Validates sitemap.xml format and checks all URLs are reachable and return 200.',
    href: `https://nuxtseo.com/tools/xml-sitemap-validator?url=${ENC}/sitemap.xml`,
  },
  {
    label: 'performance',
    name: 'PageSpeed Insights',
    desc: "Google's Lighthouse-based performance and Core Web Vitals audit. Run on mobile and desktop.",
    href: `https://pagespeed.web.dev/analysis?url=${ENC}`,
  },
  {
    label: 'security',
    name: 'Security headers',
    desc: 'Scans HTTP response headers and grades your CSP, HSTS, and other security policy headers.',
    href: `https://securityheaders.com/?q=${ENC}&followRedirects=on`,
  },
]

export default function ToolsBlock() {
  return (
    <div className="tools-grid">
      {TOOLS.map((t) => (
        <a
          key={t.name}
          href={t.href}
          className="tool-card"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="tool-label">{t.label}</span>
          <span className="tool-name">{t.name}</span>
          <span className="tool-desc">{t.desc}</span>
          <span className="tool-arrow">open tool {'\u2192'}</span>
        </a>
      ))}
      {/* 9th card: fills the orphan slot at 3-col width. Links to next section. */}
      <Link to="/about" className="tool-card tool-card--cta">
        <span className="tool-label">next</span>
        <span className="tool-name">How it works</span>
        <span className="tool-desc">
          See the full build pipeline, caching strategy, and the key architectural
          decisions behind prestruct.
        </span>
        <span className="tool-arrow">read more {'\u2192'}</span>
      </Link>
    </div>
  )
}
