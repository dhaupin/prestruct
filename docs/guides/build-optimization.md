---
layout: default
title: Build Optimization
nav_order: 14
version: 1.0.0
permalink: /guides/build-optimization
---


Optimizing the prestruct build for speed and efficiency.

## Build Process Overview

```text
npm run build
    │
    ├─► vite build          → JS/CSS bundles in dist/assets/
    │
    ├─► inject-brand.js     → Global meta in index.html
    │
    └─► prerender.js        → Per-route HTML generation
         │
         ├─► Start Vite dev server (SSR mode)
         ├─► ssrLoadModule(AppLayout)
         ├─► renderToString(StaticRouter)
         ├─► Inject route meta
         └─► Write dist/[route]/index.html
```

## Speeding Up the Build

### 1. Reduce Route Count

Every route adds time. Batch similar pages:

```js
// Instead of individual product pages
routes: [
  { path: '/products/', meta: {...} },
  { path: '/products/item-1/', meta: {...} },
  { path: '/products/item-2/', meta: {...} },
  // ... 100 more
]

// Consider pagination or category pages
routes: [
  { path: '/products/', meta: {...} },
  { path: '/products/category/a/', meta: {...} },
  { path: '/products/category/b/', meta: {...} },
]
```

### 2. Optimize Route Dependencies

The more imports in your AppLayout, the slower prerendering:

```jsx
// AppLayout.jsx
// BAD: Imports everything
import Nav from './components/Nav'
import Footer from './components/Footer'
import Sidebar from './components/Sidebar'
import Search from './components/Search'
import Cart from './components/Cart'
import UserMenu from './components/UserMenu'

// BETTER: Lazy load heavy components
import { lazy } from 'react'
const Cart = lazy(() => import('./components/Cart'))
const Search = lazy(() => import('./components/Search'))

// EVEN BETTER: Move heavy imports to pages
// Only import what's needed for the layout shell
```

### 3. Simplify AppLayout

Keep AppLayout minimal:

```jsx
// Good: Minimal layout
export default function AppLayout() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about/" element={<About />} />
      </Routes>
      <Footer />
    </>
  )
}

// Avoid: Heavy logic in layout
export default function AppLayout() {
  // Don't do heavy computation here
  const data = fetchData() // Bad!
  const processed = complexProcessing(data) // Bad!
}
```

### 4. Use the Built-In Incremental Cache

Prerender already skips unchanged routes: rendered HTML and its inputs are
cached in `.prestruct/cache/`, and unchanged routes report `◯ path (cached)`
instead of rendering again. Rebuilds only RERENDER routes whose inputs (or
the HTML shell) changed.

```bash
npx prestruct build          # incremental
npx prestruct build --force  # rerender everything, keep the cache file
npx prestruct build --clean  # clear the cache first, then build
```

The build also writes `dist/.prestruct/status.json` (route count, succeeded,
cached, per-route status) -- readable in CI as a cheap build health check.

### 5. Cache Expensive Data

If fetching data for each route:

```js
// ssr.config.js
// BAD: Fetch inside each route
routes: pageRoutes.map(page => ({
  path: page.path,
  meta: { ...page, description: fetchDescription(page.id) } // Fetch for each!
}))

// GOOD: Fetch once, reuse
const pages = await fetchAllPages() // Single fetch
routes: pages.map(page => ({
  path: page.path,
  meta: { title: page.title, description: page.description }
}))
```

## Reducing Bundle Size

### 1. Tree Shaking

Ensure you're not importing unused code:

```jsx
// BAD: Import everything
import _ from 'lodash'

// GOOD: Import specific functions
import debounce from 'lodash/debounce'
import throttle from 'lodash/throttle'

// BETTER: Use native JS
function debounce(fn, ms) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
}
```

### 2. Code Splitting

```js
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['lodash', 'date-fns'],
        }
      }
    }
  }
})
```

### 3. Analyze Bundle

```bash
npm install -D rollup-plugin-visualizer

// vite.config.js
import visualizer from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: 'dist/stats.html' })
  ]
})
```

Then open `dist/stats.html` to see what's contributing to bundle size.

## Caching Strategies

### 1. Vite Cache

Vite caches node_modules in `.vite/`. Don't exclude it from git:

```gitignore
```

### 2. Incremental Prerendering Is Built In

No hand-rolled cache is needed -- see section
[4. Use the Built-In Incremental Cache](#4-use-the-built-in-incremental-cache)
above. The cache invalidates on rendered-input changes automatically; `--clean`
resets it when in doubt.

### 3. Keep the Vite Server in One Build, Not Across Builds

Within one `prestruct build`, the SSR Vite dev server is created once and
reused for every route (that is the ssrLoadModule contract). DO NOT persist a
module-registry across builds -- stale `ssr.config.js` and app-module state
between builds is exactly the class of silent wrongness the incremental cache
exists to avoid.

## Build Output Optimization

### 1. Minification

Vite minifies by default in production. Ensure:

```js
// vite.config.js
export default defineConfig({
  build: {
    minify: 'esbuild', // Default, usually best
    target: 'esnext'   // Smaller output
  }
})
```

### 2. CSS Optimization

```js
export default defineConfig({
  css: {
    devSourcemap: true // Disable in production
  },
  build: {
    cssCodeSplit: true // Default - separate CSS files
  }
})
```

### 3. Remove Console Logs

```js
export default defineConfig({
  build: {
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

## CI/CD Optimization

### GitHub Actions

```yaml
name: Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # Cache npm dependencies
      
      - name: Install
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

### Caching node_modules

```yaml
- uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

## Measuring Build Performance

### Add Timing

```bash
{
  "scripts": {
    "build": "time npm run build"
  }
}

```

### Profile with Node

```bash
node --prof npm run build

node --prof-process isolate*.log
```

## Common Bottlenecks

| Bottleneck | Solution |
|------------|----------|
| Too many routes | Batch or paginate |
| Slow data fetching | Cache or batch |
| Large bundle | Split code, tree shake |
| Heavy imports in AppLayout | Lazy load or move to pages |
| Complex components | Simplify or defer |

## Production Tips

1. **Use Node 20+** - Faster than 18
2. **SSD storage** - Prerendering does lots of I/O
3. **RAM** - More memory = faster builds
4. **Disable antivirus** - Can slow file operations
5. **Cache node_modules in CI** - The install is usually the slowest step
6. **Reduce route count** - One render per unique path is the floor cost

## Next steps

- [Performance](/guides/performance) - what ships to browsers
- [CLI Reference](/guides/cli) - `--force` / `--clean` build flags