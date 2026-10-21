# Changelog

Consumer-facing changes to the engine and template. Written for projects
that cherry-picked `init/` files into their own repos. Read before updating.

Rule from [CONTENT.md](./CONTENT.md): commit history is the source. This file
records only what cherry-pickers must act on.

---

## v1.1.0 (unreleased -- main is ahead by these)

### Deep engine imports are now part of the exports contract

- `package.json` exports map adds `prestruct/hooks` (usePageMeta),
  `prestruct/islands` (mountIslands), and a `prestruct/engine/*` passthrough
  so every engine file is importable without re-publishing a spec entry.
  Previously only `.`/`bin`/`prerender`/`inject-brand`/`validate-config`
  exported; deep paths failed with `Missing specifier in "prestruct"
  package`. Verified against the packed tarball (still 35 files). The docs
  default stays the scaffold-relative import (`../hooks/usePageMeta.js`) --
  the deep form is for host projects that want to pin to the package.

### Release archive is correct and self-testing

- The v1.0.0 GitHub release zip shipped a test battery that could not run:
  repo tests import `../engine/...`, which does not exist inside the
  template. `release.yml` now remaps those imports to the template layout,
  injects the full test devDependency set (react, react-dom,
  react-router-dom, vite, vitest, happy-dom, express, puppeteer), and runs
  the battery inside `init/` BEFORE the archive is built -- a release can
  no longer ship a dead test suite. Battery proven 136/136 inside the
  rebuilt zip.
- Archive hygiene: `node_modules/`, `dist/`, `.prestruct/`, and the stale
  `package-lock.json` are stripped before zipping, tests + e2e/timing
  helpers are copied in, and guardrails assert `tests/engine.test.js` and
  `ssr.config.example.js` are present with no node_modules leak.
- Release notes body now lists the real archive contents (the v1.0.0 body
  named `ssr.config.js`, which the zip does not contain, and omitted both
  proxy variants, `validate-config.js`, and `wrangler.toml`).

---

## v1.0.0 (current)

Identical content to the 0.9.0 bootstrap release; the version returns to the
1.0.0 lock and stays there. This is the tag the dormant Trusted-Publisher
workflow publishes from: pushing `v1.0.0` triggers .github/workflows/
publish.yml for the first tag-based publish with provenance (requires the
npmjs.com Trusted-Publisher entry: user dhaupin, repo prestruct, workflow
publish.yml).

## v0.9.0 (bootstrap release)

First npm publish (manual bootstrap; the Trusted-Publisher tag pipeline is
dormant until v1.0.0, per the runbook in .github/workflows/publish.yml).
Behavior is identical to the internal v1.0.0 lock, renamed down for the
bootstrap ladder: after the publish lands, the version returns to 1.0.0 and
the `v1.0.0` tag drives the first tag-based publish with provenance.

## v0.2.6

### 404 CTA follows the host theme (visible fix for dark-mode owners)

- The generated `404.html` CTA no longer hardcodes `background:#000;
  color:#fff` -- that fill was invisible on dark-themed hosts (black fill on
  a near-black page). The button now draws its text and 2px outline from
  `currentColor`, so it reads on any theme the host shell sets. If you
  cherry-picked `scripts/prerender.js`, re-copy or re-run the generator.
  Layout and copy are unchanged; only the CTA's color source moved.

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

### Shipped in this release line (roadmap now at labs/prd.md)

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
