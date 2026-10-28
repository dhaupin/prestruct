---
layout: default
title: Troubleshooting
description: "Common failure modes and their fixes: blank prerenders, missing pages, cache surprises, and deploy errors."
nav_order: 23
version: 1.0.0
permalink: /guides/troubleshooting
---


Solutions to common issues when using prestruct.

## Build Errors

### "Cannot find module 'react-router-dom/server'"

**Cause:** Node's ESM resolver requires explicit `.js` extension on CF Pages.

**Solution:**Use `react-router-dom/server.js` (with `.js` extension):

```js
// Wrong
import { renderToString } from 'react-router-dom/server'

// Correct
import { renderToString } from 'react-router-dom/server.js'
```

---

### "Module not found: Error: Can't resolve 'react-router-dom/server'"

Same as above - add the `.js` extension.

---

### "window is not defined"

**Cause:** Code is accessing `window`, `document`, or `localStorage` during SSR render.

**Solution:**Guard browser-only code:

```jsx
// Wrong
const [theme] = useState(localStorage.getItem('theme'))

// Correct
const [theme] = useState(() => {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem('theme') || 'light'
})
```

Or use `useEffect`:

```jsx
useEffect(() => {
  // Safe here - only runs in browser
  const saved = localStorage.getItem('theme')
  if (saved) setTheme(saved)
}, [])
```

---

### "localStorage is not defined"

Same cause as above. See the `typeof window` guard solution.

---

### Hydration Mismatch / FOUC (Flash of Unstyled Content)

**Cause:** Server HTML doesn't match client render.

**Common causes:**

1. **Missing `hydrateRoot`**: Using `createRoot` instead of `hydrateRoot`

```jsx
// main.jsx
const root = document.getElementById('root')

if (root.dataset.serverRendered) {
  // SSR content exists - hydrate it
  ReactDOM.hydrateRoot(root, <App />)
} else {
  // No SSR - create fresh
  ReactDOM.createRoot(root).render(<App />)
}
```

2. **Inline `<style>` tags in JSX**: React 18 handles these differently in SSR vs client

```jsx
// Wrong
return <div style={{...}}><style>{`.foo { color: red }`}</style></div>

// Correct - use external CSS or style props
return <div style={{ color: 'red' }} />
```

3. **Random values at render time**: `Math.random()`, `Date.now()`

```jsx
// Wrong - different on server vs client
return <div>{Math.random()}</div>

// Correct - use useEffect
const [value, setValue] = useState()
useEffect(() => {
  setValue(Math.random())
}, [])
```

---

## Prerendering Issues

### Every route prerenders as the homepage

**Cause:** `AppLayout.jsx` imports `BrowserRouter` somewhere in its module graph.

**Solution:**
1. Create a separate `AppLayout.jsx` that NEVER imports `BrowserRouter`
2. Only import `Routes`, `Route`, `useLocation`
3. Wrap in `BrowserRouter` in your `App.jsx`

```jsx
// AppLayout.jsx - NO BrowserRouter!
import { Routes, Route } from 'react-router-dom'
// ... never import BrowserRouter here

// App.jsx - BrowserRouter goes here
import { BrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'

export default function App() {
  return <BrowserRouter><AppLayout /></BrowserRouter>
}
```

**Debugging:** Check every file that AppLayout imports - none can import BrowserRouter.

---

### react-router 7: "useLocation() may be used only in the context of a <Router>" or "module is not defined"

**Cause:** react-router-dom 7 ships real ESM. If your `vite.config.js` sets
`ssr.noExternal` for the router (the workaround older prestruct versions needed),
Vite inlines the package into the SSR module registry. The engine's StaticRouter
and your `AppLayout` then load through two different module instances, and each
instance mints its own React contexts - so the router's location context never
reaches your tree and every route fails:

```text
[prerender] FAIL /: useLocation() may be used only in the context of a <Router> component.
```

A second signature (`module is not defined`, or `exports is not defined` on
v6) appears when the inlined CJS entry is evaluated as ESM.

**Solution:** Update prestruct. The engine now redirects the inlined router to
its ESM twin and loads `StaticRouter` through the same registry as your layout,
so both majors work with or without `ssr.noExternal`. If you added the
`web/scripts/rrdom-esm-redirect.mjs` shim and the two `ssr.noExternal` lines
from an older release, remove them and re-run `prestruct build` - it should end
`Done. n/n pages rendered`.

---

### Route with trailing slash generates wrong canonical URL

**Cause:** Mismatch between route path and desired URL.

**Solution:**Be consistent in your `ssr.config.js`:

