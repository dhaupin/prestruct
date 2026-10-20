# PRD: Prestruct Next Steps

**Status:** Phase 0 complete (see Section 7)
**Date:** 2026-10-20
**Reads first:** [AGENTS.md](../AGENTS.md), [SCOPE.md](../SCOPE.md), [PLAN.md](../PLAN.md)

---

## 1. Product one-liner

Prestruct renders every route of a Vite + React app to static SEO-HTML at build time.
Config is the API. No runtime SSR. No bloat.

---

## 2. Where the rigging is wacky (current state)

Verified facts, not vibes:

| # | Wart | Evidence |
|---|------|----------|
| W1 | **Engine drift between `init/` and `example/`** | `init/scripts/inject-brand.js` and `example/scripts/inject-brand.js` differ (deployId/deployIdFooter). `tests/qc.test.mjs` sync test FAILS today (45/46 passing). CI sync check would fail on next push. |
| W2 | **Engine lives inside the template it distributes** | Core scripts (`prerender.js`, `inject-brand.js`, `islands.js`, `usePageMeta.js`) only exist as *copied* files. Changing the engine means editing `init/`, re-syncing `example/`, and re-shipping the template. The library IS its merge artifact. |
| W3 | **Version sprawl** | Root `package.json` says `1.0.0`, `init/package.json` says `0.2.1`, PLAN.md says `v0.2.6`. No single source of truth. |
| W4 | **Fatal errors exit 0** | `prerender.js` calls `process.exit(0)` on every failure path (bad config, missing dist, render errors). Deliberate CF-Pages-correctness trade, but it makes real config mistakes invisible, and it undermines any later "config validation" feature. |
| W5 | **`incremental.js` is a stub** | Cache logic is hand-inlined in `prerender.js`; the shipped `incremental.js` is comments + dead code. |
| W6 | **Duplicated meta-injection logic** | Meta tag rewriting logic exists separately in `prerender.js` (injectMeta), `inject-brand.js`, and `generate404` inside prerender.js. Three regex engines, one job. |
| W7 | **Example contains non-portable config** | `example/ssr.config.js` options (deployId, deployIdFooter) exist in one engine copy only. Users who copied `init/` and set them get silently ignored opts. |

Fixing W1-W3 is a prerequisite for everything in Section 4, because every new
feature multiplies in both engine copies.

---

## 3. Decisions already locked (moved from AGENTS + SCOPE)

Do not revisit these. They are documented and debugged:

- ssrLoadModule, never `vite build --ssr`
- AppLayout must never import BrowserRouter
- Build-time prerender only (no streaming, no edge runtime, no per-request SSR)
- Islands are separate React roots, outside hydration
- Proxy optional; disabled unless `config.proxy.url` set
- CF Pages pretty URLs are left alone (no redirect rules for prerendered paths)

---

## 4. Phases

### Phase 0 — Stop the bleeding (this PR)

Goal: green CI, no engine drift, no code behavior changes.

| Task | Files |
|------|-------|
| 0.1 Reconcile `inject-brand.js` drift: merge deployId/deployIdFooter into `init/` (single source) and copy to `example/` | `init/scripts/inject-brand.js`, `example/scripts/inject-brand.js` |
| 0.2 Add a sync script (`node scripts/sync-engine.mjs`) that copies init→example; document it in engine-sync-check.yml error message | `scripts/sync-engine.mjs` (new, at repo root) |
| 0.3 Decide version truth: root `package.json` becomes the release version; both `init/package.json` and PLAN.md reference it | root `package.json` |

Estimated: half a day. No behavior change. Tests go green.

### Phase 1 — Extract the engine (the "clean up internals" focus)

Goal: one engine, imported -- not copied.

1. **`engine/` directory at repo root.** `prerender.js`, `inject-brand.js`,
   `islands.js`, `usePageMeta.js` live here with a stable export surface
   (`prerender(config)`, `injectMeta(html, meta, url)`).
2. **`scripts/sync-engine.mjs`** is a derived-artifact generator: it copies
   `engine/` → `init/` → `example/` with path rewrites. Byte-identical CI check
   stays; it now verifies the generator ran, not that humans edited twice.
3. **Delete `init/incremental.js`.** Inline cache logic in prerender.js becomes
   a small module inside `engine/`.
