# Prestruct Roadmap

Done:
- [x] v0.2.6 Platform detection + MIT onboarding
- [x] Tests + CI (43 passing)
- [x] Incremental prerender (--force)
- [x] fetchRoutes() hook docs

---

## Next (AI agents extend)

| Feature | Files | Notes |
|--------|-------|-------|
| Platform stubs | host-vercel.js, host-netlify.js | Generate vercel.json, netlify.toml |
| CMS fetch | fetchRoutes() example | Already documented - agents implement |
| Proxy | proxy.js, proxy.worker.js | Already works - needs docs |

---

## Philosophy

- **Basic prestruct form first**
- **Extend only when needed**
- **Keep core small, extensions optional**
- **Existing users never broken**

---

_Generated: v0.2.6_
