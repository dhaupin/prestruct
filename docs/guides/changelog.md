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

### Documentation
- Docs: 21 guides covering all aspects
- Docs: Header layout: flexbox ordering with wordmark → nav → actions
- Docs: Submenu accordion: close previous before opening new
- Docs: Peaceiris gh-pages bug warning added to AGENTS.md
- Docs: Content style guide with briefs rule
- Docs: CLI Reference, Contributing, Examples guides
- Docs: Changelog, Roadmap, Redirects guides
- Docs: Expanded guides by default
- Docs: Mobile flyout menu fixes
- Docs: PrismJS syntax highlighting with copy buttons
- Docs: Remove duplicate h1 headings
- Docs: Pagefind search integration with ⌘K shortcut
- Docs: baseurl handling for search URLs
- Docs: 15 prestruct-specific guides added
- Docs: 4 more guides: Edge Functions, Design Systems, CI/CD, Multi-site
- Docs: 3 more guides: Proxy, PWA, Images
- Docs: 3 more guides: i18n, Analytics & Monitoring, Security
- Docs: 4 more guides: Advanced Islands, Testing, Structured Data, Build Optimization

### Layout
- Docs: Light mode with toggle switch
- Docs: Dynamic nav from config
- Docs: Mobile burger menu improvements
- Docs: Theme toggle and breakpoint fixes
- Docs: Mobile nav folder items default hidden
- Docs: Backdrop-filter only on dark mode header

### Infrastructure
- Docs: GitHub Pages baseurl config
- Docs: Jekyll layout fixes
- Docs: 404 noindex handling
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
