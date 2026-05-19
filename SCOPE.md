# Prestruct

**SEO prerender for Vite + React. Build-time static HTML for crawlers.**

---

## Purpose

Make your React app visible to search engines. Renders each route to static HTML at build time—with correct meta tags, Open Graph, schema.org, cache headers. No framework migration.

## Reach

- **Static prerender**: Every route → static HTML at build time
- **Incremental builds**: Cache routes, rebuild only changed
- **Dynamic islands**: Client-only `<pre-island>` placeholders  
- **Multi-platform**: Cloudflare, Vercel, Netlify
- **Optional proxy**: Bot-only rendering (VPS or CF Worker)

See [PLAN.md](./PLAN.md) for roadmap.

---

## In Scope

- Vite + React apps
- Cloudflare Pages (primary), Vercel, Netlify
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
| `scripts/prerender.js` | Renders routes to static HTML |
| `scripts/inject-brand.js` | Injects SEO meta |
| `src/islands.js` | Mounts dynamic islands |
| `src/hooks/usePageMeta.js` | Client meta sync |
| `ssr.config.js` | Your config |

---

## Docs

- [README.md](./README.md) - Quick start
- [PLAN.md](./PLAN.md) - Roadmap
- [AGENTS.md](./AGENTS.md) - AI agent patterns
- [CONTENT.md](./CONTENT.md) - Writing conventions
