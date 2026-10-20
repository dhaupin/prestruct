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
---

## Pass 4 - Phase 2 scaffolding: npm packaging wired, dormant (2026-10-20)

**Done:**

- Root package.json is the npm package shape: exports map (prestruct/,
  prestruct/prerender, prestruct/inject-brand, prestruct/validate-config),
  bin -> bin/cli.mjs, files whitelist (bin + engine + init), peerDependencies
  resolve from the HOST project, type: module, engines >= 18. Version field
  1.0.0 set but NOT tagged and NOT published (per owner: prove stability
  first).
- bin/cli.mjs: init (never-clobber scaffold), build (validate -> vite build
  -> inject-brand -> prerender), validate (exit 1 on bad config), clean.
  prereq refactor: prerender(config, {root}) for host-project execution.
- .github/workflows/publish.yml: OIDC trusted publishing on v* tags ONLY,
  mirroring the dhaupin/crashtest runbook. Dormant: no tag exists - do not
  publish until stability is proven. One-time manual npm publish + Trusted
  Publisher setup required when it is time (runbook in workflow header).
- prereq fix: cleanCache() now mkdirs from the cacheFile path (cmdClean
  ENOENT found by smoke-testing CLI commands).
- Battery: 61/61 tests, sync check ok, init lint ok. Pack sim from clean
  checkout: 367.9 kB / 126 files, no junk. e2e after refactor: init build +
  example build both exit 0, example renders 8/8 with correct root attrs.

**Learned:**

- Destructuring a boolean return: `const { ok } = report(config)` yields
  undefined for a boolean return -> silent else-exit with EMPTY diagnostics.
  Debug-visible because console output vanished while trace-exit pinned the
  else branch. Rule: match return-shape to destructure (report returns ok
  boolean; validateConfig returns {ok, errors}).
- npm peers are auto-installed (npm 7+) - root devDeps must pin react/react-
  dom 18 and react-router-dom ^6.30 so engine.test.js can import prerender.js
  through vite's import-analysis (v7 has no ./server.js subpath).
- npm pack uses disk state, not git - check the tarball from a clean checkout
  (git archive sim) before trusting local dry-run numbers.
- CLI debug discipline: fs.appendFileSync probes bypass console entirely;
  use when stdout/stderr look possessed.

**Setup for next pass (stability completion, part of "go through prestruct"):**

1. Windows path check for cli init walk; example/AppLayout has paths in
   engine that need re-shape? None - keep as-is.
2. Fresh-project simulation: use the packed tarball in a scratch Vite app
   after `npm pack`, verify prestruct init/build/validate E2E (uses the real
   npm morphology, not the repo shape).
3. Then the stability sweep for the engine (PRD phase 2 gate for v1.0.0):
   docs guides refresh (config.md / cli.md refresh + footer semantics), CI
   green, brain + TASKS updated. Only then discuss tagging/publishing v1.0.0.

## Pass 5 - Docs refresh: README/AGENTS/deploy guides crosslinked to reality (2026-10-20)

**Done:**

- README.md rewritten (pre-package era text was 90% stale): npm package quick
  start (prestruct init/build/validate/clean), engine monorepo layout table,
  captive CLI section removed (v0.2.6 release table gone), dormant publish
  state stated plainly, crosslinks to docs/, README-proxy, AGENTS, SCOPE, PLAN.
- AGENTS.md: react-router-dom/server.js section now records the v7 package-root
  fallback + "test against installed v7" rule (from the tarball e2e pass). New
  section "The npm package: host-project execution, not self-hosted deps"
  (peerDeps contract, prerender(config,{root}), CLI surface, report-boolean and
  gitignore-anchoring lessons, sync discipline, crosslink block).
- docs/guides/cloudflare.md (the de-facto deploy.md): CLI/3-step-script build
  mention, Node 20 default + PRESTRUCT_STRICT, removed the WRONG cache hint
  (curl x-prestruct-refresh against the Pages domain - that header flushes the
  RENDER PROXY cache, not Pages), Pages-vs-proxy boundary clarified, condensed
  best practices into next-steps crosslinks.