4. **Config validation** (carries PLAN P1): validate `ssr.config.js` shape in
   `engine/validateConfig.js` with clear errors. Behavior keeps exits 0 on CF
   Pages, but emits structured diagnostics (`[prestruct] Invalid route meta: /blog: expected {title}`).

Acceptance: npx vitest run passes; a fresh `cp -r init/*` still works unchanged
in a clean Vite app (verify in `example/`).

### Phase 2 — The npm package (PLAN P2 pulled up)

Goal: `npx prestruct init` or `npm i prestruct` works.

- Ship `engine/` as the package; init template becomes a string bundle the CLI
  scaffolds from
- Root `package.json` gains `bin`: `"prestruct": "bin/cli.mjs"`
- CLI subcommands: `init`, `build`, `validate` (mirrors `scripts` jobs)
- Config-first: no postinstall magic

Acceptance: `npx prestruct init` in a fresh Vite app produces a working build.

### Phase 3 — Remaining roadmap items

| Item | Priority | Notes |
|------|----------|-------|
| Worker bot list sync | P1 | Write botList into `wrangler.toml` or asset at build; no manual copy |
| pm2/systemd starter files | P1 | Template alongside `init/` for VPS users |
| Robots.txt generation | P2 | Existing `public/robots.txt` stays authorable; prerender touches it only when config says so |
| Cache stats endpoint | P2 | Serve JSON at `/_prestruct/status` or write `dist/.prestruct/status.json` (staticsites-safe option preferred) |
| Docs: migration guide from v0.1 | P2 | `docs/guides/migration.md` exists; refresh after Phase 1 breaks the layout |

Ordered by user cost of not having them. Do not begin Phase 3 until Phase 1 lands.

---

## 5. Out of scope (inherited, restated)

- Runtime SSR, streaming SSR, edge rendering
- Built-in CMS adapters (config hook, not bundling)
- Turborepo/monorepo restructure of `docs/`

---

## 6. Open questions

1. **W4 (exit 0 on fatal):** does Phase 1 add a `PRESTRUCT_STRICT=1` env (exit 1
   locally, exit 0 on CF) or keep exit 0 and rely on stdout parsing? Leaning:
   env flag, default off.
2. **Does the proxy ship in the npm package**, or stay a copy-in file like it is
   today? Workers cannot SSR-render an imported npm file, so copy-in is likely
   correct; needs a note in `docs/guides/proxy.md`.
3. **Example drift policy:** when a feature is example-only (deployIdFooter),
   does it live in the example's own scripts, or off config flags in the shared
   engine? Leaning: config flag in shared engine, defaulted per-platform.
4. **Docs site:** stays Jekyll/GitHub Pages, or moves to the example's Vite app
   once Phase 1 makes SSR available anywhere cheaply?

---

## 7. Phase 0 completion log

Landed in this pass:

- **W1 fixed.** deployId/deployIdFooter merged into `init/scripts/inject-brand.js`
  as single source; footer default flipped to opt-in (`config.deployIdFooter === true`)
  matching the semantics already documented in `init/ssr.config.example.js` and
  set in `example/ssr.config.js`. Example copy is byte-identical. Tests: 46/46.
- **Sync script added.** `scripts/sync-engine.mjs` (copy + `check` mode), wired
  as `npm run sync` / `npm run sync:check`; `engine-sync-check.yml` error message
  now points to it. Covers the 4 CI-checked engine files + `AppIslands.jsx`.
  `ssr.config.example.js` excluded (example-owned branding).
- **W3 fixed.** Version single-sourced at `0.2.6` in root and `init/package.json`;
  PLAN.md engine-sync row marked done.

New warts found during reconciliation (handled in Phase 1, no behavior change now):

| # | Wart | Evidence |
|---|------|----------|
| W8 | **Footer opt-in breaks prerender matching** | When `deployIdFooter: true`, inject-brand rewrites `<div id="root"` into `<div id="root" data-deploy-id-footer`, so prerender.js's `shell.replace('<div id="root"></div>', ...)` no longer matches and every route prerenders as an empty shell. Latent today (both configs use `deployIdFooter: false`). Prerender's root-div matcher should tolerate extra attributes. |
| W9 | **inject-brand footer-scan ordering is wrong** | The final dist-subdirectory scan in inject-brand runs before prerender.js creates the route pages, so the scan finds nothing on a clean build. Harmless but misleading; fold into prerender.js root-div handling in Phase 1. |
