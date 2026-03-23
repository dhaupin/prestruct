# AGENTS.md — vite-cf-ssr

Engineering history and hard-won decisions. Written for an AI agent (or human)
picking this work up cold. Read this before touching anything.

The context: this library was extracted from a production Vibe Flow Festival
website build. Every pattern here was debugged against real CF Pages deployments.
Nothing is theoretical.

---

## The core architecture decision: ssrLoadModule over vite build --ssr

**What we tried first:** `vite build --ssr` to produce a server bundle, then import
that in the prerender script.

**What broke:** Every route rendered as the homepage. The SSR bundle was correct
but `StaticRouter`'s `location` prop wasn't reaching `useLocation()` inside `Routes`.

**Root cause:** `vite build --ssr` and `vite build` (client) produce separate module
instances. When the prerender script imports the SSR bundle, it gets a different
instance of `react-router-dom` than the one the app was compiled against. The
`StaticRouter` context from one instance can't propagate to the `Routes` hook from
the other. They're strangers.

**The fix:** Use `vite.createServer()` + `vite.ssrLoadModule()` instead of a
compiled SSR bundle. `ssrLoadModule` resolves all imports through Vite's unified
module registry — single instance of every package, StaticRouter and Routes share
the same context object. Location propagates correctly.

**The key code pattern in prerender.js:**
```js
const vite = await createServer({
  root: ROOT,
  server: { middlewareMode: true },
  appType: 'custom',
})
const { default: AppLayout } = await vite.ssrLoadModule('/src/AppLayout.jsx')
const appHtml = renderToString(
  React.createElement(StaticRouter, { location: route.path },
    React.createElement(AppLayout))
)
```

**Why this matters for the library:** Any future implementation must use ssrLoadModule.
The compiled SSR bundle approach will silently produce wrong output (homepage on every
route) with no error message.

---

## The BrowserRouter isolation requirement

**What broke:** After switching to ssrLoadModule, routes still all rendered as
the homepage.

**Root cause:** The original `App.jsx` exported both `App` (with BrowserRouter) and
`AppLayout` (without). `ssrLoadModule('/src/App.jsx')` executed the entire module,
including the `import { BrowserRouter } from 'react-router-dom'` at the top.
BrowserRouter's initialization code ran immediately on import. In Node's SSR
environment, it defaulted to `location = '/'`. This ran BEFORE StaticRouter got
a chance to set its location. StaticRouter wrapped it, but BrowserRouter's context
was already in the module registry as the active router.

**The fix:** Create a separate `AppLayout.jsx` file that has ZERO router imports.
It imports only `Routes`, `Route`, `useLocation` from react-router-dom — never
`BrowserRouter`. The router is always provided externally by the caller:
- Client: `App.jsx` wraps `<AppLayout>` in `<BrowserRouter>`
- SSR: `entry-server.jsx` wraps `<AppLayout>` in `<StaticRouter location={url}>`
- Prerender: `ssrLoadModule('/src/AppLayout.jsx')` — loads AppLayout directly,
  no BrowserRouter ever touches the module graph

**The rule for any app using this library:**
AppLayout must be a file that, when you follow every import recursively, never
reaches `import { BrowserRouter } from 'react-router-dom'`. If it does, all routes
render as '/'.

---

## react-router-dom/server.js — the .js extension requirement

**What broke:** Build failed on Cloudflare Pages with:
```
Cannot find module '/opt/buildhome/repo/node_modules/react-router-dom/server'
Did you mean to import "react-router-dom/server.js"?
```

**Why:** Node's ESM resolver in CF Pages' build environment (Node 22) requires
explicit `.js` extensions on subpath imports from `node_modules`. The bare
`'react-router-dom/server'` works in some environments but not CF Pages.

**The fix:** Always import as `'react-router-dom/server.js'` with the extension.
This applies in both `prerender.js` (the dynamic import) and `entry-server.jsx`.

---

## hydrateRoot vs createRoot — why it matters for FOUC

**createRoot** replaces the entire DOM subtree with a fresh React render.
Even if the SSR HTML is identical to what React would render, the browser
re-paints the entire content. On a slow connection or slow device, users see
the styled SSR content briefly go blank, then reappear. This is the FOUC.

