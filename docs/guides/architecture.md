---
layout: default
title: Architecture
nav_order: 5
---


Understanding how prestruct works under the hood.

## Overview

Prestruct is a **build-time prerenderer** for React/Vite apps. It renders each route to static HTML once during the build process, then serves those files from a CDN (Cloudflare Pages).

```
Build Time                          Runtime
─────────────                       ───────
┌─────────────────────┐            ┌─────────────────────┐
│  vite build         │            │  CDN serves         │
│  (JS bundles)       │            │  static HTML        │
└──────────┬──────────┘            └──────────┬──────────┘
           │                                  │
           ▼                                  │
┌─────────────────────┐                       │
│  inject-brand.js    │                       │
│  (global meta)      │                       │
└──────────┬──────────┘                       │
           │                                  │
           ▼                                  ▼
┌─────────────────────┐            ┌─────────────────────┐
│  prerender.js       │            │  Browser hydrates   │
│  (per-route HTML)   │───────────▶│  (SPA navigation)   │
└─────────────────────┘            └─────────────────────┘
```

## Core Concepts

### 1. ssrLoadModule vs vite build --ssr

**Why ssrLoadModule?**

Initially, we tried `vite build --ssr` to create a server bundle, then imported it. Every route rendered as the homepage. The issue:

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

```
src/
├── App.jsx              # BrowserRouter wrapper (client only)
├── AppLayout.jsx        # Routes + layout (NO BrowserRouter!)
├── main.jsx             # hydrateRoot vs createRoot decision
├── AppIslands.jsx       # Island component registry
├── hooks/
│   └── usePageMeta.js   # Head tag management
└── pages/               # Page components
    └── *.jsx

scripts/
├── inject-brand.js      # Injects <title>, meta into index.html
└── prerender.js         # Main prerendering engine
    └── For each route:
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