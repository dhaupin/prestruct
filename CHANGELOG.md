# Changelog

Consumer-facing changes to the engine and template. Written for projects
that cherry-picked `init/` files into their own repos. Read before updating.

Rule from [CONTENT.md](./CONTENT.md): commit history is the source. This file
records only what cherry-pickers must act on.

---

## v0.2.6 (current)

### Phase 2 scaffold: npm-ready packaging (dormant -- nothing published yet)

- The repo root is now the npm package shape: "bin" (`prestruct` ->
  `bin/cli.mjs` with `init`, `build`, `validate`, `clean`, `help`), exports map
  for programmatic use (`prestruct/prerender`, `prestruct/inject-brand`,
  `prestruct/validate-config`), `files` whitelist (`bin + engine + init`),
  peerDependencies (react/react-dom/react-router-dom/vite resolve from the
  HOST project), engines >= 18.
- `.github/workflows/publish.yml` added: npm Trusted Publishing (OIDC),
  fires on `v*` tags only. **Dormant by design** -- no tag exists and no
  publish is allowed until the engine proves stable in real projects.
  First publish must be manual (OIDC cannot create a new package; see the
  runbook in the workflow header).
- `prerender()` accepts `prerender(config, { root })` so the CLI can run the
  pipeline inside a user project; engine copies keep project-root defaults.
- No version has been tagged or published; the npm registry still has no
  `prestruct` package.

### Phase 1: the engine is now one source

- The engine moved to `engine/` at the repo root: `scripts/prerender.js`,
  `scripts/inject-brand.js`, `scripts/validate-config.js`, `src/islands.js`,
  `src/hooks/usePageMeta.js`, `vite.config.js` (init-only). `init/` and
  `example/` copies are now **generated** by `node scripts/sync-engine.mjs` --
  never edit them. CI verifies engine == init == example for 5 contract files.
- **Fixed: `deployIdFooter: true` no longer breaks prerendering** (tracked as
  W8). prerender's root-div injection is attribute-tolerant: any attributes
  injected by inject-brand (e.g. `data-deploy-id-footer`) now survive onto the
  prerendered pages.
- **Fixed: template builds silently degraded to SPA on fresh installs.**
  `init/` ships `vite.config.js` (missing plugin-react jsx automatic runtime),
  and pins `react`/`react-dom` 18 + `react-router-dom` 6 as devDependencies --
  react-router-dom v7 dropped the `./server.js` subpath the pipeline needs.
  Cherry-pickers on v7: pin v6 or update your SSR entry.
- `init/incremental.js` removed (dead stub; cache logic lives in prerender.js).

### Must-read for cherry-pickers

- **`scripts/inject-brand.js` now reads `config.deployId` and `config.deployIdFooter`.**
  - `deployId` (default `true`): injects `<meta name="deploy-id">` with a build identifier. Pass `deployId: false` to disable.
  - `deployIdFooter` (default `false`, **opt-in**): adds `data-deploy-id-footer` to the root div for client-side footer display. See `init/ssr.config.example.js`.
  - Sites that copied the older `init/scripts/inject-brand.js` (meta tag always on, no footer attribute) keep their behavior with the new defaults. No action needed unless you want the footer.
- **`init/` is now the single source of truth for engine files.**
  `example/` copies are generated from `init/` via `node scripts/sync-engine.mjs`
  (repo-internal tool; run it after editing engine files). The CI sync check
  fails if `example/` has drifted.
- **Version single-sourced at `0.2.6`** in root `package.json` and `init/package.json`.

### Shipped in this release line (from PLAN.md current list)

- AI-first example homepage (`example/`, live at prestruct.creadev.org)
- Platform detection via `config.platform` (cloudflare | vercel | netlify)
- Tests + CI (46 passing)
- Incremental prerender: `.prestruct/cache/routes.json`, `--force`, `--clean`
- `fetchRoutes()` hook for CMS-driven routes at build time
- ESLint + vitest config
- Dynamic islands (eager, visible, idle) via `<pre-island>` elements
- Spinout: `labs/prd.md` (direction) and `labs/TASKS.md` (pass log)

### Known issues (tracked in labs/prd.md)

- If `deployIdFooter: true`, the footer attribute is injected before prerender
  runs; prerender's root-div matcher then misses and routes prerender as empty
  shells. Do not opt into the footer until W8 is fixed (Phase 1).

---

## Earlier releases

See the [Releases table in README.md](./README.md#releases) and the
[branch tags](https://github.com/dhaupin/prestruct/branches) for v0.2.4 and
v0.2.2. No action-on-update notes needed for these.