**hydrateRoot** attaches React's event system to the existing SSR DOM without
replacing it. The DOM nodes stay in place. No repaint. No flash. This is the
correct approach when you have SSR content.

**The mismatch problem:** `hydrateRoot` requires that SSR and client render
produce bitwise-identical HTML. Any difference throws a hydration error and React
falls back to a full re-render (which defeats the purpose). Sources of mismatch
found in this build:

1. **Dark mode state.** Nav component read `localStorage.getItem('vff-theme')`
   at render time. SSR has no localStorage, so it returns null. Client returns
   the stored value. Mismatch. Fix: `useState(false)` always (SSR-safe), then
   `useEffect(() => setDark(getInitialDark()), [])` to sync after mount.

2. **Inline `<style>` tags in JSX.** React 18 hoists `<style>` elements from
   JSX to `<head>` during SSR but leaves them in-tree on the client. Different
   DOM structure = mismatch. Fix: remove all `<style>` tags from JSX. Use
   external CSS or inline `style={{}}` props instead.

3. **`new Date().getFullYear()` in render.** If SSR runs at 11:59 PM and the
   client loads at 12:00 AM on January 1, the year differs. Wrap in
   `suppressHydrationWarning` on that element.

4. **Canvas element.** Home page ember animation renders a `<canvas>` in SSR
   (empty, correct) but populates it via useEffect on the client. React sees
   the canvas element differently. Fix: `suppressHydrationWarning` on the canvas.

**The hydrateRoot conditional in main.jsx:**
```js
if (root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}
```
The `data-server-rendered` attribute is written by prerender.js onto the root div.
When a user navigates to a route that has no prerendered HTML (shouldn't happen
in a fully prerendered app, but defensive coding is good), createRoot handles it.

---

## 404 page: why id="root-404" not id="root"

**What broke:** Visiting any 404 URL showed a blank page with React errors
#418 and #423 in the console.

**Root cause:** The 404 HTML had `<div id="root">`. `main.jsx` finds `id="root"`,
checks for `data-server-rendered` (not present, since we didn't run renderToString
for 404), falls to `createRoot().render()`. React renders `<App>` inside
`<BrowserRouter>`. The URL is something like `/totally-made-up-path`. React Router
finds no matching `<Route>`. `<Routes>` renders nothing. Blank page.

**The fix:**
1. Use `<div id="root-404">` — main.jsx never touches it
2. Strip the React bundle `<script>` tag from 404.html entirely — no JS loads
3. The 404 page is pure static HTML. It doesn't need React.

```js
html = html.replace(/<script type="module"[^>]*><\/script>/, '')
```

**CF Pages serves 404.html automatically** for any unmatched path, with a real
HTTP 404 status. No configuration needed. Just put the file at `dist/404.html`.

---

## $ in meta description strings — the regex backreference bug

**What broke:** The `/tickets` page meta description appeared as:
```
Weekend Camping Pass (<meta name="description" content="20), Full Day Pass...
```

**Root cause:** The description contained `$120`, `$25`, `$10` (pass prices).
JavaScript's `String.prototype.replace()` treats `$` in the replacement string
as a special character — `$1`, `$2` etc. are backreferences to capture groups.
`$120` was interpreted as capture group 1 followed by literal `20`. Capture group 1
happened to be the opening `content="` — so it got inserted mid-description.

**The fix:** Escape dollar signs before using a string as a replacement:
```js
const desc = meta.description.replace(/\$/g, '$$$$')
```
Four dollar signs produces two literal dollar signs in a replace string, which
then produces one dollar sign in the output.

**This is a general gotcha** for any build script that does string injection via
regex replace. Any user-supplied or data-driven content that might contain `$`
needs this escape.

---

## CF Pages trailing slash redirect loop

**What we tried:** Adding `_redirects` rules to strip trailing slashes:
```
/about/    /about    301
```

**What broke:** Infinite redirect loop. `/about` → `/about/` → `/about` → ...

**Root cause:** CF Pages' "Pretty URLs" feature automatically redirects requests
to directory-index files to the trailing slash version:
`dist/about/index.html` → CF serves at `/about/` (with slash).
So our rule redirected `/about/` → `/about`, then CF redirected back to `/about/`.

