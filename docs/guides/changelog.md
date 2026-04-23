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

### Documentation
- 21 guides covering all aspects
- Content style guide with briefs rule
- CLI Reference, Contributing, Examples guides
- Changelog, Roadmap, Redirects guides
- Expanded guides by default
- Mobile flyout menu fixes
- PrismJS syntax highlighting with copy buttons
- Remove duplicate h1 headings

### Layout
- Light mode with toggle switch
- Dynamic nav from config
- Mobile burger menu improvements
- Theme toggle and breakpoint fixes

### Infrastructure
- GitHub Pages baseurl config
- Jekyll layout fixes
- 404 noindex handling

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
