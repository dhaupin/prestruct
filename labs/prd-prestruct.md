# PRD: Prestruct Roadmap

**Status:** rewrite 2026-10-21 -- supersedes the 2026-10-20 planning PRD (that
one's phases all landed; its ledger is preserved in TASKS.md and retired here)
**Reads first:** [AGENTS.md](../AGENTS.md), [TASKS.md](./TASKS.md)

---

## 1. Product one-liner (unchanged)

Prestruct renders every route of a Vite + React app to static SEO-HTML at
build time. Config is the API. No runtime SSR. No bloat.

---

## 2. Current shipped surface (the v1.0.0->1.1.0 state)

Verified against the engine at HEAD, not memory:

| Surface | State |
|---|---|
| Engine (`engine/`, single source) | `prerender.js` (ssrLoadModule, incremental route cache, sitemap, 404, robots), `inject-brand.js` (meta/OG/JSON-LD, deployId, WORKER bot-list sync), `validate-config.js` (structured diagnostics), `src/islands.js`, `src/hooks/usePageMeta.js` |
| Config keys | `siteUrl`, `siteName`, `routes[].meta/priority`, `robots` (`true` or `{ aeo: true, aiBots: 'block'|'allow' }` per-vendor preset), `proxy` (`url`, `botList`, `targetUrl`), `deployId`/`deployIdFooter`, `fetchRoutes()` build-time hook, `platform` (cloudflare full; vercel/netlify validate-only stubs), `PRESTRUCT_STRICT=1` exit-code flag |
| npm package | live at 1.0.0 (Trusted-Publisher tag pipeline, provenance-attested); CLI `init/build/validate/clean`; deep exports `prestruct/hooks`,`prestruct/islands`,`prestruct/engine/*`; `files` = bin/engine/init only (packs never ship) |
| Template (`init/`) | byte-identical to engine via `scripts/sync-engine.mjs`; scaffold imports are dual-major safe (`rrdNS.default ?? rrdNS` interop form); ships the proxy pair, wrangler.toml, pm2/systemd starters, self-testing zip battery |
| Platform state | vite 6.4.5 + vitest 5.0.5 (battery 147/147, tinypool pinned ^2.2.0 via overrides), react-router dual-major (battery pins v6, example runs v7 live), Node engines >=20, react 18 |
| Example | 8 routes on rrd 7.18.4/rendered 8/8; audit 0 findings; AEO-era docs |
| Adversarial QA | in-repo crashtest pack `packs/public/prestruct-proxy` v0.3.0 (5 shapes incl. cache-key variant parity), ledger 54/54 REFUSED at harness 1.1.0, CI lane = exact devDep pin, bump = `npm run crashtest:bump <v>` |
| Docs | Jekyll + Pagefind site, 23 guides, truthfulness/fiction gates in CI |

---

## 3. Completed ledger (what the old PRD left open, now closed)

The 2026-10-20 PRD's Phase 0-3 and warts W1-W9 all closed (evidence in
TASKS.md passes 1-18). The only rows that were still marked open there:

| Old open row | Closed by |
|---|---|
| Phase 3: robots.txt generation (P2) | `robots: true` opt-in generation, then the per-vendor AEO preset (`robots: { aeo: true, aiBots }`, commit 1b5f36d) |
| Phase 3: cache stats endpoint (P2) | `status.json` at project root `.prestruct/`, NOT in dist/ (issue 23; staticsites-safe variant chosen over a served endpoint) |
| Phase 3: migration guide refresh (P2) | already current -- documents `config.robots`, v1.0.0 frontmatter, per-release change lists |

Closeout rule that replaced the old planning format: AGENTS.md + TASKS.md
are the operating history; this file holds only current-state truth and
forward rows.

---

## 4. Decisions already locked (do not revisit)

- ssrLoadModule, never `vite build --ssr`
- AppLayout must never import BrowserRouter
- Build-time prerender only (no streaming, no edge runtime, no per-request SSR)
- Islands are separate React roots, outside hydration
- Proxy optional; disabled unless `config.proxy.url` set; proxy files are
  per-project scaffold assets, never npm-imported
- CF Pages pretty URLs are left alone (no redirect rules for prerendered paths)
- 404 page is pure static HTML (`root-404`, no JS)
- Engines declare Node >=20; battery pins react-router v6 for compile coverage,
  example runs v7 (both majors stay supported)

---

## 5. Out of scope (inherited, unchanged)

- Runtime SSR, streaming SSR, edge rendering
- CMS adapters (config hook only)
- Docs-site platform migration while Pagefind/gh-pages still work
- Monorepo restructure of `docs/`

---

## 6. Forward rows (candidates for the next phases, in cost-benefit order)

| Row | Why now | Notes |
|---|---|---|
| R1: tag v1.1.0 when the maintainer is ready -- SHIPPED (tagged v1.1.0, publish.yml + release.yml fired) | main carried five consumer-facing bug fixes (#18 #19 #20 #21 #23), the AEO preset, the pack v0.3.0, and the supply-chain hardening; all now published on npm 1.1.0 | Tag pipeline proven; npm scan-visibility caveat documented in CHANGELOG. |
| R2: flip the example's robots to the AEO preset -- SHIPPED (2026-10-26) | the docs' flagship feature was not demonstrated on the docs' own site | example runs `robots: { aeo: true }`; `public/robots.txt` deleted (prerender owns `dist/robots.txt` now); build verified 8/8 with the 6-allow / 5-block preset + sitemap line. |
| R3: decide the crashtest CI lane -- SHIPPED (pass 25 wired it, pass 26 pinned it, pass 29 made bumps one-command) | #24/#25 parked twice on "how does an external harness enter CI" | Lane = published package on PR + push + dispatch, run from the repo's own exact devDep pin (`npx crashtest run` -- no network float). Bump = `npm run crashtest:bump <version>`: pin + harness run + ledger regen + stamp verification in one step; qc pins devDep == ledger stamp. |
| R4: RENDER_LANE=puppeteer (opt-in) | proves the bot render SUCCESS path (snapshot discipline) -- today every lane is browser-free by design | The only unproven proxy path; needs Chromium-in-CI cost sign-off + a deterministic cache namespace. |
| R5: prestruct-build pack | #25 analysis: the build-time surfaces (404 theme, JSON-LD emit, status opt-out) are unit-pinned but have no wire-level ledger; that is a separate pack, never more shapes in the proxy pack | Would need a scenario vocabulary decision on the crashtest side first. |
| R6: react 19 evaluation | zero advisories to react 18 -- priority LOW, churn HIGH | Battery + example render are the acceptance gate. |
| R7: platform-matrix majors on the board | vite 8 / vitest future majors stay battery-first; v6-pin retirement only when dual-major usage data says so | |

Carried P2/P3 ideas (unchanged from docs roadmap): image optimization
pipeline, file-level incremental invalidation, plugin system,
vercel/netlify host-file generation, theme packs.

---

## 7. Working rules that shipped with this rewrite

- Every row in Section 6 needs a TASKS.md pass entry when it moves.
- Engine changes stay in `engine/`, then `node scripts/sync-engine.mjs`;
  `engine-sync-check.yml` is the proof of execution.
- No new feature lands without the battery green and (if template-visible)
  the tarball e2e.
