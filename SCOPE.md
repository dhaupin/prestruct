# SCOPE.md: Prestruct

What this is, what it isn't, and what's left to do.

---

## What was done in v2

v1 was extracted from a production app with app-specific strings throughout.
v2 completes the P0 items from v1's SCOPE.md:

- [x] **Config interface extracted.** All brand identity and routes live in
  `ssr.config.js`. No app-specific strings in any engine file.
- [x] **`brand.js` coupling removed.** `prerender.js` and `inject-brand.js` import
  from `ssr.config.js` only.
- [x] **`usePageMeta` decoupled.** Accepts `siteUrl` as a prop or reads from
  `VITE_SITE_URL` env. No brand file imports.
- [x] **Template vs engine separation documented.** Engine files (prerender, inject-brand,
  usePageMeta) are copy-once, never-edit. Template files (AppLayout, entry-server,
  main.jsx) need minor app-specific wiring.
- [x] **All app-specific strings removed.** `_headers`, `_redirects`, `index.html`,
  and all scripts are now fully generic.
- [x] **Validated against a second app.** A second production app validated the config interface and uncovered several new gotchas documented in AGENTS.md. Please look over them before embarking.

---

## What Prestruct is

- A thin prerender layer for existing Vite + React + CF Pages apps
- A set of debugged scripts + patterns you drop into a project
- Opinionated about CF Pages specifically (cache headers, 404 handling, Pretty URLs)
- Designed for React Router v6 with the StaticRouter/BrowserRouter split

## What Prestruct is not

- Not a full SSR framework (no server, no streaming, no edge runtime)
- Not a competitor to Remix, Astro, or TanStack Start
- Not suitable for apps needing per-request SSR (this is build-time prerender only)
- Not CMS-aware out of the box (routes are static config) - although it could be built

---

## P1: significantly improves usability (not yet done)

- [ ] **CLI scaffold tool.** `npx prestruct init` that copies the template files
  into an existing Vite project and creates a starter `ssr.config.js`.
  Probably 100-150 lines of Node.

- [ ] **Config validation.** Check that `ssr.config.js` has all required fields
  before running. Emit clear errors for missing `siteUrl`, `appLayoutPath not found`, etc.

- [ ] **Dynamic route support.** Routes are fully static. Add support for an async
  `fetchRoutes()` function in config:
  ```js
  async fetchRoutes() {
    const posts = await fetch('https://cms.example.com/posts').then(r => r.json())
    return posts.map(p => ({
      path:       `/blog/${p.slug}`,
      priority:   '0.7',
      changefreq: 'monthly',
      meta: { title: p.title, description: p.excerpt },
    }))
  }
  ```

- [ ] **Per-route `og:image`.** Currently one global OG image. Support
  `meta.ogImage` per route so blog posts, product pages can have unique social images.
  (The inject logic already supports `meta.ogImage`. This is just documenting it.)

---

## P2: polish

- [ ] **npm package setup.** `package.json` with `bin` for the CLI, `exports` for
  the hooks, `peerDependencies` (vite, react, react-router-dom).

- [ ] **GitHub Actions.** CI that runs a test build using the example config.

- [ ] **Example app.** A minimal `/example` directory. Bare Vite + React Router
  app using this layer, deployable to CF Pages with one command.

- [ ] **Configurable 404 content.** Let the consuming app pass a `notFound` object
  in config with heading, body, and CTA labels. Currently hardcoded in prerender.js.

- [ ] **Robots.txt generation.** Currently a static file. Could be generated
  from config (inject sitemap URL, add/remove disallow rules automatically).

---

## Decisions made

**Config format:** `ssr.config.js` (JS module). Supports functions (`buildJsonLd`,
future `fetchRoutes`). JSON would be simpler but can't express functions.

**usePageMeta distribution:** Ship as a file to copy. No package import needed.
The `siteUrl` is passed as a prop or read from env. No coupling to app config files.

**Vite version floor:** Vite 5. Vite 6 not yet tested.

**React version floor:** React 18. `hydrateRoot` requires React 18.

---

## Keeping it simple

The value of this library is that it's thin and readable. A developer can read
prerender.js in 10 minutes and understand exactly what it does. If it grows into
a plugin system that handles every edge case, it loses that. Astro already exists.
Thanks for keeping it real.
