# Prestruct Roadmap

See [SCOPE.md](./SCOPE.md) for purpose and reach, [README.md](./README.md) for quick start.

---

## Docs

- [README.md](./README.md) - Quick start
- [SCOPE.md](./SCOPE.md) - What it is
- [AGENTS.md](./AGENTS.md) - AI patterns
- [CONTENT.md](./CONTENT.md) - Writing style

| Feature | Files | P1/P2 | Notes |
|---------|-------|------|-------|
| CLI scaffold | npx prestruct init | P1 | Copy init/ files to project |
| Config validation | validate in scripts/ | P1 | Emit clear errors |
| Dynamic routes | fetchRoutes() in config | P1 | Already documented |
| Per-route og:image | meta.ogImage per route | P1 | Already works |
| Worker bot list sync | write to worker | P1 | No manual copy |
| pm2/systemd starters | ecosystem.config.cjs | P1 | VPS deployment |
| Robots.txt generation | inject in prerender | P2 | Static → generated |
| Cache stats endpoint | GET /_prestruct/status | P2 | Monitor cache |
| NPM package | package.json with bin | P2 | Publish to npm |

---

## Current (v0.2.6)

- [x] AI-first homepage
- [x] Platform detection (config field)
- [x] Tests + CI (43 passing)
- [x] Incremental prerender (--force, --clean)
- [x] fetchRoutes() hook docs
- [x] ESLint + vitest config
- [x] Dynamic islands (eager, visible, idle)

---

## Philosophy

- **Basic prestruct form first**
- **Extend only when needed**
- **Keep core small, extensions optional**
- **Existing users never broken**

---

_Generated: v0.2.6_
