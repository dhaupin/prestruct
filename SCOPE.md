# Prestruct

**SEO prerender for Vite + React. Build-time static HTML for crawlers.**

---

## Purpose

Make your React app visible to search engines. Renders each route to static HTML at build time-with correct meta tags, Open Graph, schema.org, cache headers. No framework migration.

## Reach

- **Static prerender**: Every route → static HTML at build time
- **Incremental builds**: Cache routes, rebuild only changed
- **Dynamic islands**: Client-only `<pre-island>` placeholders  
- **Cloudflare Pages first-class**: headers, redirects, immutable asset caching ship configured; any static host works on the plain dist/ output
- **Optional proxy**: Bot-only rendering (VPS or CF Worker)

See [PLAN.md](./PLAN.md) for roadmap.

---

## In Scope

- Vite + React apps
- Cloudflare Pages (primary); any static host otherwise (platform config for Vercel/Netlify validates only -- no host-file generation yet)
- React Router v6
- Static routing (dynamic routes via fetchRoutes() hook)
- Client-only dynamic content (islands)

---

## Out of Scope

- Per-request SSR (build-time only)
- Server-side framework
- CMS out of the box (static config)
- Edge runtime

---

## Key Files

| File | Purpose |
|------|---------|
| `engine/scripts/prerender.js` | Renders routes to static HTML (single source) |
| `engine/scripts/inject-brand.js` | Injects SEO meta (single source) |
| `engine/scripts/validate-config.js` | Structured config diagnostics + `defineConfig` |
| `bin/cli.mjs` | `prestruct init/build/validate/clean` |
| `engine/src/islands.js` | Mounts dynamic islands |
| `engine/src/hooks/usePageMeta.js` | Client meta sync |
| `ssr.config.js` | Your config (host project) |

Deployed copies of engine files live in `init/` and `example/`, kept
byte-identical by `scripts/sync-engine.mjs` (run it after touching `engine/`).

---

## Docs

- [README.md](./README.md) - Quick start
- [README-proxy.md](./README-proxy.md) - Bot proxy deploy (VPS / CF Worker)
- [docs/guides/cloudflare.md](./docs/guides/cloudflare.md) - Pages deploy
- [docs/guides/cli.md](./docs/guides/cli.md) - CLI reference
- [docs/guides/config.md](./docs/guides/config.md) - Config reference
- [PLAN.md](./PLAN.md) - Roadmap
- [AGENTS.md](./AGENTS.md) - AI agent patterns
- [CONTENT.md](./CONTENT.md) - Writing conventions
