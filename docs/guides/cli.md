---
layout: default
title: CLI Reference
description: "Command reference for the prestruct CLI: init, build, validate, audit, indexnow, clean, and their flags."
nav_order: 21
version: 1.2.0
permalink: /guides/cli
---

All commands and scripts available in prestruct.

## prestruct CLI

The `prestruct` package ships an executable. It runs from any directory that contains a Vite app plus a `ssr.config.js`:

```bash
# Scaffold never-clobber starter files (ssr.config.example.js, public/_headers, src/AppLayout.jsx, ...)
# Existing files are never overwritten -- safe to run on an existing project.
# Activate the config after scaffolding: cp ssr.config.example.js ssr.config.js
npx prestruct init [dir]

# Validate ssr.config.js only: prints every diagnostic line-by-line, exits 1 on a bad config
npx prestruct validate

# Full pipeline: validate -> vite build -> inject-brand -> prerender ->
# hooks.postBuild -> audit (a FAIL-class finding fails the build)
# --force rerenders all routes; --clean clears the incremental cache first
npx prestruct build

# Clear the prerender cache for the current project (optional maintenance)
npx prestruct clean

# Verify the baked output without touching it (head hygiene, SVG og:image
# trap, JSON-LD parse, sitemap/robots/404 contract); exit 1 on FAIL rows only
npx prestruct audit

# Submit the baked sitemap URLs to api.indexnow.org (--dry-run is CI-safe,
# prints the request body without touching the network)
npx prestruct indexnow

# Show the command reference
npx prestruct help
```

Install is NOT a CLI verb: `npm install` / `git clone` unwraps the package; the
verbs the package ships are exactly `init`, `build`, `validate`, `audit`,
`indexnow`, `clean`, and `help`. All commands except `help` accept a positional
`[dir]` (explicit workdir); without one they walk up from the current directory
until they find `ssr.config.js`.

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
re-run of the same `npm run build` pipeline (which now ends with the audit):

```jsonc
{
  "build":    "vite build && node scripts/inject-brand.js && node scripts/prerender.js && node scripts/audit-if-configured.cjs",
  "test":     "vitest",
  "test:run": "vitest run",
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
    |
    |-> vite build          -> JS/CSS bundles in dist/assets/
    |
    |-> inject-brand.js     -> Global meta in index.html
    |
    `-> prerender.js        -> Per-route HTML generation
```

`prestruct build` adds a fourth step first:

```text
prestruct build
    |
    |-> validate-config.js  -> structured [prestruct] diagnostics
    |-> vite build
    |-> inject-brand.js
    `-> prerender.js
```

Config loading is fixed in every entry point: `ssr.config.js` from the
explicit `[dir]` argument (default: current directory, walking up to the
nearest parent that has one). There is currently no `--config` flag.

Flag notes backed by the CLI dispatch (`bin/cli.mjs`):

- `build` accepts `--force` (alias `-f`) and `--clean`.
- A route that fails to render fails the BUILD: exit 1 with
  `[prestruct] prerender failed for N/M route(s)`. Exit 0 on a broken deploy
  was the bug; there is no opt-out.
- `validate` prints diagnostics only when something is wrong; a passing config
  prints one line (`ssr.config.js is valid (N routes)`).
- `clean` clears `.prestruct/cache/routes.json` for the target workdir.

### The audit subcommand

`prestruct audit [dist]` reads the baked output (never writes) and grades it:

- **FAIL rows (exit 1):** missing title/description, non-absolute canonical,
  duplicate head tags (title/canonical/description/og:title -- the rebuild-
  idempotency guard), missing og:title/og:description/twitter:card/
  twitter:title, the SVG og:image trap, unparseable JSON-LD, a 404 page
  without noindex, missing/empty sitemap.xml, and a missing or pointer-less
  robots.txt when `config.robots` is set (the author-owned copy is the
  author's call, so it is never graded without the engine contract).
- **WARN rows (report-grade, never fail):** title/description length bands,
  the extended og/twitter set, missing og:image companions (the object form
  supplies them), a site-local og:image that does not exist on disk,
  structure data without `@type`, h1 hygiene, pages with no JSON-LD.
- **`--json`:** one digest line for CI harvesting. **`--external`:** HEAD
  probes (GET retry) up to 50 unique external hrefs, warn-grade, live
  network. **`--internal`:** unresolved internal hrefs, warn-grade -- a link
  to a route that was never prerendered is a gap, not a failure.

The scaffolded `init/`/example apps run the audit straight after prerender in
their `build` script, so a regression fails the build rather than shipping.

## Deploy commands (prestruct output is what deploys)

`prestruct build` output is the only artifact that ships. On Cloudflare Pages,
that's normally git-connected (push to main -> Pages runs `npm run build`,
serves `dist/` -- full setup: [Cloudflare Pages guide](/prestruct/guides/cloudflare)).
For direct uploads the wrangler commands operate on prestruct's `dist/`:

```bash
npm run build            # or: npx prestruct build

# First direct upload
wrangler pages project create my-app
wrangler pages deploy dist

# View deployments
wrangler pages deployment list
```

CF Pages' build queue is the "build hook": git push fires the build that runs
prestruct. A `wrangler pages deploy dist` in CI is the equivalent for repos
that build elsewhere.

## Proxy commands

The bot proxy is opt-in and separate from the build. Commands, tied to what
actually runs:

```bash
# VPS proxy (Node/Express/Puppeteer): needs scripts/proxy.js + the
# proxy.package.json dependency set (npm i in scripts/ first)
node scripts/proxy.js

# Same, under a process manager
pm2 start scripts/proxy.js --name prestruct

# Worker proxy (Browser Rendering + KV): scripts/proxy.worker.js + wrangler.toml
wrangler deploy
```

Both variants read `config.proxy` from `ssr.config.js` and share the
`x-prestruct-refresh` cache-bust contract (auth: `PRESTRUCT_SECRET`). Details
and the request flow: [Proxy guide](/prestruct/guides/proxy).

## Common issues

| Issue | Fix |
|-------|-----|
| Command not found | Check package.json scripts |
| Build fails | Run `npm run build` with debug |
| Preview not working | Check dist exists |
| `prestruct: command not found` | Install the package locally (`npm i -D prestruct`) or run via `npx` |
| `validate` outputs nothing | That means the config is fine; it prints errors only when something is wrong |

## Next steps

- [Getting Started](/prestruct/guides/getting-started) - first build from zero
- [Config Reference](/prestruct/guides/config) - every `ssr.config.js` key
- [Troubleshooting](/prestruct/guides/troubleshooting) - the failure modes behind these commands