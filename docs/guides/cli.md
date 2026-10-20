---
layout: default
title: CLI Reference
nav_order: 5
version: 1.0.0
permalink: /guides/cli
---

All commands and scripts available in prestruct.

## prestruct CLI

The `prestruct` package ships an executable. It runs from any directory that contains a Vite app plus a `ssr.config.js`:

```bash
# Scaffold never-clobber starter files (ssr.config.js, public/_headers, src/AppLayout.jsx, ...)
# Existing files are never overwritten -- safe to run on an existing project.
npx prestruct init

# Validate ssr.config.js only: prints errors line-by-line, exits 1 on the first bad config
npx prestruct validate

# Full pipeline: validate -> vite build -> inject-brand -> prerender
npx prestruct build

# Clear the prerender cache for the current project (optional maintenance)
npx prestruct clean
```

To use these as npm scripts instead, add prestruct to `devDependencies` and wire it up:

```json
{
  "scripts": {
    "build": "prestruct build"
  }
}
```

Note: the scaffolded `init/` app still uses the raw `node` npm-script forms (below); the CLI is the packaged one-entry-point equivalent.

## npm scripts

Run these from your project root:

```bash
# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run prerender manually
npm run prerender

# Lint code
npm run lint

# Format code
npm run format
```

## Build pipeline

The build runs three steps in sequence:

```bash
npm run build
    │
    ├─► vite build          → JS/CSS bundles in dist/assets/
    │
    ├─► inject-brand.js     → Global meta in index.html
    │
    └─► prerender.js        → Per-route HTML generation
```

### prerender only

Run just the prerender step if you've already built:

```bash
npm run prerender

# Custom config
npm run prerender -- --config custom-config.js
```

## Development

Start local dev server for hot reload (client-side only):

```bash
npm run dev
```

Preview built production build:

```bash
npm run preview
```

## Cloudflare CLI

Deploy to Cloudflare Pages:

```bash
# Deploy to production
wrangler pages deploy dist

# Create project
wrangler pages project create my-app

# View deployments
wrangler pages deployment list
```

### Environment variables

```bash
# Set for deploy
CF_PAGES_API_TOKEN=xxx wrangler pages deploy dist
```

## Proxy scripts

Run the optional bot proxy:

```bash
# VPS proxy
node scripts/proxy.js

# With PM2
pm2 start scripts/proxy.js --name prestruct

# Deploy worker
wrangler deploy
```

## Build hooks

Trigger automatic rebuilds on git push:

```bash
# Get hook URL from Cloudflare dashboard
# Add it to your GitHub repo settings → Webhooks
```

## Common issues

| Issue | Fix |
|-------|-----|
| Command not found | Check package.json scripts |
| Build fails | Run `npm run build` with debug |
| Preview not working | Check dist exists |
| `prestruct: command not found` | Install the package locally (`npm i -D prestruct`) or run via `npx` |
| `validate` outputs nothing | That means the config is fine; it prints errors only when something is wrong |