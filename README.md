# prestruct

A lightweight build-time prerender layer for **Vite + React + Cloudflare Pages** apps.

No framework lock-in. No new build tool. Drop in three files, add a config, and your
SPA gets fully-rendered static HTML per route -- correct SEO, correct head tags, correct
HTTP status codes -- all already working and debugged against real CF Pages deployments.

This is **build-time prerender**, not edge SSR. Every route is rendered once at deploy
time and served as a static HTML file. CF Pages handles the rest.

---

## What it does

- Prerenders all routes to static HTML at build time using Vite's `ssrLoadModule`
- Injects per-route `<title>`, `<meta>`, Open Graph, Twitter Card, and canonical tags
- Generates `sitemap.xml` automatically from your routes config with today's date
- Generates a `404.html` that CF Pages serves with a real HTTP 404 status
- Ships a `usePageMeta` hook that keeps head tags in sync on client-side navigation
- Uses `hydrateRoot` (not `createRoot`) so SSR HTML is reused -- no FOUC

---

## Stack requirements

- Vite 5+
- React 18+
- React Router v6 (`BrowserRouter` / `StaticRouter`)
- Cloudflare Pages
- Node 18+ (for ESM `import()` in scripts)

---

## How it works

```
npm run build
  └── vite build                   # produces dist/ with hashed JS/CSS bundles
  └── node scripts/inject-brand    # injects brand meta into dist/index.html
  └── node scripts/prerender       # renders each route to dist/route/index.html
```

The prerender script spins up a Vite dev server, calls `ssrLoadModule` to load your
`AppLayout` component, wraps it in `StaticRouter` with the target path, renders to
string, injects route-specific meta, and writes the HTML file.

---

## File map

```
scripts/
  prerender.js       Engine -- renders all routes, generates sitemap + 404
  inject-brand.js    Engine -- injects brand meta into the base index.html shell

templates/
  src/
    AppLayout.jsx      Template -- your routes + layout, NO BrowserRouter (critical)
    entry-server.jsx   Template -- SSR entry, wraps AppLayout in StaticRouter
    main.jsx           Template -- client entry, hydrateRoot or createRoot
    hooks/
      usePageMeta.js   Hook -- updates head tags on client-side navigation
  index.html           Shell template -- meta injected at build time, not hardcoded
  ssr.config.js        Your config -- site identity, routes, JSON-LD
  package.json         Example build script showing the three-step chain

public/
  _headers           CF Pages cache + security headers (generic, edit as needed)
  _redirects         CF Pages redirect rules (SPA fallback not needed post-prerender)

example/             Working app -- CF Pages root directory, builds and deploys as-is
```

Files marked **Engine** stay identical across apps -- copy them and never edit.
Files marked **Template** need minor app-specific wiring (see Integration below).

---

## Integration into a new app

### 1. Copy the engine files

```bash
cp scripts/prerender.js              your-app/scripts/
cp scripts/inject-brand.js           your-app/scripts/
cp templates/src/hooks/usePageMeta.js your-app/src/hooks/
```

### 2. Create `ssr.config.js` in your project root

```js
export default {
  siteUrl:       'https://yoursite.com',   // no trailing slash
  siteName:      'Your Site',
  author:        'Your Org',
  tagline:       'Your tagline.',
  ogImage:       'https://yoursite.com/og-image.jpg',
  keywords:      'keyword one, keyword two',
  appLayoutPath: '/src/AppLayout.jsx',

  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'weekly',
      meta: {
        title:       'Your Site | Your tagline.',
        description: 'Homepage description.',
      },
    },
    {
      path:       '/about',
      priority:   '0.9',
      changefreq: 'monthly',
      meta: {
        title:       'About | Your Site',
        description: 'About page description.',
      },
    },
  ],

  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type':    'Organization',
        name:       'Your Org',
        url:        'https://yoursite.com',
      },
    ]
  },
}
```

### 3. Create `AppLayout.jsx` (critical -- read this)

**AppLayout must not import BrowserRouter.** This is the single most important rule.
If BrowserRouter is anywhere in its module graph, every route prerendering as `/`.
See AGENTS.md for the full explanation.

