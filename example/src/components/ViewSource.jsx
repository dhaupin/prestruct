/**
 * ViewSource.jsx
 * Shows the actual prerendered HTML head tags for the current route.
 * Fetches view-source of the current page and parses the <head> section,
 * demonstrating that prestruct bakes real meta into the HTML at build time.
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://prestruct.creadev.org'

// Tags we want to surface -- in display order
const TAG_PATTERNS = [
  { label: 'title',       re: /<title>([^<]+)<\/title>/,                              render: (m) => `<title>${m[1]}</title>` },
  { label: 'description', re: /<meta\s+name="description"\s+content="([^"]+)"/,       render: (m) => `<meta name="description" content="${m[1]}" />` },
  { label: 'canonical',   re: /<link\s+rel="canonical"\s+href="([^"]+)"/,             render: (m) => `<link rel="canonical" href="${m[1]}" />` },
  { label: 'og:url',      re: /<meta\s+property="og:url"\s+content="([^"]+)"/,        render: (m) => `<meta property="og:url" content="${m[1]}" />` },
  { label: 'og:title',    re: /<meta\s+property="og:title"\s+content="([^"]+)"/,      render: (m) => `<meta property="og:title" content="${m[1]}" />` },
  { label: 'og:desc',     re: /<meta\s+property="og:description"\s+content="([^"]+)"/, render: (m) => `<meta property="og:description" content="${m[1]}" />` },
  { label: 'og:image',    re: /<meta\s+property="og:image"\s+content="([^"]+)"/,      render: (m) => `<meta property="og:image" content="${m[1]}" />` },
  { label: 'twitter',     re: /<meta\s+name="twitter:title"\s+content="([^"]+)"/,     render: (m) => `<meta name="twitter:title" content="${m[1]}" />` },
  { label: 'json-ld',     re: /<script\s+type="application\/ld\+json">([\s\S]+?)<\/script>/, render: (m) => `<script type="application/ld+json">${m[1].trim().slice(0, 120)}...</script>` },
]

function highlight(line) {
  // Simple syntax highlight: tags, attrs, values
  return line
    .replace(/(&lt;\/?[\w:]+)(\s|&gt;|\/&gt;)/g, '<span class="t">$1</span>$2')
    .replace(/(\s[\w:-]+)(=)/g, ' <span class="a">$1</span>=')
    .replace(/("([^"]*)")/g, '<span class="v">$1</span>')
}

export default function ViewSource() {
  const { pathname } = useLocation()
  const [lines, setLines] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLines(null)
    setError(false)
    const url = `${SITE_URL}${pathname === '/' ? '' : pathname}`

    fetch(url)
      .then(r => r.text())
      .then(html => {
        const found = []
        for (const pat of TAG_PATTERNS) {
          const m = html.match(pat.re)
          if (m) found.push(pat.render(m))
        }
        setLines(found.length ? found : null)
      })
      .catch(() => setError(true))
  }, [pathname])

  const routeLabel = pathname === '/' ? '/' : pathname

  return (
    <div className="vsw">
      <div className="vsw-bar">
        <span className="vsw-title">view-source (live)</span>
        <span className="vsw-route">{SITE_URL}{routeLabel}</span>
      </div>
      <div className="vsw-body">
        {!lines && !error && (
          <p className="vsw-loading">fetching...</p>
        )}
        {error && (
          <p className="vsw-loading">Could not fetch. Open view-source:{SITE_URL}{routeLabel} directly.</p>
        )}
        {lines && lines.map((line, i) => (
          <p
            key={i}
            className="vsw-line"
            dangerouslySetInnerHTML={{ __html: highlight(line.replace(/</g, '&lt;').replace(/>/g, '&gt;')) }}
          />
        ))}
      </div>
    </div>
  )
}
