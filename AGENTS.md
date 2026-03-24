# AGENTS.md: Prestruct

Engineering history and hard-won decisions. Written for an AI agent (or human)
picking this up cold. Read before touching anything.

**Also read:** `CONTENT.md` before writing any copy, documentation, or code
comments. It covers tone, voice, formatting, naming, and what to avoid. `SCOPE.md` 
to organize future patterns and planning. It lays out next steps for the framework, 
and how we should plan accordingly.

Every pattern here was debugged against real CF Pages deployments across two
production apps. Nothing is theoretical.

---

## The core architecture decision: ssrLoadModule over vite build --ssr

**What we tried first:** `vite build --ssr` to produce a server bundle, then import
that bundle in the prerender script.

**What broke:** Every route rendered as the homepage. The SSR bundle looked correct
but `StaticRouter`'s `location` prop wasn't reaching `useLocation()` inside `Routes`.

**Root cause:** `vite build --ssr` and `vite build` produce separate module instances.
When the prerender script imported the SSR bundle, it got a different instance of
`react-router-dom` than the app was compiled against. `StaticRouter`'s context from
one instance can't propagate to `Routes` in the other. They're strangers.

**The fix:** Use `vite.createServer()` + `vite.ssrLoadModule()`. ssrLoadModule resolves
all imports through Vite's unified module registry: single instance of every package,
StaticRouter and Routes share the same context. Location propagates correctly.

```js
const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom' })
const { default: AppLayout } = await vite.ssrLoadModule('/src/AppLayout.jsx')
const appHtml = renderToString(
  React.createElement(StaticRouter, { location: route.path },
    React.createElement(AppLayout))
)
```

**Rule:** Any implementation must use ssrLoadModule. The compiled SSR bundle approach
produces wrong output (homepage on every route) silently, with no error.

---

## The BrowserRouter isolation requirement

**What broke:** After switching to ssrLoadModule, all routes still rendered as the homepage.

**Root cause:** `App.jsx` exported `AppLayout` (without BrowserRouter), but `ssrLoadModule`
on `App.jsx` executed the entire module including `import { BrowserRouter } from 'react-router-dom'`
at the top. BrowserRouter's initialization code ran immediately. In Node's SSR environment
it defaulted to `location = '/'`. This ran before StaticRouter set its location context.
StaticRouter wrapped it, but BrowserRouter's context was already live in the registry.

**The fix:** Create a separate `AppLayout.jsx` that has zero router imports -- only
`Routes`, `Route`, `useLocation`. Never `BrowserRouter`. The router is always provided
by the caller:
- Client: `App.jsx` wraps `<AppLayout>` in `<BrowserRouter>`
- Prerender: `ssrLoadModule('/src/AppLayout.jsx')` loads AppLayout directly, no BrowserRouter

**The rule:** When you follow every import from AppLayout recursively, you must never
reach `import { BrowserRouter }`. If you do, all routes prerender as '/'. No error
message tells you this is happening.

---

## react-router-dom/server.js: the .js extension requirement

**What broke:** CF Pages build failed with:
```
Cannot find module 'react-router-dom/server'
Did you mean to import "react-router-dom/server.js"?
```

**Why:** Node's ESM resolver on CF Pages (Node 22) requires explicit `.js` extensions
on subpath imports from node_modules. `'react-router-dom/server'` works in some
environments but not CF Pages.

**The fix:** Always `from 'react-router-dom/server.js'` with the extension.

---

## hydrateRoot vs createRoot: FOUC

**createRoot** replaces the entire DOM with a fresh React render. Even if the SSR HTML
is identical, the browser repaints the whole content. Users see styled SSR content go
blank, then reappear. This is the flash of unstyled content (FOUC).

**hydrateRoot** attaches React's event system to the existing SSR DOM without replacing
it. DOM nodes stay. No repaint. No flash.

**The mismatch problem:** `hydrateRoot` requires identical SSR and client output. Any
difference throws a hydration error and React falls back to a full re-render. Sources
of mismatch found across both production integrations:

1. **localStorage at render time.** `useState(localStorage.getItem('theme'))` throws
   in SSR (no localStorage in Node). Fix: `typeof window === 'undefined'` guard.

2. **Inline `<style>` tags in JSX.** React 18 hoists `<style>` from JSX to `<head>`
   during SSR but leaves them in-tree on client. Different DOM = mismatch.
   Fix: external `.css` files or `style={{}}` props only.

3. **`new Date().getFullYear()` in render.** If SSR and client run across a year
   boundary, year differs. Fix: `suppressHydrationWarning` on that element.

4. **Canvas elements.** Empty on SSR, populated via useEffect on client.
   Fix: `suppressHydrationWarning` on the canvas.

**The conditional in main.jsx:**
```js
if (root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>)
} else {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
}
```
`data-server-rendered` is written by prerender.js onto the root div. The else branch
handles direct SPA navigation to routes without prerendered HTML.

---

## 404 page: why id="root-404" not id="root"

**What broke:** Visiting any 404 URL showed a blank page with React hydration errors.

**Root cause:** `404.html` had `<div id="root">`. `main.jsx` found it, no
`data-server-rendered` attribute, fell to `createRoot().render(<App>)`. React Router
found no matching route for the 404 URL. `<Routes>` rendered nothing. Blank page.

**The fix:**
1. Use `<div id="root-404">` -- main.jsx never touches it
2. Strip the React bundle `<script>` tag from 404.html. No JS loads at all
3. 404 is pure static HTML. It doesn't need React.

CF Pages serves `dist/404.html` automatically for unmatched routes with HTTP 404.
No configuration needed.

---

## $ in meta description strings: the regex backreference bug

**What broke:** Description containing `$120` rendered as garbled content with injected
HTML fragments mid-string.

