---
layout: default
title: Roadmap
nav_order: 18
version: 1.0.0
permalink: /guides/roadmap
---

Planned features and ideas for prestruct. The package is at 1.0.0
(unpublished -- `publish.yml` waits on the first `v*` tag).

## Shipped (1.0.0 state)

- CLI (`init` / `build` / `validate` / `clean`) with incremental prerender
- Incremental route cache (`.prestruct/cache/`) + per-build status snapshot
- Sitemap + opt-in robots.txt generation
- `fetchRoutes()` build-time CMS hook
- Islands architecture and the optional bot proxy pair (VPS + Worker)

## Planned

### Streaming SSR
Progressive streaming instead of blocking `renderToString`. Only matters once
per-request rendering exists -- build-time prerender does not need it.

### Vercel / Netlify platform support
`platform: 'vercel' | 'netlify'` currently validates but generates no
`vercel.json` / `netlify.toml` (cloudflare is the only fully supported
platform).

## P2 - Future

- Image optimization pipeline
- Smarter incremental invalidation (file-level route dependencies)
- Plugin system

## P3 - Ideas

- Component library starter
- Theme templates
- More example projects

## Propose Features

Open an issue: https://github.com/dhaupin/prestruct/issues

## Next steps

- [Changelog](/prestruct/guides/changelog) - what each release landed
- [Contributing](/prestruct/guides/contributing) - PR setup and gates
