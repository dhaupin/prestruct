---
layout: default
title: Getting Started
description: Install prestruct, activate ssr.config.js, scaffold routes, and run your first prerendered build.
nav_order: 2
version: 1.0.0
permalink: /guides/getting-started
---


Build a fully-prerendered React app for Cloudflare Pages in minutes.

## Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare Pages project (or GitHub account to create one)

## Quick Start

### 1. Add prestruct to Your Project

In an existing Vite + React project:

```bash
npm i -D prestruct
npx prestruct init          # scaffolds ssr.config.example.js + starter files
cp ssr.config.example.js ssr.config.js
```

### 2. Configure Your Site

Edit `ssr.config.js` in your project root:

```js
export default {
  siteUrl: 'https://your-domain.com',
  siteName: 'Your Site Name',
  author: 'Your Name',
  tagline: 'Your tagline here',
  ogImage: 'https://your-domain.com/og-image.jpg',
  keywords: 'keyword one, keyword two',
  
  appLayoutPath: '/src/AppLayout.jsx',
  
  routes: [
    {
      path: '/',
      priority: '1.0',
      changefreq: 'weekly',
      meta: {
        title: 'Home | Your Site',
        description: 'Your homepage description (150-160 chars)',
      }
    },
    {
      path: '/about/',
      priority: '0.8',
      changefreq: 'monthly',
      meta: {
        title: 'About | Your Site',
        description: 'Learn more about us...',
      }
    }
  ],
  
  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Your Org',
        url: 'https://your-domain.com',
      }
    ]
  }
}
```

### 3. Add Your Pages

Create your page components in `src/pages/`:

```jsx
// src/pages/Home.jsx
import usePageMeta from '../hooks/usePageMeta.js'

export default function Home() {
  usePageMeta({
    path: '/',
    title: 'Home | Your Site',
    description: 'Your homepage description',
  })
  
  return (
    <div>
      <h1>Welcome to My Site</h1>
    </div>
  )
}
```

### 4. Define Your Routes

Update `src/AppLayout.jsx` with your routes:

```jsx
// src/AppLayout.jsx - NOTE: No BrowserRouter here!
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import About from './pages/About'

// Scroll to top on navigation
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
    }
  }, [pathname])
  return null
}

export default function AppLayout() {
  return (
    <>
      <ScrollToTop />
      <nav>{/* Your nav here */}</nav>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about/" element={<About />} />
        </Routes>
      </main>
      <footer>{/* Your footer here */}</footer>
    </>
  )
}
```

Then wrap it in BrowserRouter in `src/App.jsx`:

```jsx
// src/App.jsx
import { BrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
```

### 5. Build

```bash
npm run build
```

This runs three steps:
1. `vite build` - Creates your JS/CSS bundles
2. `node scripts/inject-brand.js` - Injects global SEO meta
3. `node scripts/prerender.js` - Prerenders each route to HTML

### 6. Preview Locally

The template has no `preview` npm script; run Vite's preview server directly:

```bash
npx vite preview
```

Serves `dist/` at `http://localhost:4173`.

### 7. Deploy to Cloudflare Pages

1. Push your code to GitHub
2. Go to Cloudflare Dashboard -> Pages
3. Connect your GitHub repository
4. Set build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `18`
5. Deploy!

## Project Structure

```text
my-app/
├── ssr.config.js          # Your config (routes, meta, schema)
├── package.json           # Build: "vite build && node scripts/inject-brand.js && node scripts/prerender.js"
├── vite.config.js         # Standard Vite config
├── public/                # Static assets
│   ├── _headers           # Cloudflare security headers
│   ├── _redirects         # Cloudflare redirects
│   └── favicon.ico
├── src/
│   ├── main.jsx           # Client entry (hydrateRoot)
│   ├── App.jsx            # BrowserRouter wrapper
│   ├── AppLayout.jsx      # Routes + layout (NO BrowserRouter!)
│   ├── AppIslands.jsx     # Island registry
│   ├── hooks/
│   │   └── usePageMeta.js # SEO meta hook
│   ├── islands/           # Dynamic island components
│   └── pages/             # Your page components
├── scripts/
│   ├── inject-brand.js    # Injects global meta
│   └── prerender.js       # Prerenders routes to HTML
└── dist/                  # Build output (generated)
    ├── index.html
    ├── about/
    │   └── index.html
    ├── sitemap.xml
    └── 404.html
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SITE_URL` | Base URL used by `usePageMeta` when no explicit `siteUrl` is passed | From ssr.config.js |

The only other prestruct env var is `PRESTRUCT_STRICT=1`, which fails the build
on config errors. Off by default -- diagnostics print, the build continues with
the valid routes. Prerender failures always exit 1 regardless. See the
[CLI Reference](/prestruct/guides/cli).

## Next Steps

- [Configuration Reference](/prestruct/guides/config)
- [SEO Guide](/prestruct/guides/seo)
- [Performance](/prestruct/guides/performance)