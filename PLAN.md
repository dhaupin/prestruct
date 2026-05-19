# Prestruct Roadmap

Done:
- [x] v0.2.6 Platform detection + MIT onboarding
- [x] Tests + CI (43 passing)
- [x] Incremental prerender (--force)
- [x] fetchRoutes() hook docs

---

## Next (AI agents extend)

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