- README-proxy.md: notes that npx prestruct init already scaffolds the proxy
  files. SCOPE.md Key Files moved off dead scripts/ paths to engine/ + bin/;
  PLAN.md Docs section unmangled (footer had been glued to the link list).

**Verified:** relative-link sweep across the six touched files - every .md
target resolves (two checker false-positives in cloudflare.md were sibling
guides, correct relative to the file). Commit: f279122 (6 files, +280/-185).

**Learned:**

- "deploy.md's" in repo vocabulary = README-proxy.md (VPS/Worker) +
  docs/guides/cloudflare.md (Pages). They flank different halves of deploy and
  must stay crosslinked or readers route through the Pages guide for lines
  that belong to the proxy.
- Code-first lesson from CONTENT.md pays: the new README is shorter than the
  old one despite covering MORE (CLI, package, layout table).

**Setup for next pass:**

1. CF Pages deploy of docs/ (no Pagefind in the Pages build today).
2. When it is ever time to publish: tag flow per publish.yml runbook only.

## Pass 6 - Phase 3 P1s: Worker bot-list sync + VPS keep-alive starters (2026-10-20)

**Done:**

- **Worker bot list sync (PRD P1).** `syncProxyBotList()` added to
  `engine/scripts/inject-brand.js`, called at the end of `injectBrand()` when
  `config.proxy.url` is set: rewrites the `BOT_LIST` array literal in
  `scripts/proxy.worker.js` from `config.proxy.botList`. Idempotent (no write
  when equal), skips silently when the Worker file is absent (proxy optional /
  example has none), warns and skips when the array literal can't be found
  (manual-edit infestation), returns the found/synced boolean for callers.
  Escapes backslashes and single quotes in bot tokens (same toReplaceSafe
  discipline as all injected strings).
- 8 new behavior tests in `tests/inject-brand.test.js` run against real
  temp-dir worker files (rewrite, no-op missing file, no-op on empty/malformed
  botList or missing proxy.url, no-op when BOT_LIST absent, idempotence,
  quote escaping). Suite: 21 tests in that file; battery 68/68.
- **pm2 + systemd starters (PRD P1).** `init/ecosystem.cjs` (pm2 config:
  fork-mode, single instance, 700M memory cap, 3s restart backoff, Chromium
  headroom documented - never clusterise the proxy) and
  `init/scripts/prestruct-proxy.service` (systemd unit: EnvironmentFile for
  PRESTRUCT_SECRET, PORT comment, hardening PrivateTmp/NoNewPrivileges,
  WorkingDirectory/User to edit). Both ship via `prestruct init`.
- README-proxy.md: step 5 now points at the shipped starters with a table +
  pm2 commands; "Keeping bot lists in sync" rewritten: the build syncs the
  Worker's BOT_LIST automatically (old hand-copy instructions removed).
- **PRD open questions closed** (Section 6 answers written): W4 =
  PRESTRUCT_STRICT env flag, default off (landed in Phase 1); proxy = copy-in
  via prestruct init, never npm-imported; example-only features = shared-engine
  config flags (deployIdFooter); docs stay Jekyll/gh-pages. Phase 3 progress
  table updated (robots.txt, cache stats, migration refresh remain P2 open).
- PLAN.md feature table refreshed to current reality (engine single-source,
  CLI, validation, fetchRoutes all Done; NPM package = built but dormant;
  bots/starters Done) and "Current" list now says v1.0.0 unpublished.

**Verified:** sync check 5/5 byte-identical engine->init+example; vitest
68/68; node --check on engine + ecosystem.cjs; ecosystem loads via require.
systemd-analyze isn't installed locally, so the unit file was verified by
inspection only (PORT/secret contract match against proxy.js source: lines
75/271). Remaining Phase 1-era open item unchanged: fresh-project tarball E2E.

**Warts found:** none new; search-tool/git-noise issues in this box were
environmental, not repo defects.
