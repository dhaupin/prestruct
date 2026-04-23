---
layout: default
title: Troubleshooting
nav_order: 4
---


Solutions to common issues when using prestruct.

## Build Errors

### "Cannot find module 'react-router-dom/server'"

**Cause:** Node's ESM resolver requires explicit `.js` extension on CF Pages.

**Solution:** Use `react-router-dom/server.js` (with `.js` extension):

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

**Solution:** Guard browser-only code:

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

### Route with trailing slash generates wrong canonical URL

**Cause:** Mismatch between route path and desired URL.

**Solution:** Be consistent in your `ssr.config.js`:

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

```bash
/* /index.html 200
```

---

## SEO Issues

### Duplicate meta tags

**Cause:** Meta tags in both `index.html` and injected by prestruct.

**Solution:** Remove meta tags from your `index.html` - let prestruct inject them:

```html
<!-- Remove these from index.html -->
<title>...</title>
<meta name="description" content="...">

<!-- Keep only the placeholder -->
<title>[title]</title>
<meta name="description" content="[description]">
```

---

### 404 pages being indexed

**This is expected behavior.** Prestruct adds `noindex` to 404 pages to prevent them from appearing in search results.

If you want 404s indexed, you can override in `prerender.js`:

```js
// In generate404 function
html = html.replace(
  '<meta name="robots" content="noindex, nofollow" />',
  '' // Remove noindex
)
```

---

### "$120" becomes corrupted in descriptions

**Cause:** `String.replace()` interprets `$1`, `$2` as regex backreferences.

**Solution:** Prestruct automatically escapes `$` with `$$$$`. If manually replacing, do the same:

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

**Cause:** Missing `_redirects` file or incorrect configuration.

**Solution:** Ensure `public/_redirects` exists (even if empty). Cloudflare Pages needs it to enable routing.

---

### Assets return 404

**Cause:** Asset paths don't match what's in your `dist/`.

**Solution:** Check that your Vite config outputs to `dist/` and that paths in HTML match the hashed filenames.

---

## Proxy Issues

### Proxy returns 502 Bad Gateway

**Cause:** Target URL is unreachable or timing out.

**Check:**
1. `PRESTRUCT_TARGET_URL` is set correctly
2. Target server is running and accessible
3. No firewall blocking the request

---

### Proxy authentication fails

**Cause:** Wrong or missing secret token.

**Solution:** 
1. Set `PRESTRUCT_SECRET` in Cloudflare wrangler.toml or secrets
2. Send the header: `x-prestruct-refresh: your-secret`

---

## Debugging Tips

### Enable verbose logging

```bash
DEBUG=prestruct:* npm run build
```

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

## Getting Help

- [Open an issue](https://github.com/dhaupin/prestruct/issues)
- [Discussions](https://github.com/dhaupin/prestruct/discussions)
- [Check existing issues](https://github.com/dhaupin/prestruct/issues?q=is%3Aissue)