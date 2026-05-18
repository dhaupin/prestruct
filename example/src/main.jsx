/**
 * src/main.jsx
 * ============
 * TEMPLATE FILE -- copy as-is or adjust StrictMode to taste.
 *
 * Responsibilities:
 *   1. Hydrate the prerendered SSR HTML (hydrateRoot) or do a fresh render
 *      (createRoot) depending on whether SSR content is present.
 *
 * hydrateRoot vs createRoot:
 *   hydrateRoot attaches React's event system to existing SSR DOM without
 *   replacing it. Use it when dist/index.html contains prerendered content
 *   (data-server-rendered="true" on #root). Without it, the browser discards
 *   the SSR HTML and re-renders from scratch, causing FOUC on every page load.
 *
 * Islands:
 *   mountIslands() is called inside AppLayout on every route change (including
 *   the initial render). This ensures islands are mounted whether the page was
 *   reached by a hard load or SPA navigation. The engine tracks already-mounted
 *   elements with a WeakSet so repeated calls are safe.
 *
 * Do NOT import BrowserRouter here. It belongs in App.jsx.
 */

import React    from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const root = document.getElementById('root')

if (root && root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else if (root) {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}
