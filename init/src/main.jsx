/**
 * src/main.jsx
 * ============
 * TEMPLATE FILE -- copy as-is or adjust StrictMode to taste.
 *
 * Uses hydrateRoot when dist/index.html contains SSR-rendered content
 * (data-server-rendered="true" on #root), createRoot otherwise.
 *
 * Without this, the browser throws away SSR HTML and re-renders from
 * scratch, causing a flash of unstyled content (FOUC) on every page load.
 *
 * Do NOT import BrowserRouter here. It belongs in App.jsx.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const root = document.getElementById('root')

if (root && root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else if (root) {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}