**The correct approach:** Do nothing. React Router v6 matches `/about/` against
`<Route path="/about">` natively — it normalizes trailing slashes during matching.
NavLink's `isActive` also handles both forms correctly. CF Pages can do its Pretty
URLs thing. The canonical URL in prerender has no trailing slash, which is the
SEO signal that matters.

**Rule:** Only add redirect rules for paths that do NOT have a corresponding
`dist/path/index.html`. For paths that do (i.e., all prerendered routes), let
CF handle it.

---

## Google Fonts preload — what doesn't work

**What we tried:** Preloading specific woff2 font files with hardcoded CDN paths:
```html
<link rel="preload" as="font" type="font/woff2" crossorigin
  href="https://fonts.gstatic.com/s/fraunces/v31/6NUh8FyLNQ...woff2" />
```

**What broke:** 404 errors on the preloaded files. "Preloaded but not used" warnings.

**Why:** Google Fonts CDN file paths include a content hash that changes when Google
rotates their CDN. There's no public API to get the current hash. Hardcoded paths
go stale.

**The correct approach:** Use `<link rel="preconnect">` to warm the TCP/TLS
connection to `fonts.googleapis.com` and `fonts.gstatic.com`, then load the font
CSS asynchronously with the `media="print" onload` pattern:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=..."
  media="print" onload="this.media='all'" />
```
Preconnect primes the connection. The stylesheet loads without blocking render.
Font files load as soon as the CSS is parsed, with the pre-warmed connection.

If you want true zero-FOUT, self-host the font files (download them, put them in
`public/fonts/`, reference with `@font-face` in CSS). No CDN dependencies,
no hash rotation issues, works offline.

---

## usePageMeta — why all 7 tags, not just title

When a user navigates within the SPA, they stay on the same HTML document.
The `<head>` tags from whichever route they first loaded don't update unless
something explicitly updates them. This affects:

- **Browser tab title** — obvious, everyone notices
- **canonical** — JS-enabled bots (Googlebot, Bingbot) do execute JS and
  navigate SPAs. If canonical points to `/tickets` when they're crawling `/about`,
  they may attribute the content to the wrong URL.
- **og:url** — if a user shares a page after navigating to it (not the first load),
  the social preview uses the og:url value in the DOM at share time.
- **og:title, og:description, twitter:title, twitter:description** — same reason.

Tags intentionally NOT updated per navigation: `og:image`, `og:type`, `og:locale`,
`og:site_name`, `twitter:card`, `twitter:image`. These describe the site/brand,
not the specific page, so they're correct on every route.

---

## Stale SSR / CF Pages flooding — why it's not a problem

**The concern:** "Won't old HTML files with old JS bundle hashes accumulate on CF?"

**Why it's fine:**
- Vite fingerprints all JS/CSS (`index-HASH.js`). The hash changes when content changes.
- Prerender runs in the same pipeline, reading the freshly-written `dist/index.html`.
- Every HTML file references the current build's asset hash. They're always in sync.
- CF Pages only uploads files whose hash changed — `N already uploaded` in build logs.
- HTML files have `Cache-Control: no-cache` so browsers always revalidate.
- Old asset files stay in CF's store but are never referenced by any live HTML.
  CF auto-cleans them over time.
- CF Pages free tier: 500 deploys/month. Normal development uses ~200-300/month.

---

## What was NOT explored (future work)

**Streaming SSR.** `renderToString` blocks until the full component tree renders.
For large pages this adds latency to the build. React 18's `renderToPipeableStream`
streams HTML progressively. Not needed for build-time prerender, but relevant if
this ever moves toward edge SSR.

**Edge SSR (per-request).** This whole system is build-time prerender — every route
is rendered once at deploy time and served as static HTML. Per-request SSR (rendering
in a CF Worker on every request) would require a different architecture entirely.
The ssrLoadModule approach only works at build time; it spins up a Vite dev server.

**Incremental prerender.** Currently all routes rerender on every build even if only
one component changed. For apps with hundreds of routes, a smarter system would
track which routes depend on which files and only rerender affected ones. Out of scope
for a project with ~11 routes.

**CMS-driven routes.** Routes are currently static config. The P1 todo in SCOPE.md
covers a `fetchRoutes()` async function to pull routes from an API at build time.
Not implemented yet.
