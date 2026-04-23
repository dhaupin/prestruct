---
layout: default
title: Vite Integration
nav_order: 7
---


Setting up Vite 5+ for prestruct.

## Why Vite?

Prestruct uses Vite's `ssrLoadModule` API to load your app in Node for prerendering. This requires Vite 5+.

## Basic Setup

### vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Ensure consistent asset naming
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  // Required for ssrLoadModule
  server: {
    middlewareMode: true
  }
})
```

## SSR-Specific Configuration

### Ensure ESM Output

```js
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild'
  }
})
```

### Resolve Aliases

```js
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
      '$components': '/src/components'
    }
  }
})
```

## Build Output Structure

After `npm run build`, your `dist/` should look like:

```
dist/
├── index.html              # Shell with global meta
├── about/
│   └── index.html          # Prerendered about page
├── blog/
│   ├── index.html          # Blog index
│   └── hello-world/
│       └── index.html      # Prerendered blog post
├── assets/
│   ├── index-abc123.js     # Hashed JS bundle
│   └── index-def456.css    # Hashed CSS bundle
├── sitemap.xml             # Auto-generated
└── 404.html                # 404 page
```

## Development

### Hot Module Replacement

Vite provides HMR for development:

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`.

### Preview Prerendered Build

```bash
npm run preview
```

Serves the `dist/` folder at `http://localhost:4173`.

## Advanced Configuration

### Code Splitting

```js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Add heavy dependencies here
        }
      }
    }
  }
})
```

### Environment Variables

```js
// vite.config.js
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_SITE_URL': JSON.stringify(process.env.VITE_SITE_URL)
  }
}))
```

Use in your app:

```js
const SITE_URL = import.meta.env.VITE_SITE_URL
```

### Handling Static Assets

Place static assets in `public/`:

```
public/
├── favicon.ico
├── og-image.png
└── robots.txt
```

These are copied to `dist/` during build.

## Troubleshooting

### "Failed to resolve import"

Check your import paths - Vite requires:
- Relative imports: `./component` not `component`
- Explicit extensions: `./component.jsx` not `./component`

### "Module not found" during build

Ensure all dependencies are in `package.json`, not just `package-lock.json`.

### Asset paths wrong in production

Check `base` option in vite.config.js:

```js
// If deploying to subdirectory
export default defineConfig({
  base: '/my-subfolder/',
  // ...
})
```

Update `ssr.config.js` siteUrl to match.

## Production Build

The complete build script runs three commands:

```json
{
  "scripts": {
    "build": "vite build && node scripts/inject-brand.js && node scripts/prerender.js"
  }
}
```

1. **vite build**: Creates JS/CSS bundles
2. **inject-brand.js**: Injects global meta into index.html
3. **prerender.js**: Renders each route to static HTML