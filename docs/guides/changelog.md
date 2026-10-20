---
layout: default
title: Changelog
nav_order: 17
version: 1.0.0
permalink: /guides/changelog
---

Release history for prestruct. Commit history is the detailed source
(`git log --oneline`); the npm package sits at **1.0.0** and is not published
yet -- `publish.yml` stays dormant until the first `v*` tag.

## 1.0.0 (repo state)

- npm package shape: `bin/cli.mjs` (`init` / `build` / `validate` / `clean`),
  `engine/` single-source scripts synced into `init/` + `example/`
- CLI realizes `--force` / `--clean` pass-through (engine already accepted
  them; the CLI previously dropped both silently)
- Incremental prerender cache (`.prestruct/cache/`) + per-build
  `dist/.prestruct/status.json` snapshot + opt-in `config.robots` generation
- Bot proxy pair (VPS + Worker) with constant-time cache-refresh secret
  compare and a bounded render-concurrency queue
- 22 guides under `docs/` with Pagefind search

## v0.2.4 (May 2026)

Changes since v0.2.2:

### Core Features
- Islands architecture for dynamic client-only content
- Proxy support for bot rendering (VPS and Worker)
- BrowserRouter isolation pattern
- Prerender pipeline improvements
- ssrLoadModule over vite build --ssr (required for proper StaticRouter context)
- Dynamic islands with client-only rendering
- Proxy cache key using SHA-256 hash
- Fix: 404 pages get noindex meta to prevent crawling
- Fix: usePageMeta adds useLocation to deps for query param navigation
- Fix: inject-brand title falls back to siteName, only injects description if truthy

### Docs: Guides
- Docs: prestruct guide set covering getting started to advanced

### Docs: UI/UX
- Docs: Pagefind search integration with Cmd+K shortcut
- Docs: Theme - menu system, light/dark mode, mobile improvements
- Docs: PrismJS syntax highlighting with copy buttons

### Docs: Infrastructure
- Docs: Jekyll layout fixes
- Docs: GitHub Pages baseurl config
- Docs: Artifact deploy instead of branch deploy (peaceiris bug)

## v0.2.2 (Stable)

Initial stable release:

### Core
- Vite integration for React SSR
- Prerender pipeline for build-time static generation
- Cloudflare Pages deployment

### Architecture
- ssrLoadModule for SSR rendering
- Component islands with lazy mounting
- Build-time prerendering

### Guides
- Getting Started, Configuration, Vite Integration
- SEO, Performance, Routing, Architecture
- Troubleshooting, Migration, Advanced Islands

See git log for detailed history:

```bash
git log --oneline
```

Full release notes: https://github.com/dhaupin/prestruct/releases

## Next steps

- [Roadmap](/prestruct/guides/roadmap) - what is planned next
- [Contributing](/prestruct/guides/contributing) - how to get a change in
