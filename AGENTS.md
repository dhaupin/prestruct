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

## Dynamic islands: client-only content in prerendered pages

**The problem:** Prerendered HTML is static. User-specific content -- recently viewed
products, cart widgets, personalization banners -- can't be in the static HTML because
it's the same for every visitor. Putting it there would also expose it to crawlers.

**The pattern:** Punch holes through the prerendered HTML using `<pre-island>` custom
elements. The static HTML ships with the placeholder (and optional fallback content).
After the app hydrates, `mountIslands()` scans for these elements and mounts a React
component into each one using its own `createRoot`.

**Why a custom element, not a div:**
`<pre-island>` is semantically distinct from layout divs. It survives `renderToString`
unchanged -- React passes unknown elements through as plain HTML. It's also queryable
with a single targeted selector (`pre-island[data-pre-island]`) without class conflicts.

**SSR behavior:**
`renderToString` sees `<pre-island>` as an unknown HTML element and emits it as-is.
Any fallback content inside renders into the static HTML and is visible to crawlers.
The island component itself never runs at build time -- only in the browser.

**Why islands are independent of the React tree:**
`mountIslands()` calls `ReactDOM.createRoot(el).render(...)` directly on each
`<pre-island>` element. This creates a separate React root per island, outside the
main `hydrateRoot` tree. This is intentional: islands don't participate in hydration,
they don't need to match SSR output, and they can't cause hydration mismatches.

**Load strategies:**
The `data-pre-load` attribute controls when each island mounts:
- `eager` (default) -- immediately after `mountIslands()` is called
- `visible` -- via `IntersectionObserver` when the element enters the viewport
- `idle` -- via `requestIdleCallback` (falls back to `setTimeout(200)`)

