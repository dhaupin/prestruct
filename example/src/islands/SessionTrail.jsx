/**
 * src/islands/SessionTrail.jsx
 * ============================
 * Dynamic island -- runs only in the browser, never during SSR prerender.
 *
 * Displays pages visited this session using sessionStorage. Recording happens
 * in AppLayout's ScrollToTop on every route change, so all pages are tracked
 * regardless of whether this island is mounted. This component only reads
 * and renders the trail.
 *
 * Load strategy: idle (data-pre-load="idle" in the HTML)
 */

import { useState, useEffect } from 'react'

const TRAIL_KEY = 'pre-trail'

const LABELS = {
  '/':        'Home',
  '/about':   'How it works',
  '/deploy':  'Deploy',
  '/islands': 'Dynamic islands',
}

function getTrail() {
  try {
    return JSON.parse(sessionStorage.getItem(TRAIL_KEY) || '[]')
  } catch {
    return []
  }
}

export default function SessionTrail() {
  const [trail, setTrail] = useState([])

  useEffect(() => {
    setTrail(getTrail())
  }, [])

  if (!trail.length) return null

  return (
    <div className="trail-island">
      <p className="trail-label">pages seen this session</p>
      <div className="trail-items">
        {trail.map((path) => (
          <a key={path} href={path} className="trail-item">
            <span className="trail-path">{LABELS[path] ?? path}</span>
            <span className="trail-url">{path}</span>
          </a>
        ))}
      </div>
      <p className="trail-note">
        This widget loaded after hydration via a{' '}
        <code>{'<pre-island data-pre-load="idle">'}</code> placeholder.
        The prerendered HTML for this page contains none of this data.
        Crawlers see the fallback text. You see your session.
      </p>
    </div>
  )
}
