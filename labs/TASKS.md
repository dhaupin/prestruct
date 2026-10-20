# TASKS.md — pass log for prestruct

Working log, not documentation. One section per pass: what was done, what was
learned, what the next pass should pick up. Newer passes on top.

---

## Pass 2 — Phase 0: stop the bleeding (2026-10-20)

**Done:**

- Reconciled `inject-brand.js` drift (W1): merged deployId/deployIdFooter into
  `init/scripts/inject-brand.js` as single source; footer default flipped to
  opt-in (`config.deployIdFooter === true`), matching semantics documented in
  `init/ssr.config.example.js` and set in `example/ssr.config.js`.
  Example copy byte-identical.
- New `scripts/sync-engine.mjs` (copy + check modes), wired as `npm run sync`
  / `npm run sync:check`. CI error message in `engine-sync-check.yml` now
  points to it. Covers 4 CI-checked engine files + `AppIslands.jsx`;
  `ssr.config.example.js` excluded (example-owned branding).
- Version single-sourced at `0.2.6` (root + `init/package.json`); PLAN.md
  engine-sync row marked done.
- `CHANGELOG.md` added at repo root, written for init cherry-pickers
  (must-read entries over history narrative).
- Phase 0 log + W8/W9 appended to `labs/prd.md`.

**Verified:** vitest 46/46; `sync-engine.mjs check` OK; `cd init && npm run
lint` 0 errors (1 pre-existing warning in proxy.js). Root-level `npx eslint`
fails pre-existing: root package.json lacks `"type": "module"`, so the root
`eslint.config.js` never loads anywhere. CI only lints `init/`, so this did
not block. Queued for Phase 1.

**Learned:**

- Sync contract: `init/` is source of truth; `sync-example.yml` copies on
  release publish; `engine-sync-check.yml` + `tests/qc.test.mjs` enforce
  byte-identical on every push. Drift happened because a feature landed in
  only one copy — OldSchool fix: always change `init/`, then run
  `node scripts/sync-engine.mjs`.
- W8 (latent bug found during reconciliation): with `deployIdFooter: true`,
  inject-brand rewrites `<div id="root"` before prerender runs, so
  prerender's `'<div id="root"></div>'` shell replace misses and every route
  prerenders empty. Dormant (both configs use false). Phase 1: make
  prerender's root-div matcher attribute-tolerant.
- Root lint has never worked (`type: module` missing); do not "fix" casually —
  adding `"type"` to root package.json changes module semantics for every
  root `.js` file; bundle it with the Phase 1 engine extraction.
- Vant brain runs in a dedicated install (`/home/daytona/vant`) with its own
  default template brain parked in `template-brain-backup/` (gather captures
  ALL scopes in an install, no CLI filter — so a shared install would bloat
  the repo stone with unrelated brain content). Canonical brain content lives
  in `models/private/prestruct/`; `models/public/prestruct/` is a curated
  pointer-only mirror that feeds the repo stone.
- Public stone: `horcrux/prestruct-p_st0neph0enix2026.svg`. Password
  `st0neph0enix2026` is IN the filename by design (boot convention) so the
  OSS brain is bootable by contributors/agents: restore via  `VANT_ALLOW_FILENAME_PW=true` (vant gates legacy filename-password lookup)  or via an explicit password / `VANT_BRAIN_PASSWORD`. Locator schema quirk  learned:
  `parseFilenamePassword` splits on `-`/`_` and takes only the first segment
  after `p_` — stone passwords must never contain separators or they can
  never round-trip through the filename convention. Consequence of the  transparent password: every file in the dedicated install ships inside the  stone — OSS-safe discipline applies to the whole brain, personal/private  content must live in a separate install's brain instead.

**Setup for next pass (Phase 1: extract the engine):**

1. Create `engine/` at repo root. Move `prerender.js`, `inject-brand.js`,
   `islands.js`, `usePageMeta.js` with a stable export surface
   (`prerender(config)`, `injectMeta(html, meta, url)`).
