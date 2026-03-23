# SCOPE.md — vite-cf-ssr

Project scope, current state, and the full todo list for turning this
proof of concept into a reusable package.

---

## Current state

This is a working proof of concept extracted from a real production app
(Vibe Flow Festival, deployed on Cloudflare Pages). Everything in this
repo has been debugged and deployed. The SSR pipeline works correctly.

What it is NOT yet:
- A published npm package
- A CLI tool
- Configurable without editing the script files directly
- Tested against more than one app

---

## Scope: what this is and is not trying to be

### Is
- A thin prerender layer for existing Vite + React + CF Pages apps
- A set of debugged scripts + patterns you drop into a project
- Opinionated about CF Pages specifically (cache headers, 404 handling, Pretty URLs behavior)
- Designed to work with React Router v6 and the StaticRouter/BrowserRouter split

### Is not
- A full SSR framework (no server, no streaming, no edge runtime)
- A competitor to Remix, Astro, or TanStack Start for complex apps
- Suitable for apps that need per-request SSR (this is build-time prerender only)
- CMS-aware (routes are defined statically in config, not pulled from a CMS)

---

## Todo: minimum viable reusable package

These are the changes needed to go from "extracted from VFF" to
"works cleanly in any Vite + React app":

### P0 — blockers (must do before it's actually reusable)

- [ ] **Extract config interface.** Replace all `brand.js` imports in
  `prerender.js` and `inject-brand.js` with a single `ssr.config.js` that
  the consuming app provides. Minimum shape:
  ```js
  export default {
    siteUrl:       'https://yoursite.com',
    siteName:      'Your Site',
    author:        'Your Org',
    ogImage:       '/og-image.jpg',
    appLayoutPath: '/src/AppLayout.jsx',
    routes: [
      { path: '/', priority: '1.0', changefreq: 'weekly',
        meta: { title: '...', description: '...' } },
    ],
    jsonLd: [],      // pass your own schema.org array, or omit
    keywords: '',
  }
  ```

- [ ] **Decouple usePageMeta from brand.js.** Change the SITE_URL import
  to either accept it as a parameter or read from `import.meta.env.VITE_SITE_URL`.
  Document both options.

- [ ] **Template vs engine separation.** Clearly mark which files are
  "copy once and edit" (AppLayout, entry-server, main.jsx) vs
  "never edit" (prerender, inject-brand, usePageMeta core).
  Consider a `create` CLI that scaffolds the template files into a new project.

- [ ] **Remove all VFF-specific strings** from _headers (CSP domain references),
  _redirects (VFF-specific routes), and index.html (VFF placeholder meta).
  Replace with generic placeholders or generate them from config.

### P1 — significantly improves usability

- [ ] **CLI scaffold tool.** `npx vite-cf-ssr init` that copies the template
  files into an existing Vite project and creates a starter `ssr.config.js`.
  Probably 100-150 lines of Node. Makes the "drop in" story clean.

- [ ] **Config validation.** Check that `ssr.config.js` has all required fields
  before running. Emit clear errors for common mistakes (missing siteUrl,
  AppLayoutPath not found, etc).

- [ ] **Dynamic route support.** Currently routes are fully static. Add support
  for a `fetchRoutes` async function in config that lets the consuming app pull
  routes from an API or CMS at build time:
  ```js
  export default {
    async fetchRoutes() {
      const posts = await fetch('https://cms.example.com/posts').then(r => r.json())
      return posts.map(p => ({
        path: `/blog/${p.slug}`,
        priority: '0.7',
        changefreq: 'monthly',
        meta: { title: p.title, description: p.excerpt },
      }))
    }
  }
  ```

- [ ] **Per-route og:image.** The current injection uses one global OG image.
  Support `meta.ogImage` per route so blog posts, product pages etc can have
  unique social images.

- [ ] **Test against a second app.** The real proof of reusability. Pick a
  minimal Vite + React Router v6 app and integrate the layer from scratch
  using only the README. Fix everything that breaks.

### P2 — polish

- [ ] **npm package setup.** `package.json` with `bin` pointing to the CLI,
  `exports` for the hooks, proper `peerDependencies` (vite, react, react-router-dom).

- [ ] **GitHub Actions.** CI that runs a test build using the example app config.

- [ ] **Example app.** A minimal `/example` directory in the repo —
  a bare Vite + React Router app using this layer, deployable to CF Pages
  with one click.

- [ ] **Configurable 404 content.** Let the consuming app pass a custom
  `render404(shell)` function in config, or a simple `{ heading, body }` object.
  Currently the 404 copy is hardcoded in prerender.js.

- [ ] **Robots.txt generation.** Currently a static file. Could be generated
  from config (add/remove disallow rules, inject sitemap URL automatically).

---

## Decisions to make before publishing

**Package name.** `vite-cf-ssr`, `vite-pages-ssr`, `cf-prerender`? Check npm
for conflicts before committing.

**Config file format.** `ssr.config.js` (JS module, most flexible) vs
`ssr.config.json` (simpler but no functions). JS module wins for dynamic routes.

**usePageMeta distribution.** Ship as a JS file to copy (like shadcn/ui's approach)
or as an importable hook from the package? Copying is simpler and avoids the
SITE_URL coupling problem. `npx vite-cf-ssr add usePageMeta` could handle it.

**Vite version floor.** Currently built against Vite 5. Vite 6 is out — test
and decide whether to support both or set the floor at 5.

**React version floor.** Requires React 18 for `hydrateRoot`. No plan to support 17.

---

## What this does NOT need to become

Keep this simple. The value is that it's thin and understandable — a developer
can read the entire prerender.js in 10 minutes and know exactly what it does.
The moment it grows into a plugin system or tries to handle every edge case,
it loses that advantage. Astro already exists.
