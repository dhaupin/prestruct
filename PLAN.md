# Prestruct Roadmap

See [SCOPE.md](./SCOPE.md) for purpose and reach, [README.md](./README.md) for quick start.

---

## Docs

- [README.md](./README.md) - Quick start
- [SCOPE.md](./SCOPE.md) - What it is
- [AGENTS.md](./AGENTS.md) - AI patterns
- [CONTENT.md](./CONTENT.md) - Writing style
- [README-proxy.md](./README-proxy.md) - Bot proxy deploy
- [docs/](./docs/index.md) - Full docs site

---

## Feature table

| Feature | Files | P1/P2 | Status ||---------|-------|------|-------|| Engine single source | engine/ + scripts/sync-engine.mjs | P1 | Done -- engine/ is the source of truth, init/ + example/ generated || CLI scaffold | bin/cli.mjs (`prestruct init/build/validate/clean`) | P1 | Done || Config validation | engine/scripts/validate-config.js | P1 | Done; `PRESTRUCT_STRICT=1` fails builds |
| Dynamic routes | fetchRoutes() in config | P1 | Done; documented in docs/guides/config.md |
| Per-route og:image | meta.ogImage per route | P1 | Done |
| Worker bot list sync | inject-brand syncs config.proxy.botList into proxy.worker.js | P1 | Done |
| pm2/systemd starters | init/ecosystem.cjs, init/scripts/prestruct-proxy.service | P1 | Done |
| Robots.txt generation | inject in prerender | P2 | Done -- opt-in via config.robots; author-owned public/robots.txt untouched otherwise |
| Cache stats endpoint | dist/.prestruct/status.json (static) | P2 | Done -- JSON snapshot per build, static-sites-safe |
| NPM package | package.json with bin | P1 | Built but unpublished (v1.0.0 dormant) |

---

## Current (v1.0.0, unpublished)

- [x] AI-first homepage
- [x] Platform detection (config field)
- [x] Tests + CI (vitest battery green)
- [x] Incremental prerender (--force, --clean)
- [x] fetchRoutes() hook docs
- [x] ESLint + vitest config
- [x] Dynamic islands (eager, visible, idle)
- [x] npm package + CLI (dormant: nothing tagged/published)
- [x] Worker bot-list sync + VPS proxy keep-alive starters

---

## Philosophy

- **Basic prestruct form first**
- **Extend only when needed**
- **Keep core small, extensions optional**
- **Existing users never broken**

---

_Generated: v0.2.6_
