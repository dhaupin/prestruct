/**
 * ToolsBlock.jsx
 * Links to external tools for verifying SEO, schema, and crawl status.
 * URL param is injected per-site -- change SITE_URL to match the deployed domain.
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
    label: 'google',
    name: 'Mobile-friendly test',
    desc: "Checks mobile usability and reports any issues Google's crawler would flag.",
    href: `https://search.google.com/test/mobile-friendly?url=${ENC}`,
  },
  {
    label: 'open graph',
    name: 'OG debugger (Facebook)',
    desc: 'Shows how Facebook and most social platforms will render your og: tags when a link is shared.',
    href: `https://developers.facebook.com/tools/debug/?q=${ENC}`,
  },
  {
    label: 'twitter / x',
    name: 'Card validator',
    desc: 'Validates Twitter/X card meta tags and previews how your link will appear when shared.',
    href: `https://cards-dev.twitter.com/validator`,
  },
  {
    label: 'crawl',
    name: 'Sitemap checker',
    desc: 'Validates sitemap.xml format and checks all URLs are reachable and return 200.',
    href: `https://www.xml-sitemaps.com/validate-xml-sitemap.html?op=validate-xml-sitemap&sitemapUrl=${ENC}/sitemap.xml`,
  },
  {
    label: 'performance',
    name: 'PageSpeed Insights',
    desc: "Google's Lighthouse-based performance and Core Web Vitals audit. Run on mobile and desktop.",
    href: `https://pagespeed.web.dev/report?url=${ENC}`,
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
          <span className="tool-arrow">open tool →</span>
        </a>
      ))}
    </div>
  )
}
