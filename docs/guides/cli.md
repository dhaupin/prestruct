---
layout: default
title: CLI Reference
nav_order: 5
---

All commands and scripts available in prestruct.

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