**What islands can't do:**
- Receive props from the React tree (they're separate roots)
- Access React context from the parent app
- Be indexed by crawlers (fallback content is what crawlers see)
- Run at SSR time

For indexed dynamic content, prerender it into a separate route instead.

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

---

## The proxy architecture: two runtimes, one config

The proxy ships as two separate files targeting two deployment environments:

- `scripts/proxy.js` -- Node.js / Express / Puppeteer for VPS
- `scripts/proxy.worker.js` -- Cloudflare Worker via Browser Rendering API

Both read `config.proxy` from `ssr.config.js` for shared settings (botList,
targetUrl, secret). Bot detection logic and the cache-refresh contract are
identical across both. The only structural difference is how they store cached
HTML: the VPS version writes to disk, the Worker version uses KV.

**Why two files instead of a unified abstraction:**
The runtime environments are too different for a shared abstraction to be worth
the indirection. Express middleware, filesystem I/O, and process-level browser
management are Node concepts. Workers have no filesystem, no process, and a
completely different async model. Forcing both into one file would make both
harder to read and debug. Two files, each simple on its own terms, is the better
trade.

---

## Browser pooling in the VPS proxy

The VPS proxy (`proxy.js`) maintains a single shared Puppeteer browser instance.
Pages are opened and closed per request, but the browser process stays warm.

Why not launch a browser per request (the original spec's approach):
- Launching Chromium takes 500-2000ms and consumes ~100MB of RAM.
- Under concurrent bot traffic (Googlebot + Bingbot hitting simultaneously) this
  causes rapid OOM on small VPS instances.
- Chromium's per-process overhead is in the process, not the page. One browser,
  many pages is the correct model.

The browser reference is stored in a module-level variable. On `disconnected`
(crash, OOM kill, anything), the reference is cleared. The next request calls
`getBrowser()` which spawns a fresh instance. No manual restart required.

The browser is pre-warmed on startup so the first bot request doesn't absorb the
cold-start cost.

---

## Cache key: SHA-256 of URL path

The VPS proxy uses SHA-256 of the request URL path (including query string) as the
cache filename. The Worker proxy uses the same value as a KV key prefix.

Why not base64:
- Base64 of a URL often contains `/`, `+`, and `=`. Stripping these with a regex
  replace causes collisions: `/blog/post-1?ref=twitter` and `/blog/post-1?ref=twitte`
  could produce the same stripped key. SHA-256 hex is always filesystem-safe and
  collision-resistant.

---

## 302 redirect for non-bots, not 301

Non-bots are redirected to the live site with a 302. An earlier spec used 301.

301 is a permanent redirect cached by browsers indefinitely. If you ever change
the proxy URL, move the proxy, or disable it entirely, every browser that hit a
301 will keep redirecting internally without ever reaching the proxy again. 302 is
temporary and cache-free. The performance difference is negligible -- bots don't
follow redirects at all, and humans are redirected from a proxy they should never
be reaching in normal use.

---

## Cache refresh authentication

The `x-prestruct-refresh` header triggers a cache bust for a specific path.
It is authenticated by comparing the header value to `PRESTRUCT_SECRET` (env var).

Why a shared secret instead of a signed token:
- A signed token (JWT or HMAC) adds implementation complexity and a time-sync
  requirement. For a dev-facing cache flush tool, a shared secret is sufficient.
- If `PRESTRUCT_SECRET` is not set, the refresh feature is disabled entirely.
  An unset secret does not mean "allow all refreshes" -- it means "feature off."

This is intentional. The risk of accidentally leaving an unauthenticated refresh
endpoint live outweighs the inconvenience of requiring the env var to be set before
the feature works.

---

## targetUrl vs siteUrl

`config.proxy.targetUrl` lets the proxy render a different origin than `siteUrl`.

Use cases:
- WordPress behind Cloudflare: `siteUrl` is the public domain, `targetUrl` is
  the WordPress origin (or `http://localhost:8080` if the proxy is co-located).
- Staging environments: point `targetUrl` at a staging URL while `siteUrl` remains
  production, so bots see the production URL in meta but content is fetched from staging.
- Local dev: `targetUrl: 'http://localhost:5173'` lets you run the proxy locally
  against a `vite dev` server.

The localhost loopback case works when the proxy and the target server run on the
same machine. Puppeteer resolves `localhost` in the context of the proxy process,
not the requesting client. On a VPS this means the proxy host must also be running
the target server.

---

## Cloudflare Worker constraints

The Worker version (`proxy.worker.js`) requires:

- Workers Paid plan. Browser Rendering is not available on free.
- A `[[browser]]` binding in `wrangler.toml`. The binding name must be `BROWSER`.
- A KV namespace for cache storage. The binding name must be `CACHE`.
- `PRESTRUCT_TARGET_URL` in `[vars]`.
- `PRESTRUCT_SECRET` set via `wrangler secret put` (never in wrangler.toml).

`@cloudflare/puppeteer` is not the same as `puppeteer`. It wraps CF's managed
Chromium and does not support all Puppeteer APIs. The subset used here (goto,
content, setViewport, setExtraHTTPHeaders) is supported as of early 2025.
Check the CF docs before adding any new Puppeteer calls.

KV is eventually consistent. A cache bust via `x-prestruct-refresh` may take a
few seconds to propagate to all CF edge nodes globally.

---

## What the proxy does NOT replace

The proxy is additive, not a replacement for build-time prerender.

- `prerender.js` still runs at build time and produces static HTML for all
  configured routes. Humans served by CF Pages always get static HTML.
- The proxy handles bots that hit URLs the build didn't prerender (dynamic routes,
  paginated URLs, search queries, etc.) or when content has changed since the
  last build.
- The proxy is optional. If `config.proxy.url` is null, the build pipeline is
  unchanged and the proxy files are unused.

---

## Pagefind search in Jekyll docs

The docs site uses Pagefind for client-side search. This section covers
implementation details and gotchas discovered during integration.

### Why dynamic import

Pagefind's official UI requires bundling or using their pre-built widget.
Neither works well with Jekyll + GitHub Pages. The solution uses dynamic
`import()` to load Pagefind at runtime from `/pagefind/pagefind.js`.

```js
var pagefind = await import('{{ site.baseurl }}/pagefind/pagefind.js');
await pagefind.init();
var resp = await pagefind.search(q);
```

This avoids a build step and works with GitHub Pages' static serve model.

### Workflow integration

The GitHub workflow (`.github/workflows/docs.yml`) downloads and runs Pagefind
after Jekyll builds:

```yaml
- name: Download Pagefind
  run: |
    VERSION=$(curl -sL "https://api.github.com/repos/Pagefind/pagefind/releases/latest" ...)
    curl -sL "https://github.com/Pagefind/pagefind/releases/download/..." -o pagefind.tar.gz
    tar -xzf pagefind.tar.gz
    rm pagefind.tar.gz
- name: Index search with Pagefind
  run: ./pagefind --site _site
```

### Exclude from Jekyll

Add `exclude: [pagefind*]` to `_config.yml` to prevent Jekyll from copying
the binary to the build output.

### The ⌘K in search results problem

**Symptom:** Random "⌘K" appearing in search result titles.

**Root cause:** The ⌘K keyboard shortcut indicator was in the header HTML as
literal text (`<span class="search-bar-shortcut">⌘K</span>`), which Pagefind
indexed along with the rest of the page content.

**Fix:** Move the shortcut indicator entirely to CSS using pseudo-element:

```css
.search-bar-shortcut::after {
  content: "\u2318K";
}
```

Then remove the `<span>⌘K</span>` from HTML. This keeps the shortcut visible
in the rendered search bar but removes it from the indexed content.

### URL handling with baseurl

Pagefind returns URLs with the baseurl prepended. If your docs live at a
subdirectory (e.g., `/prestruct/`), the returned URLs already include it.
To avoid doubling:

```js
var baseurl = '{{ site.baseurl }}';
var url = data.url && data.url.startsWith(baseurl)
  ? data.url
  : baseurl + data.url;
```

### Security notes

- Search runs entirely client-side in the browser
- No user input is sent to any server
- Pagefind processes locally-cached index data (JSON + WASM)
- The only network request is fetching the index chunks from the same origin
- No authentication or CORS concerns since everything is static

### Future work

- Add keyboard navigation (arrow keys + Enter) to search results
- Consider highlighting matched terms in results
- May need to update AGENTS.md if Pagefind API changes
