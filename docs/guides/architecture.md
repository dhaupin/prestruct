---
layout: default
title: Architecture
description: "How prestruct works internally: the ssrLoadModule pipeline, the engine single source, and generated copies."
nav_order: 5
version: 1.0.0
permalink: /guides/architecture
---


Understanding how prestruct works under the hood.

## Overview

Prestruct is a **build-time prerenderer** for React/Vite apps. It renders each route to static HTML once during the build process, then serves those files from a CDN (Cloudflare Pages).

```text
Build Time                          Runtime
-------------                       -------
,,--------------------            ,,--------------------
|  vite build         |            |  CDN serves         |
|  (JS bundles)       |            |  static HTML        |
`----------+----------            `----------+----------
           |                                  |
           v                                  |
,,--------------------                       |
|  inject-brand.js    |                       |
|  (global meta)      |                       |
`----------+----------                       |
           |                                  |
           v                                  v
,,--------------------            ,,--------------------
|  prerender.js       |            |  Browser hydrates   |
|  (per-route HTML)   |----------->|  (SPA navigation)   |
`---------------------            `---------------------
```

## Core Concepts

<!-- FICTION-OK: this section exists to document WHY the compiled-SSR-bundle approach was rejected; the signature appears as a debunked lesson, not current guidance -->
### 1. ssrLoadModule vs vite build --ssr

**Why ssrLoadModule?**

<!-- FICTION-OK: historical first attempt, documented as the failure story -->
Initially, we tried `vite build --ssr` to create a server bundle, then imported it. Every route rendered as the homepage. The issue:

<!-- FICTION-OK: quotes the rejected approach as the root cause of the failure story -->
- `vite build --ssr` and `vite build` produce **separate module instances**
- When prerender imports the SSR bundle, it gets a different `react-router-dom` instance
- `StaticRouter`'s context can't propagate to `Routes` in a different instance

**The solution:** Use `vite.ssrLoadModule()` which loads modules through Vite's unified module registry - same instance for everything:

```js
const vite = await createServer({
  root: ROOT,
  server: { middlewareMode: true },
  appType: 'custom'
})

// Single module instance - StaticRouter and Routes share context
const { default: AppLayout } = await vite.ssrLoadModule('/src/AppLayout.jsx')

const appHtml = renderToString(
  <StaticRouter location={route.path}>
    <AppLayout />
  </StaticRouter>
)
```

---

### 2. BrowserRouter Isolation

The most critical rule: **AppLayout must never import BrowserRouter**.

When `ssrLoadModule` loads `AppLayout.jsx`, it executes the entire module including any `import { BrowserRouter } from 'react-router-dom'`. BrowserRouter initializes immediately with `location = '/'` in Node's SSR environment - before StaticRouter can set its context.

**The fix:** Separate concerns:

```jsx
// AppLayout.jsx - NEVER import BrowserRouter
import { Routes, Route } from 'react-router-dom'
// ...routes here

// App.jsx - BrowserRouter wraps AppLayout
import { BrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'

export default function App() {
  return <BrowserRouter><AppLayout /></BrowserRouter>
}
```

---

### 3. Hydration: hydrateRoot vs createRoot

Using `createRoot` replaces all DOM content - causing FOUC (flash of unstyled content). Using `hydrateRoot` attaches React's event system to existing SSR HTML without repainting.

```jsx
const root = document.getElementById('root')

if (root.dataset.serverRendered) {
  // SSR content exists - attach event handlers, no repaint
  ReactDOM.hydrateRoot(root, <App />)
} else {
  // Direct visit (no SSR) - create fresh
  ReactDOM.createRoot(root).render(<App />)
}
```

The `data-server-rendered` attribute is added by the prerender script.

#### The 404 page never hydrates

The generated `404.html` uses `<div id="root-404">` instead of `id="root"`,
and the React bundle `<script>` tag is stripped from it. The client entry never
finds a matching `root` div, so no hydration attempt happens at all. This is a
deliberate three-part fix, not an accident: hydrating the 404 would make React
Router mount `<Routes>` against the unmatched URL, render nothing, and land the
user on a blank page with a hydration error. The 404 is pure static HTML -
Cloudflare Pages serves it with a genuine HTTP 404 status, no JS needed.

---

### 4. Dynamic Islands

Islands allow client-only content in prerendered pages. The pattern:

1. **Build time:** `<pre-island>` renders as static HTML with fallback content
2. **Client time:** `mountIslands()` replaces each with a React component

```jsx
// Static HTML contains:
<pre-island data-pre-island="cart-widget">
  <span>Loading cart...</span>
</pre-island>

// After hydration:
<pre-island data-pre-island="cart-widget">
  <div>Cart has 3 items</div>
</pre-island>
```

Islands are separate React roots - they don't participate in hydration, so no mismatch possible.

---

## File Flow

```text
src/
|-- App.jsx              # BrowserRouter wrapper (client only)
|-- AppLayout.jsx        # Routes + layout (NO BrowserRouter!)
|-- main.jsx             # hydrateRoot vs createRoot decision
|-- AppIslands.jsx       # Island component registry
|-- hooks/
|   `-- usePageMeta.js   # Head tag management
`-- pages/               # Page components
    `-- *.jsx

scripts/
|-- inject-brand.js      # Injects <title>, meta into index.html
`-- prerender.js         # Main prerendering engine
    `-- For each route:
        1. Create Vite dev server
        2. ssrLoadModule(AppLayout)
        3. renderToString(StaticRouter)
        4. Inject route-specific meta
        5. Write to dist/[route]/index.html
```

## SEO Pipeline

1. **Global meta** (`inject-brand.js`): Site name, default OG image, favicon
2. **Route meta** (`prerender.js`): Per-route title, description, OG tags
3. **Canonical URLs**: Auto-generated from route paths
4. **JSON-LD**: `buildJsonLd()` output injected into `<head>`
5. **Sitemap**: Generated from routes array
6. **404**: Special page with `noindex` robots directive

---

## Why This Architecture?

### Minimal Dependencies

Entire prerender pipeline is ~200 lines of readable Node. No heavy frameworks.

### Debuggable

When something breaks, you can read and fix it yourself.

### No Server Required

Build-time rendering means no runtime server. Just static files on a CDN.

### Fast

Pre-rendered HTML loads instantly. JavaScript hydrates in parallel.

---

## Key Files

| File | Purpose |
|------|---------|
| `prerender.js` | Vite server + ssrLoadModule + renderToString |
| `inject-brand.js` | Regex-based meta injection into HTML |
| `usePageMeta.js` | React hook for head tag management |
| `islands.js` | Client-side island mounting |
| `main.jsx` | hydrateRoot/createRoot decision |