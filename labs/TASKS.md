# TASKS.md -- pass log for prestruct

Working log, not documentation. One section per pass: what was done, what was
learned, what the next pass should pick up. Newer passes on top.

---

## Pass 2 -- Phase 0: stop the bleeding (2026-10-20)

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
  only one copy -- OldSchool fix: always change `init/`, then run
  `node scripts/sync-engine.mjs`.
- W8 (latent bug found during reconciliation): with `deployIdFooter: true`,
  inject-brand rewrites `<div id="root"` before prerender runs, so
  prerender's `'<div id="root"></div>'` shell replace misses and every route
  prerenders empty. Dormant (both configs use false). Phase 1: make
  prerender's root-div matcher attribute-tolerant.
- Root lint has never worked (`type: module` missing); do not "fix" casually --
  adding `"type"` to root package.json changes module semantics for every
  root `.js` file; bundle it with the Phase 1 engine extraction.
- Vant brain runs in a dedicated install (`/home/daytona/vant`) with its own
  default template brain parked in `template-brain-backup/` (gather captures
  ALL scopes in an install, no CLI filter -- so a shared install would bloat
  the repo stone with unrelated brain content). Canonical brain content lives
  in `models/private/prestruct/`; `models/public/prestruct/` is a curated
  pointer-only mirror that feeds the repo stone.
- Public stone: `horcrux/prestruct-p_st0neph0enix2026.svg`. Password
  `st0neph0enix2026` is IN the filename by design (boot convention) so the
  OSS brain is bootable by contributors/agents: restore via  `VANT_ALLOW_FILENAME_PW=true` (vant gates legacy filename-password lookup)
  or via an explicit password / `VANT_BRAIN_PASSWORD`. Locator schema quirk
  learned:
  `parseFilenamePassword` splits on `-`/`_` and takes only the first segment
  after `p_` -- stone passwords must never contain separators or they can
  never round-trip through the filename convention. Consequence of the  transparent password: every file in the dedicated install ships inside the
  stone -- OSS-safe discipline applies to the whole brain, personal/private
  content must live in a separate install's brain instead.

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

## Pass 1 -- audit and PRD (2026-10-20)

- Full repo audit. Findings logged as W1-W7 in `labs/prd.md` (engine drift,
  no engine source dir, version sprawl, exit-0 policy, incremental stub,
  duplicated meta logic, non-portable example config).
- Suite was 45/46: failing test was the init<->example sync check on
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

## Pass 7 - Tarball E2E (2 real bugs), .ignore, P2 leftovers: robots + cache stats (2026-10-20)

**Deliverables:**

