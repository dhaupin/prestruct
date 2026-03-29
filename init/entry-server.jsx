/**
 * src/entry-server.jsx
 * ====================
 * TEMPLATE FILE -- copy once, minimal edits needed.
 *
 * SSR render entry point. Used at build time by scripts/prerender.js.
 * Wraps AppLayout in StaticRouter so each route renders its own content.
 *
 * Importing AppLayout (not App) is critical -- App also imports BrowserRouter,
 * which would override the StaticRouter location context. See AGENTS.md.
 *
 * Note: prerender.js imports AppLayout directly via ssrLoadModule and does not
 * use this file at runtime. entry-server.jsx exists as a reference implementation
 * and for alternative SSR setups that import a render function explicitly.
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
