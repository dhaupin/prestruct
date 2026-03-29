/**
 * src/main.jsx
 * ============
 * TEMPLATE FILE -- replace your existing main.jsx with this.
 *
 * Client entry point. Key change from a standard Vite scaffold:
 * uses hydrateRoot when SSR content is present, createRoot otherwise.
 *
 * Why this matters:
 *   createRoot replaces the entire DOM, causing a repaint even when SSR HTML
 *   is identical to what React would render -- visible as a flash (FOUC).
 *   hydrateRoot attaches React to the existing SSR DOM without replacing it.
 *   No repaint, no flash.
 *
 * The data-server-rendered attribute is written by prerender.js on the root div.
 * When absent (no prerendered content), createRoot handles it normally.
 *
 * Hydration mismatch requirements -- SSR and client must produce identical output:
 *   - No window/document/localStorage access at render time (use typeof window guard)
 *   - No inline <style> tags in JSX (use external .css files or style={{}} props)
 *   - suppressHydrationWarning on elements that differ between SSR and client
 *     (e.g. new Date().getFullYear(), canvas elements)
 *
 * See AGENTS.md for full details on each mismatch source and fix.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = document.getElementById('root')

if (root && root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(
    root,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
