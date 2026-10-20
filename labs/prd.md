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

Progress (landed in the pass after Phase 2):

- [x] **Worker bot list sync (P1).** `syncProxyBotList()` in
  `engine/scripts/inject-brand.js` embeds `config.proxy.botList` into
  `scripts/proxy.worker.js` at build time. Idempotent; skips silently when
  `config.proxy.url` is unset or the Worker file is absent. Tests in
  `tests/inject-brand.test.js`.
- [x] **pm2/systemd starter files (P1).** `init/ecosystem.cjs` (pm2, fork-mode,
  single Chromium pool, memory cap) and `init/scripts/prestruct-proxy.service`
  (systemd unit, secrets via `EnvironmentFile`) scaffolded by `prestruct init`;
  README-proxy.md documents both plus expectations (never clusterise).

Still open:

| Item | Priority | Notes |
|------|----------|-------|
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

Answers written after the fact -- these are no longer open:

1. **W4 (exit 0 on fatal): RESOLVED -- env flag, default off.** Landed in
   Phase 1: `PRESTRUCT_STRICT=1` makes config diagnostics and build failures
   exit 1; default behavior stays exit-0 for CF Pages (see docs/guides/config.md).
2. **Proxy in the npm package: RESOLVED -- copy-in.** `prestruct init`
   scaffolds `scripts/proxy.js`, `scripts/proxy.worker.js`, and
   `proxy.package.json` into the host project; the engine never imports them.
   Workers cannot run an npm-imported Express proxy, and the VPS copy needs
   host-editable config loading, so proxy files are per-project assets.
3. **Example drift policy: RESOLVED -- config flag on the shared engine.**
   The deployIdFooter feature (previously an example-only edit) is now a
   boolean config option (`deployIdFooter === true`) with shared-engine
   semantics, and example/ is a generated byte-identical copy (except its
   own branding config files).
4. **Docs site: stays Jekyll/GitHub Pages for now.** Engine extraction made
   a Vite-docs move cheap in principle, but search (Pagefind) + gh-pages
   workflow work until there is a feature reason to migrate.

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

Status after passes 5-10 (closeout ledger -- evidence above is historical):

| Wart | Status |
|---|---|
| W1 engine drift | CLOSED -- engine/ single source, sync-engine generater + CI check |
| W2 engine inside template | CLOSED -- engine/ at repo root ships as the npm package |
| W3 version sprawl | CLOSED (reopened once more after the 1.0.0 npm-shape move, reclosed pass 10: root == init/package.json == init/VERSION, pinned by a qc test; release workflow stamps all template version files from the tag) |
| W4 silent exit-0 | CLOSED -- PRESTRUCT_STRICT=1 flag, default off |
| W5 incremental.js stub | CLOSED -- stub deleted, cache logic lives in prerender.js |
| W6 triplicated meta logic | CLOSED-BY-DESIGN -- three writers remain but each owns a distinct HTML surface (global brand vs per-route meta vs 404); shared exports cover the overlap |
| W7 non-portable example config | CLOSED -- deployId/deployIdFooter are engine config flags |
| W8 footer attr breaks prerender | CLOSED -- replaceRootDiv is attribute-tolerant AND carries attrs forward |
| W9 dead footer-scan ordering | CLOSED -- folded into prerender.js root-div handling (no dist-subdir scan remains in inject-brand) |

Phase 3 (post-Phase-2 pass): Worker bot-list sync + pm2/systemd starters landed
(see Section 4); open questions in Section 6 answered as resolved. Engine,
init/, and example/ byte-identical; full vitest battery green.