**Root cause:** `String.prototype.replace()` treats `$1`, `$2`, `$n` in the replacement
string as backreferences to regex capture groups. `$120` was interpreted as capture
group 1 (`content="`) followed by literal `20`. The opening HTML attribute got duplicated
inside the description.

**The fix:** Escape dollar signs before using a string as a replacement value:
```js
const desc = meta.description.replace(/\$/g, '$$$$')
```
Four dollar signs in the source produces two literal dollar signs in the replacement
string, which produces one dollar sign in the output.

**General rule:** Any user-supplied string used as the second argument to `.replace()`
must have its `$` characters escaped. This applies to all meta fields: title,
description, ogImage path, anything.

---

## CF Pages trailing slash: leave it alone

**What we tried:** `_redirects` rules to strip trailing slashes:
```
/about/    /about    301
```

**What broke:** Infinite redirect loop. `/about` → `/about/` (CF Pretty URLs) → `/about` → ...

**Root cause:** CF Pages' Pretty URLs feature redirects directory-index requests
to the trailing-slash form. Our rule reversed that redirect, CF re-applied it.

**The correct approach:** Do nothing. React Router v6 matches `/about/` against
`<Route path="/about">` natively. NavLink `isActive` handles both forms. Canonical
URL in prerender has no trailing slash. That's the SEO signal that matters.

**Rule:** Don't add redirect rules for paths that have a `dist/path/index.html`.
Let CF handle those. Only add rules for paths that have no prerendered file.

---

## SPA fallback redirect: remove it after prerendering

**What broke:** CF Pages build logs showed `Infinite loop detected` warning.

**Root cause:** `/* /index.html 200` was the SPA fallback. Pre-prerender, it was
necessary. CF needed to rewrite every path to `index.html` so React Router could
handle routing. Post-prerender, every route has its own `index.html`. The rule is
not only unnecessary but causes a loop: CF's Pretty URLs rewrites `/about/` to
`dist/about/index.html`, which satisfies the SPA rule, which rewrites back to
`/index.html`, which...

**The fix:** Remove `/* /index.html 200` from `_redirects` when using prerendering.

---

## _headers wildcard rules: CF Pages does not support globs

**What broke:** Build logs showed:
```
- #17: *.js  Expected a colon-separated header pair
- #20: *.css  Expected a colon-separated header pair
```

**Root cause:** CF Pages `_headers` route matchers only support path prefixes, not
shell-style globs. `*.js` is not valid syntax.

**The fix:** Remove `*.js` and `*.css` rules. Use `/assets/*` instead. Vite outputs
all hashed JS and CSS to `dist/assets/`, so `/assets/*` correctly matches all
cacheable bundles with a single rule.

---

## Apostrophes in single-quoted JS strings: parser error

**What broke:** CF Pages build failed with:
```
ERROR: Expected "}" but found "re"
description: 'We're open Monday through Friday...'
                                                          ^
```

**Root cause:** An apostrophe inside a single-quoted JS string literal terminates
the string. `We're` ends the string at the apostrophe, leaving `re based...` as
unparseable tokens.

**The fix:** Use double quotes for any string value containing a contraction or
possessive. This affects `usePageMeta` calls, `ssr.config.js` route meta, and
any other JS string literal with an apostrophe.

```js
// Wrong
description: 'We\'re based in NW Pennsylvania.'    // escape works but is error-prone
description: 'We're based in NW Pennsylvania.'     // breaks

// Correct
description: "We're based in NW Pennsylvania."
```

---

## usePageMeta: why all 7 tags, not just title

When a user navigates within the SPA, they stay on the same HTML document.
Head tags from the first-loaded route don't update unless something explicitly
updates them. This matters for:

- **Browser tab title**: obvious
- **canonical**: JS-enabled bots (Googlebot, Bingbot) execute JS and navigate SPAs.
  Wrong canonical can cause content to be attributed to the wrong URL.
- **og:url**: if a user shares after navigating (not the first load), the
  social preview uses the og:url in the DOM at share time.
- **og:title, og:description, twitter:title, twitter:description**: same reason.

Tags NOT updated per navigation: `og:image`, `og:type`, `og:locale`, `og:site_name`,
`twitter:card`, `twitter:image`. These describe the site, not the specific page.

---

## Google Fonts: preload does not work

**What broke:** 404 errors on preloaded font files, "preloaded but not used" warnings.

**Root cause:** Google Fonts CDN paths include a content hash that rotates. There's
no public API to get the current hash. Hardcoded paths go stale.

**The correct approach:** Use `<link rel="preconnect">` to warm the connection, load
the stylesheet normally. If you need zero-FOUT, self-host the font files.

---

## Stale assets: why it's not a problem

Vite fingerprints all JS/CSS (`index-HASH.js`). Prerender reads the freshly-written
`dist/index.html` so every HTML file references the current build's hash. They're
always in sync. CF Pages uploads only changed files. HTML has `Cache-Control: no-cache`
so browsers always revalidate. Old asset files in CF's store are never referenced
by live HTML. This system is self-cleaning.

---

## What was NOT explored (future work)

**Streaming SSR.** `renderToString` blocks until the full tree renders. React 18's
`renderToPipeableStream` streams progressively. Not needed for build-time prerender.

**Edge SSR.** Per-request rendering in a CF Worker requires a different architecture.
ssrLoadModule only works at build time (it spins up a Vite dev server).

**Incremental prerender.** All routes rerender on every build. For hundreds of routes,
a smarter system would track file-to-route dependencies and only rerender affected ones.

**CMS-driven routes.** Routes are static config. SCOPE.md P1 covers a `fetchRoutes()`
async function to pull routes from an API at build time.
