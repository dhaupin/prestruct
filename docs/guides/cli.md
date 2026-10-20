---
layout: default
title: CLI Reference
nav_order: 21
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

# Validate ssr.config.js only: prints every diagnostic line-by-line, exits 1 on a bad config
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

## Template npm scripts

The `init/` template ships exactly these. `prestruct build` is a packaged
re-run of the same `npm run build` pipeline:

```jsonc
{
  "build":    "vite build && node scripts/inject-brand.js && node scripts/prerender.js",
  "test":     "vitest",
  "test:run": "vitest run",
  "test:ui":  "vitest --ui",
  "lint":     "eslint . --ext js,mjs",
  "lint:fix": "eslint . --ext js,mjs --fix"
}
```

There is no `dev` / `preview` / `prerender` npm script in the template. Run
`npx vite dev` / `npx vite preview` directly if you want a local server; the
prerender step only ever runs as part of `build` (or `npx prestruct build`).

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

`prestruct build` adds a fourth step first:

```text
prestruct build
    │
    ├─► validate-config.js  → structured [prestruct] diagnostics
    ├─► vite build
    ├─► inject-brand.js
    └─► prerender.js
```

Config loading is fixed in every entry point: `ssr.config.js` from the
invocation directory (or the nearest parent that has one). There is currently
no `--config` / `--dir` flag.

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

## Next steps

- [Getting Started](/guides/getting-started) - first build from zero
- [Config Reference](/guides/config) - every `ssr.config.js` key
- [Troubleshooting](/guides/troubleshooting) - the failure modes behind these commands