- **`.ignore` added** for ripgrep/search-tool noise: package-lock.json (41k
  lines), init/ + example/ (generated byte-identical copies - single source is
  engine/), node_modules, dist, docs/_site, coverage, horcrux/ binary assets,
  OS/editor noise. Baseline: 11,123 files visible to search -> 54. Git
  tracking is NOT affected (that is still .gitignore's job) - documented in
  the file header.
- **Fresh-project tarball E2E** (the Phase-1-era setup item, done for real):
  `npm pack` -> bare scratch Vite app -> `npm i <tgz>` -> `npx prestruct init`
  -> `cp ssr.config.example.js ssr.config.js` -> `npx prestruct validate` ->
  `npx prestruct build`. Full pipeline green end-to-end through the real npm
  morphology (not the repo shape). **Two real bugs caught live:**
  1. **npm pack shipped 4,007 files / 17MB** - disk-state lesson from pass 4:
     init/node_modules + init/dist sat on disk under the `files` whitelist.
     Fixed with negation patterns in files + `init/.npmignore`; tarball now
     35 files / 57KB, zero vendored deps. (New AGENTS lesson: `files`
     whitelist entries take negation patterns AND nested .npmignore - belt
     and braces, keep both.)
  2. **Title regex dotall trap (engine/scripts/inject-brand.js).** Every
     `prestruct init` user's shell carries `<title>, description...` inside a
     build-instruction comment; the dotall `s` flag paired that comment
     fragment with the REAL closing `</title>` far below, eating the comment
     closer and landing a malformed head. The example build never hit it
     (example's first literal title IS the real tag), so tests + example
     smoke were blind to it. Fix: drop the `s` flag (`[^<]*` single-line
     matching means a fake closer-less fragment is auto-skipped) + reword
     init/index.html's comment so the literal expression loses its teeth.
     Regression tests: 2 (trap-active + trap-fixed shells).
  3. **CLI silently dropped --force/-f/--clean on `prestruct build`.** Engine
     accepted the flags (`prerender(cfg, {force})`, `cleanCache()`) but
     `bin/cli.mjs` built `{root}` only: `--force` logged "(cached)" and
     served stale HTML, `--clean` was a no-op. Fix: args forwarded to
     prerender + cleanCache; HELP updated. Verified via tarball reinstall:
     "(forcing rebuild)" appears and dist reflects config changes.
- **P2: robots.txt generation** - `generateRobots(config)` in
  engine/scripts/prerender.js + write during prerender when `config.robots`
  is set (true = minimal block + Sitemap pointer; object = custom body +
  opt-out `sitemap:false`). Without the key, an author-owned
  public/robots.txt is never touched. 5 unit tests.
- **P2: cache stats** - `dist/.prestruct/status.json` written every build
  (generatedAt, routeCount, succeeded, cached, force, routes[].cached).
  Static-sites-safe per PRD preference (a file, not a runtime endpoint).
  Verified live in the tarball e2e (`cat dist/.prestruct/status.json |
  jq .succeeded` pattern works in CI health-checks).
- **Docs**: docs/guides/config.md gained "robots.txt (opt-in)" +
  "Cache stats (static monitor)"; PLAN.md feature table rows flipped to Done.

**Verified:** sync 5/5 contract files byte-identical; vitest 75/75
(7 new unit tests this pass); scratch rebuild produced correct dist
(robots.txt present, status.json valid JSON, title reflects route meta
under --force and under default cache-skip). Tarball down to 57KB, so CI
and npx installs stop transferring idle MB of node_modules.

**Next:** upstream the AGENTS.md lessons (npm pack disk-state negation +
.npmignore both; title-regex comment trap; CLI flag pass-through linter);
then the still-open P2: refresh docs/guides/migration.md after the engine
extraction, if the doc's claims drift further from reality.

## Pass 8 - AGENTS lessons verified + pushed; migration.md refreshed (2026-10-20)

**Done:**

- **Pushed** all 7 accumulated local commits to origin/main (14695c6.c7bfc83.
  e60d0b0.f279122.5438363.1ffb2c0.4fe5ce3 -> 4fe5ce3 live at HEAD).
- **AGENTS.md gained 3 pass-7 lessons** under the npm package section:
  1. npm pack uses DISK state, not git -- files-whitelist covers whatever sits
     on disk under it; fix pattern is files-negation + nested .npmignore +
     `tar -tzf | wc -l` as the size gate (35 files / 57KB expected, not 17MB).
  2. Title-regex dotall trap -- never dotall a regex that replaces an HTML
     tag; shell prose (comments carrying `<title>,`) pairs with the real
     closing tag cross-line and corrupts the head. `[^<]*` single-line is
     comment-proof.
  3. CLI-to-engine flag pass-through -- engine-accepted options reachable from
     the CLI need an installed-package verification; repo-shape tests use a
     different module instance and cannot see the gap (found live: `--force`
     silently no-op'd through `prestruct build`).
- **docs/guides/migration.md refreshed** against current reality:
  - New first section "From prestruct v0.1 / v0.2 (older layouts)" -- the
    upgrade path the PRD asked for: CLI install, init never-clobber semantics,
    a habit-vs-reality table (engine single source, PRESTRUCT_STRICT,
    deployIdFooter config flag, robots opt-in, build-managed Worker bot list),
    and `--clean` guidance for stale incremental caches.
  - CRA steps now lead with `npm i -D prestruct` + `npx prestruct init` and
    `build: "prestruct build"`, keeping the hand-copy 3-step script as an
    explicit dep-free escape hatch.
  - "Common migration patterns" dynamic-data block switched from a hand-rolled
    routes assembly to `fetchRoutes()` (matching docs/guides/config.md).
  - "After Migration" checklist now lists validate + cache-stats watch; PRD
    P2 "docs: migration guide from v0.1" item is DONE.

**Verified:** sync check 5/5 byte-identical; vitest 75/75 (battery green);
link hygiene intact (migration.md references docs/guides/config.md as
prose, all fenced blocks balanced after repair of a missing code-fence close
and a stray list item found during self-review).

**Now open:** P2 leftovers are cleared through robots.txt + cache stats +
migration guide. Remaining aspirational work per PLAN: none pending; next
natural step when the owner decides is to tag v1.0.0 and let the dormant
publish workflow fire.

## Pass 9 - Edge-case sweep: 6 defects found + fixed, E2E-proven (2026-10-20)

**Method:** line audit of all engine files (prerender.js, inject-brand.js,
validate-config.js, islands.js, usePageMeta.js) plus bin/cli.mjs cross-checked
against AGENTS.md's standing lessons; every fix got a regression test, and the
library-shape fixes got a tarball E2E confirmation through the real CLI.

**Fixed (all engine/ root, synced to init/ + example/):**

1. **replaceRootDiv $-expansion (the big one).** SSR output containing
   "$1"/"$&"-shaped text -- prices, code samples, quotes -- was a replacement
   string to String.replace and would expand into capture-group references,
   mangling prerendered HTML (same class as the documented $120 meta bug, but
   it hit EVERY route with a literal dollar sequence). Function-form replacer
   now; unit test + tarball E2E proof: route rendering "Price: $120 -- ref: $&"
   ships intact (pre-fix that $& duplicated the whole app markup inline).
2. **generate404 user-text injection + $-expansion.** notFound.heading/body/
   label/href/siteName went into markup raw (a <script> heading shipped
   working JS) and into string replacements (an $& heading rewrote the
   matched tag). Now: escapeXml on every user value before markup,
   function-form replacers in every replace() call. 2 tests.
3. **generate404's root-div replacer was string-form too** -- caught by the
   new $& test before it could ship. Converted with the rest.
4. **validate-config: duplicate route paths now error.** Two routes with the
   same path collide in the incremental cache key and double-write the same
   dist file with different meta (silent SEO corruption). Trailing-slash
   variants are correctly treated as distinct. 2 tests.
5. **syncProxyBotList $-tokens.** config.proxy.botList entries shaped like
   "$&" expanded inside the string replacer; function form keeps tokens
   literal. 1 test.
6. **prerender() process.exit(0) in library-called paths (no-routes, missing
   dist).** A callable function must never kill the host process (test
   runners / host CLI lose control). Both now return; CLI behavior is
   unchanged (build still completes, exit 0, same log lines).
7. **bin/cli.mjs init walk no longer ships .npmignore into user projects**
   (it belongs to the package tarball, not scaffolded apps -- a user's own
   npm-pack would prune their files). Proven in the E2E: scaffold contains
   no .npmignore.
8. **usePageMeta empty-base canonical guard.** Without siteUrl/VITE_SITE_URL
   the computed canonical was relative ("/about") and would be written as a
   non-canonical href; guarded to skip when base is empty.

**Tests:** 75 -> 81 (6 regressions). Battery green, sync 5/5 byte-identical.

**Not fixed (considered, fine as-is):** islands.js visible-strategy leaves an
IntersectionObserver attached if a visible island is removed pre-intersect
(browser-only, GC'd with the element); generateRobots writes cfg.body raw to
robots.txt (plain-text file, no HTML injection surface); sitemap changefreq/
priority unescaped (closed-value validation upstream). Logged here so the
next audit doesn't re-open them.

CLI state: local commit only this pass -- push on request as usual.

## Pass 10 - Issue ledger closed out; proxy vulns patched; versions unified (2026-10-20)

**Ledger question answered: yes -- all tracked prestruct issues are now fixed
and closed.** Full tally below; the PRD wart table gained a closeout ledger so
the next reader stops asking. Note W3 had silently REOPENED after the 1.0.0
npm-shape move (root 1.0.0 vs init/package.json + VERSION stuck at 0.2.6);
recovered this pass and pinned closed with a CI test.

**Security/edge fixes (proxy pair -- init-owned copy-in files, not engine
contract):**

1. **VPS proxy render queue skipped acquisition (DoS, P1).**
   `withRenderLimit` queued overflow requests as bare `fn()` calls: the first
   freed slot decremented activeRenders, then the queued fn ran WITHOUT re-
   acquiring -- activeRenders under-counted, concurrency became unbounded
   again exactly under sustained bot load (the browser-pool OOM scenario the
   limit exists for). Queued callbacks now recurse into withRenderLimit (safe:
   the queue branch cannot recurse twice) and rejections propagate to the
   waiting caller (previously swallowed, leaving the caller's promise forever
   pending - a second latent bug in the same line).
2. **Timing-safe secret compare in BOTH proxies.** The x-prestruct-refresh
   header compare was `===` against PRESTRUCT_SECRET; response-time differences
   gated on the first differing byte enable byte-by-byte secret recovery.
   VPS: SHA-256 both sides + crypto.timingSafeEqual. Worker (no node:crypto):
   XOR over both encoded secrets' full byte length.
3. **Worker HIT responses now carry X-Prestruct-Rendered-At** (KV stores
   {html, cachedAt} JSON; legacy bare-HTML cache rows parse-fail into a
   safe fallback because KV rows live < 24h TTL). Header was previously
   missing on hit -- the one VPS/Worker parity gap the audit found.
4. **Worker comment cleanup** of the timing-safe block avoided a truncated
   sentence ("secretWorkers").

**Version unification (W3 reclosed):** root package.json, init/package.json,
init/VERSION now all 1.0.0; release.yml stamps init/package.json (JSON
rewrite, not just the text VERSION append) plus init/VERSION from the tag;
qc.test.mjs pins all three equal -- the drift that reopened W3 can no
longer land silently (battery: 82/82 with the new test).

**Walk of remaining proxy surface considered and cleared (logged so the next
audit skips them):** URL-concat cannot pivot origin (absolute-form request
URLs become a PATH on the target host); express 405 gate runs before the GET
handler; VPS HIT carries mtime-based Rendered-At (parity now true on both
proxies); KV put shares TTL with bot-served rows; CSP injection in
inject-brand only touches connect-src with an origin allow-list pattern.

**Verified:** node --check on both proxy files; vitest 82/82; sync check 5/5
byte-identical (proxy files intentionally outside the contract list).

---

## Pass 11 - Proxy unit battery + live timing harness (express/puppeteer installed)

Post-pass-10 follow-through: the three security fixes had no execute-able
proof because both proxy files bound express/puppeteer at import time and the
repo had neither dep. Fixed the shape, then tested.

**Import safety (gate + lazy imports), matching the engine-file convention:**

- `init/scripts/proxy.js`: `createProxyApp(config)` + `isMainExecute()` gate;
  config binding, listen, browser pre-warm only on direct execution;
  `secretMatches`/`isBot`/`withRenderLimit`/`MAX_CONCURRENT` exported.
- `init/scripts/proxy.worker.js`: top-level `import '@cloudflare/puppeteer'
  REMOVED - lazy dynamic import inside the render step (unit tests import the
  module without the package); `refreshSecretMatches`/`isBot`/`cacheKey`
  extracted and exported; verified `import()` succeeds with the package
  absent (which the static import failed).
- `PRESTRUCT_CACHE_DIR` env override for the VPS proxy's import-time
  `mkdirSync('.prestruct_cache')` (tests/CI no longer litter the CWD); added
  `.prestruct_cache/` to .gitignore as belt-and-braces.

**Tests: `tests/proxy.test.js` (20 tests, battery now 102/102)**

- withRenderLimit queue: saturates exactly at MAX_CONCURRENT and never
  exceeds under 40-job overflow (the pass-10 unbounded-concurrency bug can
  not regenerate); queued rejections propagate instead of hanging callers;
  immediate-path rejections propagate too.
- VPS `secretMatches`: exact match true; wrong first/middle/last byte,
  longer/shorter token, empty/null header all false; NO secret configured ->
  false for everything (feature-off, not allow-all).
- Worker `refreshSecretMatches`: same candidate set, and results are pinned
  EQUAL to the VPS comparator's on identical inputs (parity test).
- Worker helpers: cacheKey determinism + URL-safety, isBot list, default
  export shape.

**Live timing harness: `tests/timing-harness.mjs` (run manually, not in the
battery - statistical results):**

- Layer A (hrtime, interleaved-batch microbench, 120x256 samples/candidate,
  6 candidate tokens diverging at different offsets):
  - VPS fixed comparator: FLAT - all |t| <= 0.42 vs correct, medians ~1.35us.
  - Worker fixed comparator: FLAT - all |t| <= 0.94, medians ~1.15us.
  - naive `===` control (the old code shape): DISTINGUISHABLE - t = 86.8 on
    the wrong-first-byte token, t = 8.1-10.4 on length variants: the early-
    exit leak shape is REAL and measurable at nanosecond granularity. This is
    the empirical proof for pass 10's fix #2, before vs after.
- Layer B (real TCP socket): an amplified naive control (sleep proportional
  to matched prefix) is DETECTED by the harness end-to-end (methodology has
  signal); the REAL VPS app over real sockets is below-threshold across all
  candidates (p50 ~0.7-0.8ms; network jitter, not gate timing, dominates).
  Two harness verdict bugs were found and fixed during bring-up: leak
  detection direction (correct token is the slow one under naive prefix
  compares - detection must be symmetric), and a vacuous baseline
  (`entries.find(...)[1]` is the array, `.p50` was undefined -> everything
  below-threshold, B2's first PASS was hollow).

**Honest limitations:** the wrong-middle naive token stays undetectable in
this V8 build (~same ns cost as full compare) - naive-=== characterization,
not a claim about the fix; the Worker's fetch handler needs the Workers
runtime and is covered by comparator-level tests only (same limitation shape
as documented in pass 10). Harness is deliberately not a CI test: machine
noise makes hard statistical thresholds flaky; the vitest battery covers the
behavioral logic deterministically.

**Verified:** vitest 102/102 (was 82; +20 proxy tests); sync check 5/5;
`node --check` on all touched js; harness OVERALL PASS exit 0.

---

## Pass 12 - Docs side quest setup: vant-frame port + docs-audit suite wired

The docs side quest, setup phase. Docs were stale (jekyll-theme-minimal frame,
pre-package install story, missing pages pattern); per owner direction the
frame now matches dhaupin/vant/docs and carries vant's docs-audit suite.

**Frame ported from vant (re verified how vant ACTUALLY works via research
first):**

- docs/_layouts/default.html - custom layout (sidebar from site.data.nav,
  Pagefind modal + Cmd+K, dark mode, copy buttons, Prism). Vant-brand strings
  replaced (title/desc/favicon/github links/license); pagefind + brand paths
  use site.baseurl; search result URLs guarded against /prestruct doubling
  (the baseurl gotcha is already in AGENTS.md from the pre-Jekyll docs).
- docs/Gemfile - jekyll ~> 4.3 + jekyll-redirect-from only; theme gem gone.
- docs/_config.yml - vant shape (no theme, no defaults block; every page
  carries layout via frontmatter).
- docs/_data/nav.yml - the freestruct menu layer: 6 sections / 23 pages.
  Vant's _plugins/nav_generator.rb was NOT ported: research showed vant's own
  layout consumes site.data.nav while the generator writes site.config['nav']
  - a vestigial mismatch, not a feature.
- All 23 docs pages retrofitted with the 5-field frontmatter contract
  (version/permalink/layout/title/nav_order); nav_order collisions from the
  old config partially deduped (proxy 15, redirects 12).
- docs.yml workflow: UNCHANGED (Jekyll + Pagefind + artifact deploy) -
  bundler-cache picks up the new Gemfile automatically.

**Docs-audit suite ported + adapted (scripts/check-*.cjs, wired as
lint:docs + lint:claims, run in test.yml CI):**

- Port gotcha caught live: repo is "type": "module", so the ported CommonJS
  .js scripts died at first run; renamed .cjs. Vant-package-shaped
  assumptions (bin/vant.js, ./lib requires, /vant baseurl) retrained onto
  prestruct truth: bin/cli.mjs case-dispatch, engine/init/example module
  refs, /prestruct permalinks.
- fiction-signatures = THIS repo's audit history made mechanical: 0.2.6
  stale version, npx degit install story, bare react-router-dom/server,
  the SPA-fallback /index.html 200 rule, vite build --ssr (banned approach),
  jekyll-theme-minimal (dead frame). Negation + FICTION-OK escape valves.
- check-language.cjs ported verbatim (docs/ + labs/ + .github/ + root meta
  scripts, longest-run >= 3 per Unicode script block) - our own mid-session
  language drift history makes this one earned, not borrowed.

**Findings fixed (the first audit cycle):** frontmatter x47 -> PASS;
links x4 -> PASS; style x44 (16 untagged fences, 20 emoji-in-prose, 5
trailing-whitespace) -> PASS; stale npx degit quick starts on docs/index +
getting-started -> package-era; bare SPA-fallback example in troubleshooting
-> removed-path example; 3 lesson-quotes in architecture.md documented via
FICTION-OK waivers. Suite final: 6/6 gates PASS.

**Cross-repo bugs filed on dhaupin/freestruct (the jekyll/freestruct stack
research turned up):**

- freestruct#7 - README says v0.3.0 while package.json/CHANGELOG say 0.3.2,
  and no tags/releases exist to verify either.
- freestruct#8 - README config example is invalid YAML (nested site/twitter/
  og keys lost their indentation).
- (freestruct#2 - packaging/unpublished-npm was already open; not duplicated.)

**Verified:** lint:docs PASS (style/links/frontmatter/language/truthfulness),
lint:claims PASS, vitest 102/102, sync check 5/5. No ruby/bundle in the
workspace, so the Jekyll build itself is validated by the docs.yml CI job,
not locally (documented limitation).
