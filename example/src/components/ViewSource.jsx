/**
 * ViewSource.jsx
 * Fetches the live prerendered HTML for the current route, extracts
 * the key head meta tags, and renders them as a structured code block.
 * Uses React elements for syntax colouring -- no dangerouslySetInnerHTML,
 * no regex fighting with already-injected spans.
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import CodeBlock from './CodeBlock.jsx'

const SITE_URL = 'https://prestruct.creadev.org'

// Tags to extract from the fetched HTML, in display order
const EXTRACTORS = [
  {
    re: /<title>([^<]+)<\/title>/,
    build: (m) => `<title>${m[1]}</title>`,
  },
  {
    re: /<meta\s+name="description"\s+content="([^"]+)"/,
    build: (m) => `<meta name="description" content="${m[1]}" />`,
  },
  {
    re: /<link\s+rel="canonical"\s+href="([^"]+)"/,
    build: (m) => `<link rel="canonical" href="${m[1]}" />`,
  },
  {
    re: /<meta\s+property="og:url"\s+content="([^"]+)"/,
    build: (m) => `<meta property="og:url" content="${m[1]}" />`,
  },
  {
    re: /<meta\s+property="og:title"\s+content="([^"]+)"/,
    build: (m) => `<meta property="og:title" content="${m[1]}" />`,
  },
  {
    re: /<meta\s+property="og:description"\s+content="([^"]+)"/,
    build: (m) => `<meta property="og:description" content="${m[1]}" />`,
  },
  {
    re: /<meta\s+property="og:image"\s+content="([^"]+)"/,
    build: (m) => `<meta property="og:image" content="${m[1]}" />`,
  },
  {
    re: /<meta\s+name="twitter:title"\s+content="([^"]+)"/,
    build: (m) => `<meta name="twitter:title" content="${m[1]}" />`,
  },
  {
    re: /<script\s+type="application\/ld\+json">([\s\S]+?)<\/script>/,
    build: (m) => `<script type="application/ld+json">\n${m[1].trim()}\n</script>`,
  },
]

export default function ViewSource() {
  const { pathname } = useLocation()
  const [code, setCode]   = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setCode(null)
    setError(false)

    const url = `${SITE_URL}${pathname === '/' ? '' : pathname}`

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text() })
      .then(html => {
        const lines = []
        for (const ex of EXTRACTORS) {
          const m = html.match(ex.re)
          if (m) lines.push(ex.build(m))
        }
        setCode(lines.length ? lines.join('\n') : null)
      })
      .catch(() => setError(true))
  }, [pathname])

  const routeLabel = pathname === '/' ? '/' : pathname

  return (
    <div className="vsw">
      <div className="vsw-bar">
        <span className="vsw-title">live head tags</span>
        <span className="vsw-route">{SITE_URL}{routeLabel}</span>
      </div>
      <div className="vsw-body">
        {!code && !error && <p className="vsw-loading">fetching...</p>}
        {error && (
          <p className="vsw-loading">
            Could not fetch. View source directly: view-source:{SITE_URL}{routeLabel}
          </p>
        )}
        {code && <CodeBlock lang="html">{code}</CodeBlock>}
      </div>
    </div>
  )
}
