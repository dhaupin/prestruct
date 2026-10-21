---
layout: default
title: Vite Integration
description: "Vite integration details: the custom dev config, SSR module loading, and the template vite.config.js setup."
nav_order: 22
version: 1.0.0
permalink: /guides/vite
---


Setting up Vite 5+ for prestruct.

## Why Vite?

Prestruct uses Vite's `ssrLoadModule` API to load your app in Node for prerendering. This requires Vite 5+.

## Basic Setup

The template's `vite.config.js` is deliberately minimal -- no `server` block,
no custom `build` output (Vite's defaults already emit hashed bundles to
`dist/assets/`):

```js
import react from '@vitejs/plugin-react'

export default {
  plugins: [react()],
}
```

The plugin matters: without `@vitejs/plugin-react`, JSX compiles through
esbuild's classic runtime, which expects an in-scope `React` binding. Under
`ssrLoadModule` that surfaces as `React is not defined` per route and prerender
silently degrades to the SPA fallback.

Do NOT add `server: { middlewareMode: true }` to your own config -- prerender
spins up its own middleware-mode Vite dev server internally; your config's
`server` settings only affect your own `vite dev` runs.

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

```text
dist/
|-- index.html              # Shell with global meta
|-- about/
|   `-- index.html          # Prerendered about page
|-- blog/
|   |-- index.html          # Blog index
|   `-- hello-world/
|       `-- index.html      # Prerendered blog post
|-- assets/
|   |-- index-abc123.js     # Hashed JS bundle
|   `-- index-def456.css    # Hashed CSS bundle
|-- sitemap.xml             # Auto-generated
`-- 404.html                # 404 page
```

## Development

### Local dev server

The template has no `dev` npm script; run Vite directly:

```bash
npx vite
```

Vite dev server at `http://localhost:5173` (SPA only -- prerendered output is
not re-rendered here).

### Preview Prerendered Build

```bash
npx vite preview
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

```text
public/
|-- favicon.ico
|-- og-image.png
`-- robots.txt
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

## Next steps

- [CLI Reference](/prestruct/guides/cli) - `prestruct build` wraps this whole pipeline
- [Troubleshooting](/prestruct/guides/troubleshooting) - hydration, prerender, and asset failures