```jsx
// AppLayout.jsx -- NO BrowserRouter here, ever
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [pathname])
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

### 4. Use `usePageMeta` in each page

```jsx
import usePageMeta from '../hooks/usePageMeta.js'

export default function About() {
  usePageMeta({
    siteUrl:     'https://yoursite.com',
    path:        '/about',
    title:       'About | Your Site',
    description: 'About page description.',
  })
  // ...
}
```

Tip: wrap it in your own thin hook to avoid repeating `siteUrl`:

```js
// src/hooks/useMeta.js
import usePageMeta from './usePageMeta.js'
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://yoursite.com'
export default (args) => usePageMeta({ siteUrl: SITE_URL, ...args })
```

### 5. Replace `main.jsx`

Use the provided `templates/src/main.jsx`. Key change: `hydrateRoot` when SSR content is present,
`createRoot` otherwise. Without this you get FOUC on every page load.

### 6. Update `package.json`

```json
{
  "scripts": {
    "build": "vite build && node scripts/inject-brand.js && node scripts/prerender.js"
  }
}
```

### 7. Copy `index.html` and `public/` files

`index.html` -- the shell template. Leave meta tags as placeholder stubs. inject-brand
writes the real values at build time from `ssr.config.js`.

`public/_headers` -- update the CSP if you have additional script/style domains.

`public/_redirects` -- the SPA fallback (`/* /index.html 200`) is NOT needed once
you're prerendering. Including it causes an infinite redirect loop on CF Pages.

---

## SSR safety rules

These apply to components in AppLayout's module graph (anything AppLayout imports):

**No `window`/`document`/`localStorage` at render time.** These don't exist in Node.
Access them only inside `useEffect`, or guard with `typeof window !== 'undefined'`.

```js
// Wrong -- runs during SSR renderToString, throws in Node
const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

// Correct -- typeof window guard
const [theme, setTheme] = useState(() => {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem('theme') || 'dark'
})
```

**No inline `<style>` tags in JSX.** React 18 handles them differently between SSR
and client, causing hydration mismatches. Use external `.css` files or `style={{}}` props.

**No apostrophes in single-quoted JS strings.** In string literals passed as JS values
(e.g. in `usePageMeta` calls), apostrophes inside single-quoted strings break the parser.
Use double quotes for any string containing a contraction.

```js
// Wrong
usePageMeta({ description: 'We're based in PA.' })

// Correct
usePageMeta({ description: "We're based in PA." })
```

---

## Known gotchas

**BrowserRouter isolation.** If AppLayout imports BrowserRouter anywhere in its module
tree, every route prerenders as `/`. See AGENTS.md for the full root cause analysis.

**`react-router-dom/server.js`.** Node's ESM resolver on CF Pages requires the explicit
`.js` extension. Use `from 'react-router-dom/server.js'` not `from 'react-router-dom/server'`.

**CF Pages trailing slash.** Do not add redirect rules to strip trailing slashes -- they
create infinite redirect loops with CF Pages' Pretty URLs feature. React Router v6
matches both `/about` and `/about/` natively. Leave it alone.

**`$` in meta descriptions.** `String.replace()` treats `$1`, `$2` in replacement strings
as regex backreferences. Descriptions containing prices like `$120` corrupt injected meta.
The prerender script escapes these automatically with `.replace(/\$/g, '$$$$')`.

**404 page hydration.** `404.html` uses `id="root-404"` and has its React bundle script
tag stripped. If it used `id="root"`, `main.jsx` would try to hydrate it, `<Routes>`
would find no match, and the page would be blank. See AGENTS.md.

---

## What this is not

- A full SSR framework (no server, no streaming, no edge runtime)
- A competitor to Remix, Astro, or TanStack Start
- Suitable for apps needing per-request SSR (this is build-time only)
- CMS-aware out of the box (routes are defined statically in config)

The value is that the entire prerender pipeline is ~200 lines of readable Node. You can
read prerender.js in 10 minutes and know exactly what it does. When something breaks,
you can fix it. That's the point.

---

## License

MIT. Use freely, adapt without credit required.
