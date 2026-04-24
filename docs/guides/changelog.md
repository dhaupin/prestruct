---
layout: default
title: Changelog
nav_order: 17
---

Release history for prestruct.

## v0.2.4 (Development)

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

### Docs: Guides
- Docs: 21 guides covering all aspects
- Docs: New guides: CLI, Contributing, Examples, Changelog, Roadmap, Redirects
- Docs: 25+ prestruct-specific guides

### Docs: UI/UX
- Docs: Pagefind search integration with ⌘K shortcut
- Docs: Layout: Light/dark mode, dynamic nav, mobile improvements
- Docs: Header layout: flexbox ordering with wordmark → nav → actions
- Docs: Submenu accordion: close previous before opening new
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
