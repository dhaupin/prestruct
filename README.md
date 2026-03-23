# Cloudflare SEO SSR (For React -> Vite)

A lightweight SSR prerender layer for **Vite + React + Cloudflare Pages** apps.

No framework lock-in. No new build tool. Just scripts that run after `vite build`,
render each route to static HTML, and deploy to CF Pages with correct SEO, caching,
and hydration - all already working and debugged.

This is a **proof of concept** extracted from a production build.
See `AGENTS.md` for the full engineering story and every hard-won decision.

---

## What it does

- Prerenders all routes to static HTML at build time using Vite's `ssrLoadModule`
- Injects per-route `<title>`, `<meta>`, Open Graph, Twitter card, and canonical tags
- Generates `sitemap.xml` automatically from the routes config
- Generates a `404.html` that CF Pages serves with a real HTTP 404 status
- Writes `_redirects` rules for clean URL handling (`.html` stripping, `/home` → `/`)
- Sets correct `Cache-Control` headers for HTML (no-cache) and assets (immutable)
- Ships a `usePageMeta` hook that keeps all head tags in sync on client-side navigation
- Uses `hydrateRoot` (not `createRoot`) so the SSR HTML is reused - no FOUC

---

## How it works

```
npm run build
  └── vite build                  # produces dist/ with hashed JS/CSS bundles
  └── node scripts/inject-brand   # injects brand meta into dist/index.html
  └── node scripts/prerender      # renders each route to its own dist/route/index.html
```

The prerender script spins up a Vite dev server, calls `ssrLoadModule` to load your
`AppLayout` component, wraps it in `StaticRouter` with the target URL, renders to
string, injects route-specific meta, and writes the HTML file. CF Pages picks it up
as a static file and serves it with a 200 status and the correct head tags.

---

## Stack requirements

- Vite 5+
- React 18+
- React Router v6 (BrowserRouter / StaticRouter)
- Cloudflare Pages
- Node 18+ (for ESM `import()` in scripts)

---

## File map

```
scripts/
  prerender.js       Engine: renders all routes, generates sitemap + 404
  inject-brand.js    Engine: injects brand meta into the base index.html shell

src/
  AppLayout.jsx      Template: routes + layout, NO BrowserRouter (critical)
  entry-server.jsx   Template: SSR entry - wraps AppLayout in StaticRouter
  main.jsx           Template: client entry - hydrateRoot or createRoot
  usePageMeta.js     Hook: updates head tags on client-side navigation

public/
  _redirects         CF Pages redirect rules
  _headers           CF Pages cache + security headers

index.html           Shell template - all meta injected at build time
```

Files marked **Engine** stay identical across apps - no edits needed.
Files marked **Template** need minor app-specific wiring (see Integration below).

---

## Integration into a new app

### 1. Copy the engine scripts

```bash
cp scripts/prerender.js    your-app/scripts/
cp scripts/inject-brand.js your-app/scripts/
```

### 2. Create a config file

The scripts currently import from `brand.js`. For a reusable layer, extract that
into a config contract (see TODO in SCOPE.md). For now, create `src/brand.js` in
your app with at minimum:

```js
export const SITE_URL   = 'https://yoursite.com'
export const FESTIVAL_NAME = 'Your Site Name'  // or whatever fits
export function buildJsonLd() { return JSON.stringify([]) }
```

### 3. Wire up the ROUTES array in prerender.js

Replace the VFF-specific ROUTES array with your own:

```js
const ROUTES = [
  {
    path: '/',
    priority: '1.0',
    changefreq: 'weekly',
    meta: {
      title: 'Your Site - Tagline',
      description: 'Your homepage description.',
    },
  },
  {
    path: '/about',
    priority: '0.9',
    changefreq: 'monthly',
    meta: {
      title: 'About - Your Site',
      description: 'About your site.',
    },
  },
  // ... one entry per route
]
```

### 4. Create AppLayout.jsx (critical - read this)

**AppLayout must not import BrowserRouter.** This is the single most important rule.

```jsx
// AppLayout.jsx - NO BrowserRouter here
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function AppLayout() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/"      element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
```

Your `App.jsx` wraps it in BrowserRouter for the client:

```jsx
import { BrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'

export default function App() {
  return <BrowserRouter><AppLayout /></BrowserRouter>
}
```

### 5. Add usePageMeta to each page

```jsx
import usePageMeta from '../usePageMeta.js'

export default function About() {
  usePageMeta({
    path:        '/about',
    title:       'About - Your Site',
    description: 'About your site.',
  })
  // ...
}
```

Update `usePageMeta.js` to point at your own SITE_URL source:

```js
// Option A: import from your brand/config file
import { SITE_URL } from './brand.js'

// Option B: read from env
const SITE_URL = import.meta.env.VITE_SITE_URL
```

### 6. Update package.json build script

```json
{
  "scripts": {
    "build": "vite build && node scripts/inject-brand.js && node scripts/prerender.js"
  }
}
```

### 7. Copy public files and update for your domain

`_headers` - update the CSP domain references and Access-Control-Allow-Origin.
`_redirects` - add any app-specific redirects. The `.html` stripping rules are
reusable as-is.

---

## Known gotchas (read AGENTS.md for full context)

**BrowserRouter isolation.** If AppLayout imports BrowserRouter anywhere in its
module tree, `ssrLoadModule` will initialize it against `window.location` (which
defaults to `/` in Node), overriding StaticRouter's location. Every route renders
as the homepage. Solution: AppLayout never imports BrowserRouter. App.jsx does.

**react-router-dom/server.js.** Node's ESM resolver in CF Pages' build environment
requires the explicit `.js` extension on subpath imports. Use
`from 'react-router-dom/server.js'` not `from 'react-router-dom/server'`.

**hydrateRoot vs createRoot.** Use `hydrateRoot` when `root.dataset.serverRendered`
is set. This attaches React to the existing SSR DOM, eliminating FOUC. `createRoot`
replaces the DOM, causing a visible flash as React re-renders.

**Inline style tags in JSX.** React 18 defers `<style>` tags in JSX to `<head>`,
causing hydration tree mismatches. Keep all CSS in `.css` files or use inline
`style={{}}` props - never `<style>` tags inside component JSX.

**Nav dark mode state.** Any component that reads `localStorage` or
`window.matchMedia` at render time will cause an SSR/client mismatch.
Initialize state as `false` (SSR-safe), then sync via `useEffect`.

**404 page hydration.** CF Pages serves `dist/404.html` for unmatched routes.
If this file has `id="root"`, `main.jsx` will try to `hydrateRoot` or `createRoot`
on it, and React will render `<Routes>` which matches nothing - blank page.
Use `id="root-404"` and strip the React bundle `<script>` tag from `404.html`.

**$ in meta descriptions.** `String.replace()` treats `$1`, `$2` etc. in the
replacement string as regex backreferences. Dollar signs in descriptions (prices
like `$120`) corrupt the injected meta tags. Escape with
`.replace(/\$/g, '$$$$')` before using the string as a replacement.

**CF Pages trailing slash.** CF Pages' Pretty URLs feature serves
`dist/about/index.html` at both `/about` and `/about/`. Do not add redirect
rules to strip trailing slashes - they create redirect loops because CF itself
adds the slash before your rule fires. React Router v6 matches both forms
natively. Leave it alone.

---

## License

MIT. Use freely, adapt without credit required.
