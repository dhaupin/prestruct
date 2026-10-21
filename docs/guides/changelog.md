---
layout: default
title: Changelog
description: "Consumer-facing changes per release: what cherry-pickers of the init template must act on when updating."
nav_order: 17
version: 1.0.0
permalink: /guides/changelog
---

Release history for prestruct. Commit history is the detailed source
(`git log --oneline`); the npm package sits at **1.0.0** (published via the
Trusted-Publisher workflow, provenance-attested), and **main is ahead** at
1.1.0 until the next tag.

## 1.1.0 (main, unreleased)

- Deep engine imports join the package contract: `prestruct/hooks`,
  `prestruct/islands`, and a `prestruct/engine/*` passthrough (previously
  `Missing specifier` for any non-mapped path). Docs still recommend the
  scaffold-relative import for template users.
- `status.json` moves out of `dist/`: build telemetry now lands in
  PROJECT-ROOT `.prestruct/status.json` beside the route cache, and the
  wall-clock `generatedAt` field is dropped. Anything inside `dist/` deploys
  to a public URL (issue 23) and a timestamp inside it broke byte-identical
  build parity. Action for upgraders: re-point any CI step reading
  `dist/.prestruct/status.json` at the project root.
- Release archive (GitHub zip) now ships a working test battery: imports
  remapped to the template layout, test-only devDependencies declared, and
  the battery runs inside `init/` BEFORE the zip is built (136/136).
- Release notes list the real archive contents (the v1.0.0 body named
  `ssr.config.js`, which the zip does not contain).

## 1.0.0 (published)

- npm package shape: `bin/cli.mjs` (`init` / `build` / `validate` / `clean`),
  `engine/` single-source scripts synced into `init/` + `example/`
- CLI realizes `--force` / `--clean` pass-through (engine already accepted
  them; the CLI previously dropped both silently)
- Incremental prerender cache (`.prestruct/cache/`) + opt-in `config.robots`
  generation
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
