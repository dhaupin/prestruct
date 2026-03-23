/**
 * entry-server.jsx
 * ================
 * SSR render entry point. Used at build time by scripts/prerender.js.
 * Wraps AppLayout in StaticRouter so each route renders its own content.
 *
 * Importing AppLayout.jsx (not App.jsx) is critical — App.jsx also imports
 * BrowserRouter, which initialises with window.location and would override
 * the StaticRouter location context, causing every route to render as '/'.
 */

import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server.js'
import AppLayout from './AppLayout'

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <AppLayout />
    </StaticRouter>
  )
}