2. Make `sync-engine.mjs` a generator: engine/ -> init/ -> example/ with path
   rewrites. Byte-identical CI check stays; it now verifies the generator ran.
3. Delete `init/incremental.js` (stub); inline cache logic becomes a module
   inside `engine/`.
4. `engine/validateConfig.js` with structured diagnostics. Keep exits 0 on CF
   Pages; add structured `[prestruct] Invalid route meta: /blog: expected {title}` output.
5. Fix W8 while touching prerender (root-div matcher tolerant of attributes),
   and fix W9 (kill the dead footer-scan in inject-brand, fold into prerender).
6. Decide: `PRESTRUCT_STRICT=1` env flag (exit 1 locally, exit 0 on CF)? See
   labs/prd.md open question 1.
7. Also queued: root package.json `"type": "module"` + fix root lint.

---

## Pass 1 — audit and PRD (2026-10-20)

- Full repo audit. Findings logged as W1-W7 in `labs/prd.md` (engine drift,
  no engine source dir, version sprawl, exit-0 policy, incremental stub,
  duplicated meta logic, non-portable example config).
- Suite was 45/46: failing test was the init↔example sync check on
  `inject-brand.js`.
- `labs/prd.md` written: Phases 0-3 + 4 open questions.
---

## Pass 3 - Phase 1 begins: engine extraction (2026-10-20)

**Done:**

- `engine/` created as the single source (`scripts/prerender.js`,
  `scripts/inject-brand.js`, `scripts/validate-config.js`, `src/islands.js`,
  `src/hooks/usePageMeta.js`, `vite.config.js` init-only). sync-engine.mjs is
  now a generator (engine -> init + example, INIT_ONLY group for template-owned
  files). init/incremental.js stub deleted.
- Module surfaces: `replaceRootDiv`, `injectMeta`, `generateSitemap`,
  `generate404`, cache helpers, `prerender(config, {force})`, `injectBrand`,
  `validateConfig` + CLI guards (isMainExecute) so imports never run pipelines.
- W8 fixed for real: root-div injection is attribute-tolerant; footer attr now
  survives prerender (verified live: prerendered pages carry
  `data-deploy-id-footer data-server-rendered="true"` with deployIdFooter:
  true). W9: dead footer-scan dropped from inject-brand.
- Config validation: validateConfig() with structured `[prestruct] config:`
  diagnostics; exits stay graceful. PRESTRUCT_STRICT=1 fails build on config
  diagnostics (open question 1 resolved: env flag, default off).
- Simple enablement: `npx vitest run` runs 46/46.
  sync-engine.mjs check: ok.

**Latent break found and fixed (this is why the end-to-end build mattered):**

- The init template could never prerender on a fresh install: (a) missing
  vite.config.js -> JSX compiled via esbuild classic runtime -> "React is not
  defined" per route; (b) react-router-dom unpinned -> npm auto-installs v7,
  which dropped react-router-dom/server.js. Both masked by the graceful
  exit-0 fallback. Fixed: template ships vite.config.js (engine/vite.config.js
  -> init only) and pins react/react-dom 18 + react-router-dom ^6.30.
- Proof: `cd init && npm run build` -> 8/8 pages rendered, footer attrs on
  rebound prerendered pages, 404 + sitemap written.

**Learned:**

- The engine contract is 5 files + an INIT_ONLY surface; example-owned files
  (ssr configs, AppLayout, App, main, vite.config) must never be generated.
- Always re-run `node scripts/sync-engine.mjs` after touching engine/; CI
  fails otherwise (this is now the single place edits land).
- `dist/index.html` shell must survive attribute injection: the root-div
  matcher and inject-brand both expect extra attrs.

**Setup for next pass (Phase 1 cont./rest of PRD):**

1. Decide docs tagged for the footer behavior + strict flag (docs guides
   config.md / cli.md refresh).
2. PRD open question 2 (proxy in npm package) -> Phase 2 scaffolding.
3. PRD Phase 1 leftover: none; Phase 2 starts with package bin/cli.mjs.
4. Re-run example build once CF sync lands (CI builds auto-run on push).
