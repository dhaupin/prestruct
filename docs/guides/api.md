---
layout: default
title: API Reference
description: Importable module surface of the engine: prerender, injectMeta, generateSitemap, injectBrand, and validateConfig.
nav_order: 9
version: 1.0.0
permalink: /guides/api
---


Complete API documentation for prestruct hooks and utilities.

## usePageMeta

Keeps head tags in sync during client-side navigation.

### Signature

```js
usePageMeta({
  title,
  description,
  path,
  siteUrl
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Page title (used for `<title>`, og:title, twitter:title) |
| `description` | string | No | Meta description (used for meta description, og:description, twitter:description) |
| `path` | string | Yes | Route path for canonical URL generation |
| `siteUrl` | string | No | Full site URL. Defaults to `import.meta.env.VITE_SITE_URL` |

### Usage

```jsx
import usePageMeta from '../hooks/usePageMeta.js'

export default function About() {
  usePageMeta({
    siteUrl: 'https://example.com',
    path: '/about/',
    title: 'About | Example',
    description: 'Learn more about our mission.',
  })
  
  return <div>About page content</div>
}
```

### Tags Updated

This hook updates these tags on navigation:

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `<meta property="og:url">`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta name="twitter:title">`
- `<meta name="twitter:description">`

These tags remain unchanged (set once at load):

- `og:image`, `og:type`, `og:locale`, `og:site_name`
- `twitter:card`, `twitter:image`

### Tip: Wrapper Hook

Avoid repeating `siteUrl` in every page:

```jsx
// src/hooks/useMeta.js
import usePageMeta from './usePageMeta.js'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://example.com'

export default function useMeta(config) {
  return usePageMeta({
    siteUrl: SITE_URL,
    ...config
  })
}

// Now in pages:
import useMeta from '../hooks/useMeta.js'

function About() {
  useMeta({
    path: '/about/',
    title: 'About | Example',
    description: '...',
  })
}
```

---

## mountIslands

Mounts dynamic React components into `<pre-island>` placeholders.

### Signature

```js
mountIslands(registry)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `registry` | object | Yes | Map of island names to React components |

### Usage

```jsx
import { mountIslands } from './islands.js'
import { islands } from './AppIslands.jsx'

// In AppLayout.jsx - call after each navigation
useEffect(() => {
  const timer = setTimeout(() => mountIslands(islands), 0)
  return () => clearTimeout(timer)
}, [pathname])
```

### Registry Format

```js
// src/AppIslands.jsx
import RecentlyViewed from './islands/RecentlyViewed.jsx'
import CartWidget from './islands/CartWidget.jsx'

export const islands = {
  'recently-viewed': RecentlyViewed,
  'cart-widget': CartWidget,
}
```

---

## pre-island Element

Custom element for declaring dynamic content.

### Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-pre-island` | string | Required | Island name (must match registry key) |
| `data-pre-load` | `eager` \| `visible` \| `idle` | `eager` | Load strategy |

### Examples

```jsx
// Mounts immediately after hydration
<pre-island data-pre-island="recently-viewed" />

// Mounts when scrolled into view
<pre-island data-pre-island="cart-widget" data-pre-load="visible">
  <span className="loading">Loading cart...</span>
</pre-island>

// Mounts during browser idle time
<pre-island data-pre-island="promo-banner" data-pre-load="idle" />
```

### Fallback Content

Content inside `<pre-island>` renders in the static HTML and is visible to crawlers:

```jsx
<pre-island data-pre-island="cart-widget">
  <div className="cart-skeleton">
    <div className="skeleton-line"></div>
    <div className="skeleton-line"></div>
  </div>
</pre-island>
```

This shows a skeleton while the React component loads.

---

## Load Strategies

### eager (default)

Mounts immediately after `mountIslands()` is called.

```jsx
<pre-island data-pre-island="header-cart" />
```

### visible

Mounts when the element enters the viewport using IntersectionObserver.

```jsx
<pre-island data-pre-island="footer-newsletter" data-pre-load="visible" />
```

### idle

Mounts during browser idle time using `requestIdleCallback`. Falls back to `setTimeout(200)` if unavailable.

```jsx
<pre-island data-pre-island="chat-widget" data-pre-load="idle" />
```

---

## Island Components

### Props

`mountIslands()` renders each registry component with **no props** --
`ReactDOM.createRoot(el).render(React.createElement(Component))` -- and they
cannot access React context from the main tree. To pass data:

**Option 1: Use global state / localStorage**

```jsx
export default function CartWidget() {
  const [items, setItems] = useState([])
  
  useEffect(() => {
    // Read from your state management or localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    setItems(cart)
  }, [])
  
  return <div>{items.length} items in cart</div>
}
```

---

## ssr.config.js

### Required Fields

```js
export default {
  siteUrl: 'https://example.com',  // No trailing slash
  appLayoutPath: '/src/AppLayout.jsx',  // Optional -- this exact path is the engine default
  routes: [
    {
      path: '/',
      meta: { title: 'Home', description: '...' }
    }
  ]
}
```

### Optional Fields

```js
export default {
  // Site identity
  siteName: 'Example',
  author: 'Your Name',
  tagline: 'Your tagline',
  ogImage: '/og-default.png',
  keywords: 'keyword1, keyword2',
  
  // Routes
  routes: [
    {
      path: '/',
      priority: '1.0',         // Sitemap priority (number or string)
      changefreq: 'weekly',   // daily | weekly | monthly | yearly
      meta: {
        title: 'Home | Example',
        description: '...',
        ogImage: '/custom-og.png',  // Optional per-route OG image override
      }
    }
  ],
  
  // JSON-LD structured data
  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Example',
        url: 'https://example.com'
      }
    ]
  },
  
  // Bot proxy (optional) -- cache-refresh auth is the PRESTRUCT_SECRET env
  // var, never config. Unset secret = refresh disabled, not allow-all.
  proxy: {
    url: 'https://proxy.example.com',
    targetUrl: 'https://origin.example.com',   // optional
    botList: ['googlebot', 'bingbot']
  },

  // Opt-in robots.txt generation (false = public/robots.txt stays untouched)
  robots: true,

  // Custom 404 content (prerendered with noindex, always)
  notFound: {
    heading: 'Page not found',
    body: "That page doesn't exist.",
    primaryCta: { label: 'Go home', href: '/' },
  }
}
```

See the [full config reference](/prestruct/guides/config) for every key, including
`platform`, `deployId`, `deployIdFooter`, and `fetchRoutes()`.

---

## Environment Variables

### Build Time

| Variable | Description |
|----------|-------------|
| `VITE_SITE_URL` | Base URL used by usePageMeta when no explicit siteUrl is passed |
| `PRESTRUCT_STRICT=1` | Fail the build (exit 1) on config diagnostics; off by default, diagnostics print and the build continues with the valid routes |

### Proxy Runtime (set where the proxy runs, not in the Pages app)

| Variable | Description |
|----------|-------------|
| `PRESTRUCT_SECRET` | Shared secret for the x-prestruct-refresh cache bust |
| `PRESTRUCT_TARGET_URL` | Worker-only: origin the proxy renders |
| `PRESTRUCT_CACHE_DIR` | VPS-only: relocate the render cache directory (default `.prestruct_cache`) |

## Next steps

- [Config Reference](/prestruct/guides/config) - the full `ssr.config.js` surface
- [Advanced Islands](/prestruct/guides/advanced-islands) - the patterns behind the `mountIslands` contract