```js
// If you want /about/ (with trailing slash)
{ path: '/about/', meta: {...} }

// If you want /about (no trailing slash)
{ path: '/about', meta: {...} }
```

React Router v6 handles both, but pick one style and stick with it.

---

### Infinite redirect loop on Cloudflare Pages

**Cause:** Including `/* /index.html 200` in `_redirects` after prerendering.

**Solution:** Remove the SPA fallback rule. Once prerendered, every route has its own `index.html`. The fallback causes CF Pages to rewrite to `/index.html`, which then matches the rule again.

```text
# _redirects after prerendering - keep only rules that map paths with no
# prerendered file. The line /index.html 200 must be gone entirely.
/status/* /status.html 301
```

---

## SEO Issues

### Duplicate meta tags

**Cause:** Meta tags in both `index.html` and injected by prestruct.

**Solution:**Remove meta tags from your `index.html` - let prestruct inject them:

```html
<!-- Remove these from index.html -->
<title>...</title>
<meta name="description" content="...">

<!-- Keep only the placeholder -->
<title>[title]</title>
<meta name="description" content="[description]">
```

---

### Changing 404 robots behavior

The 404 page ALWAYS carries:

```html
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
```

There is no config switch for this (404s should not rank). If you genuinely
need different behavior, edit `scripts/prerender.js` in your own project
(template copies are user-owned, engine files are not).

---

### "$120" becomes corrupted in descriptions

**Cause:** `String.replace()` interprets `$1`, `$2` as regex backreferences.

**Solution:**Prestruct automatically escapes `$` with `$$$$`. If manually replacing, do the same:

```js
const desc = description.replace(/\$/g, '$$$$')
```

---

## Cloudflare Pages Issues

### Build fails on Cloudflare but works locally

**Check:**
1. Node.js version set to 18+ in Cloudflare settings
2. All dependencies in `package.json` (not just `package-lock.json`)
3. Build command matches local: `npm run build`

### Site shows "404" for all routes

**Cause:** `dist/` lacks per-route HTML -- the build stopped after `vite build`,
or prerendering failed: the CLI now exits 1 and lists every failed route, so
this usually shows up as a failed build, not as a silently-deployed 404.

**Solution:**
1. Check `dist/about/index.html` (etc.) exists after a local build
2. Run `npx prestruct validate` -- it exits 1 on a bad config and prints every
   diagnostic line-by-line. (Non-strict *build* runs only print diagnostics;
   set `PRESTRUCT_STRICT=1` to make them fatal there.)
3. `public/_redirects` is NOT required for routing on Cloudflare Pages

---

### Assets return 404

**Cause:** Asset paths don't match what's in your `dist/`.

**Solution:**Check that your Vite config outputs to `dist/` and that paths in HTML match the hashed filenames.

---

## Proxy Issues

### Proxy returns 502 Bad Gateway / render failures

**Cause:** Target URL unreachable or timing out.

**Check:**
1. Worker: `PRESTRUCT_TARGET_URL` var; VPS: `config.proxy.targetUrl` (falls
   back to `config.siteUrl`)
2. Target server is running and accessible
3. No firewall blocking the request

On unrenderable targets both runtimes fall through to a 302 to the live site
rather than 5xx.

---

### Proxy cache-bust quietly ignored

**Cause:** `PRESTRUCT_SECRET` not set where the proxy runs (wrangler secret on
the Worker, env var on the VPS) or the `x-prestruct-refresh` header value does
not match.

**Note:** an UNSET secret never means "allow all" -- refresh is disabled
entirely, and each runtime warns about it on boot. Compare is constant-time in
both runtimes.

---

## Debugging Tips

### Watch the build's own diagnostics

Prerender logs per-route status (`ok /route`, `cached /route`) and any
`[prestruct] config:` validation lines -- no debug flag needed. To fail on
diagnostics in CI: `PRESTRUCT_STRICT=1`.

### Check prerendered output

Look in `dist/` after build:

```bash
ls -la dist/
cat dist/about/index.html | grep -E '<title>|<meta'
```

### Test locally with Cloudflare Pages

```bash
npx wrangler pages dev dist
```

### Inspect hydration

Add this to see server vs client content:

```jsx
console.log('Server content:', document.getElementById('root').innerHTML.substring(0, 200))
```

---

## Next steps

- [Config Reference](/prestruct/guides/config) - avoid the config-shaped failures above
- [Migration Guide](/prestruct/guides/migration) - moving from another setup

## Getting Help

- [Open an issue](https://github.com/dhaupin/prestruct/issues)
- [Discussions](https://github.com/dhaupin/prestruct/discussions)
- [Check existing issues](https://github.com/dhaupin/prestruct/issues?q=is%3Aissue)