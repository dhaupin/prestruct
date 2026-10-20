---
layout: default
title: Examples
nav_order: 19
version: 1.0.0
permalink: /guides/examples
---

Real-world usage patterns and project structure.

## Project structure

Typical prestruct project:

```text
my-app/
├── src/
│   ├── App.jsx           # Main app with BrowserRouter
│   ├── AppLayout.jsx     # Layout component (no BrowserRouter)
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   └── Blog.jsx
│   ├── islands/
│   │   └── CartWidget.jsx  # Dynamic island component
│   ├── AppIslands.jsx      # Island registry
├── scripts/
│   ├── prerender.js      # Build-time prerender
│   └── proxy.js          # Optional bot proxy
├── ssr.config.js         # Prerender configuration
├── wrangler.toml         # Cloudflare Pages config
└── package.json
```

## Static site with islands

Extract AppLayout from your app to separate the prerenderable portion:

```jsx
// AppLayout.jsx - renders at build time
import { Routes, Route } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div>
      <nav>...</nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
      <footer>...</footer>
    </div>
  )
}
```

## Dynamic island component

The component is mounted INTO the placeholder after hydration -- it never
lives inside the `<pre-island>` JSX (that would render at build time):

```jsx
// src/islands/CartWidget.jsx
export default function CartWidget() {
  const [items, setItems] = useState([])
  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('cart') || '[]'))
  }, [])
  if (!items.length) return null
  return <div>{items.length} items</div>
}
```

Expose it through the registry, use the placeholder in pages:

```jsx
// src/AppIslands.jsx
import CartWidget from './islands/CartWidget.jsx'
export const islands = { 'cart-widget': CartWidget }
```

```jsx
// In any page -- fallback content is what crawlers see
<pre-island data-pre-island="cart-widget" data-pre-load="visible">
  <div className="skeleton">Loading cart...</div>
</pre-island>
```

Mount from AppLayout's route-change effect:

```jsx
// src/AppLayout.jsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { mountIslands } from './islands.js'
import { islands } from './AppIslands.jsx'

const { pathname } = useLocation()
useEffect(() => {
  const timer = setTimeout(() => mountIslands(islands), 0)
  return () => clearTimeout(timer)
}, [pathname])
```

## Deploy to Cloudflare Pages

Build and deploy:

```bash
# Build
npm run build

# Deploy
wrangler pages deploy dist
```

## With proxy

For dynamic routes or frequent content updates:

1. Set `config.proxy.url` in ssr.config.js (the build then widens the CSP
   `connect-src` allow-list with that origin)
2. Deploy the proxy itself: VPS Node/Puppeteer, or Cloudflare Worker
3. Route bot traffic to it ahead of Pages (DNS/proxy fronting) -- Pages keeps
   serving static HTML to humans; the two layers stack, they don't replace
   each other

See [Bot-Render Proxy](/prestruct/guides/proxy) for full setup.

## Next steps

- [Advanced Islands](/prestruct/guides/advanced-islands) - the dynamic-island patterns in depth
- [Migration Guide](/prestruct/guides/migration) - porting an existing app in