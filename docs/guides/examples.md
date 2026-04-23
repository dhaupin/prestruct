---
layout: default
title: Examples
nav_order: 19
---

Real-world usage patterns and project structure.

## Project structure

Typical prestruct project:

```
my-app/
├── src/
│   ├── App.jsx           # Main app with BrowserRouter
│   ├── AppLayout.jsx     # Layout component (no BrowserRouter)
│   ├── routes/
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   └── Blog.jsx
│   └── islands/
│       └── Cart.jsx      # Dynamic island component
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

Wrap client-only components in `<pre-island>` for hydration after load:

```jsx
// islands/Cart.jsx
export default function Cart() {
  const [items, setItems] = useState([])
  
  return (
    <pre-island data-pre-load="visible">
      <CartWidget items={items} />
    </pre-island>
  )
}
```

Mount in client entry:

```js
// main.jsx
import { mountIslands } from './islands'
mountIslands()
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

1. Set config.proxy.url in ssr.config.js
2. Deploy proxy worker
3. Point Cloudflare Pages to proxy URL

See [Proxy](/guides/proxy) for full setup.