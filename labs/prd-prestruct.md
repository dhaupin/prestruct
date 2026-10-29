# PRD: prestruct (build-time SEO prerender)

**Status:** v0.2 - current (2026-10-29) · Owner: dhaupin
**Role:** product - the pre-build SEO engine. It renders every route of a Vite plus React app to static SEO-HTML at build time.
**Package:** `prestruct` @ 1.2.0 (node >=20). npm latest is 1.1.0; 1.2.0 is committed and pending the tag.
**Core law:** config is the API. Build-time prerender only, no runtime SSR, no bloat.
**Family:** the five arms are **govstruct** (govern), **packstruct** (spec),
**crashtest** (attack), **eyestruct** (watch), **poststruct** (audit). The forges
are **monoforge** (the repo stamp) and **coreforge** (the site rig); **railyard**
is the composer. prestruct is a **product** governed by the suite: it is the
before-build leg of the SEO trio (prestruct before, freestruct after, poststruct
checks what shipped). The interop law: no host imports a sibling to check a
sibling; it invokes the sibling's public CLI.

---

## 1. One-line pitch

Prestruct renders every route of a Vite plus React app to static SEO-HTML at
build time. Validate your `ssr.config.js`, build, inject meta, prerender every
route to static HTML. No framework migration, no runtime SSR, no bloat.

## 2. The family trio

prestruct is one leg of the family's SEO contract:

| leg | when | what it does |
|---|---|---|
| **prestruct** | before the build | renders every route to static SEO-HTML, injects meta |
| **freestruct** | after any SSG | injects complete SEO metadata over the built tree |
| **poststruct** | after everything | audits what actually shipped; FAIL findings exit non-zero |

prestruct and freestruct are the writers; poststruct is the auditor. prestruct's
own example build ends in poststruct's audit (0 failures, 0 warnings), and
freestruct's audit runs green on the same output - the trio dogfoods itself.

## 3. The shipped surface (v1.2.0, verified against the engine at HEAD)

| surface | state |
|---|---|
| Engine (`engine/`, single source) | `prerender.js` (ssrLoadModule, incremental route cache, honest-lastmod sitemap plus assertXmlSafe, 404, robots), `inject-brand.js` (meta/OG/JSON-LD, deployId, worker bot-list sync), `audit.js` (the `prestruct audit` post-build verifier: FAIL/WARN rows, `--json`/`--external`/`--internal`), `validate-config.js` (structured diagnostics), `src/islands.js`, `src/hooks/usePageMeta.js` |
| Config keys | `siteUrl`, `siteName`, `routes[].meta/priority`, `ogImage` (string url OR `{ url, width, height, alt, type }` object form emitting the og:image companions), `robots` (`true` or `{ aeo: true, aiBots: 'block'\|'allow' }` per-vendor preset), `proxy` (`url`, `botList`, `targetUrl`), `deployId`/`deployIdFooter`, `fetchRoutes()` build-time hook, `platform` (cloudflare full; vercel/netlify validate-only stubs), `PRESTRUCT_STRICT=1` exit-code flag |
| npm package | live at 1.1.0 (Trusted-Publisher tag pipeline, provenance-attested); CLI `init/build/validate/clean/audit`; deep exports `prestruct/hooks`, `prestruct/islands`, `prestruct/engine/*`; `files` = bin/engine/init only (packs never ship) |
| Template (`init/`) | byte-identical to engine via `scripts/sync-engine.mjs`; scaffold imports are dual-major safe (`rrdNS.default ?? rrdNS` interop form); ships the proxy pair, `wrangler.toml`, pm2/systemd starters, self-testing zip battery |
| Platform state | vite 6.4.5 plus vitest 5.0.5 (battery 147/147, tinypool pinned via overrides), react-router dual-major (battery pins v6, example runs v7 live), Node engines >=20, react 18 |
| Example | 8 routes on rrd 7.18.4, rendered 8/8; build ends in the own audit (0 failures, 0 warnings); freestruct 1.1.0 audit also green |
| Adversarial QA | in-repo crashtest pack `packs/public/prestruct-proxy` v0.4.0 (5 shapes; cache-key variant parity), ledger 54/54 REFUSED at harness 1.1.0, CI lane = exact devDep pin, bump = `npm run crashtest:bump <v>` |
| Docs | Jekyll plus Pagefind site, 23 guides, truthfulness/fiction gates in CI |

## 4. The CLI surface

```
prestruct init       # scaffold config + template, never clobbers existing files
prestruct build      # validate, build, inject meta, prerender every route
prestruct validate   # structured config diagnostics, exit non-zero on fatal
prestruct clean      # remove generated output
prestruct audit      # the post-build verifier: FAIL/WARN rows, --json/--external/--internal
```

## 5. Decisions locked (do not revisit)

- `ssrLoadModule`, never `vite build --ssr`.
- AppLayout must never import BrowserRouter.
- Build-time prerender only (no streaming, no edge runtime, no per-request SSR).
- Islands are separate React roots, outside hydration.
- Proxy optional; disabled unless `config.proxy.url` is set; proxy files are
  per-project scaffold assets, never npm-imported.
- CF Pages pretty URLs are left alone (no redirect rules for prerendered paths).
- The 404 page is pure static HTML (`root-404`, no JS).
- Engines declare Node >=20; the battery pins react-router v6 for compile
  coverage, the example runs v7 (both majors stay supported).

## 6. Out of scope

- Runtime SSR, streaming SSR, edge rendering.
- CMS adapters (config hook only).
- Docs-site platform migration while Pagefind and gh-pages still work.
- Monorepo restructure of `docs/`.

## 7. Forward rows (in cost-benefit order)

| row | why now | notes |
|---|---|---|
| R1: tag v1.1.0 - SHIPPED | main carried consumer-facing bug fixes (#18 #19 #20 #21 #23), the AEO preset, the pack, and supply-chain hardening; all published on npm 1.1.0 | tag pipeline proven; npm scan-visibility caveat documented in CHANGELOG |
| R2: flip the example's robots to the AEO preset - SHIPPED (2026-10-26) | the docs' flagship feature was not demonstrated on the docs' own site | example runs `robots: { aeo: true }`; build verified 8/8 with the 6-allow / 5-block preset plus sitemap line |
| R3: decide the crashtest CI lane - SHIPPED | #24/#25 parked twice on "how does an external harness enter CI" | lane = published package on PR plus push plus dispatch, run from the repo's own exact devDep pin; bump = `npm run crashtest:bump <version>` |
| R4: `RENDER_LANE=puppeteer` (opt-in) | proves the bot render SUCCESS path - today every lane is browser-free by design | the only unproven proxy path; needs Chromium-in-CI cost sign-off plus a deterministic cache namespace |
| R5: prestruct-build pack | #25 analysis: the build-time surfaces (404 theme, JSON-LD emit, status opt-out) are unit-pinned but have no wire-level ledger | a separate pack, never more shapes in the proxy pack |
| R6: react 19 evaluation - LOW priority | zero advisories to react 18, churn HIGH | rides the same 1.3.0 matrix lane as vite 7/8, not a separate effort |
| R7: platform-matrix majors | the 1.2.0 ladder bounds the ceilings (react `>=18 <19`, router `>=6 <8`, vite `>=5 <7`); 1.3.0 = matrix lane proof (vite 7 then 8, react 19 interop) | ceilings move only on proof |

Carried P2/P3 ideas: image optimization pipeline, file-level incremental
invalidation, plugin system, vercel/netlify host-file generation, theme packs.

## 8. Non-goals

- **No runtime SSR of any kind.** Static output is the contract.
- **No framework migration.** Config is the API; the app stays a Vite plus React app.
- **No packs in the tarball.** `files` is bin/engine/init only.
- **No silent green.** `PRESTRUCT_STRICT=1` turns report-only classes fatal.

## 9. Working rules

- Every forward row needs a `TASKS.md` pass entry when it moves.
- Engine changes stay in `engine/`, then `node scripts/sync-engine.mjs`;
  `engine-sync-check.yml` is the proof of execution.
- No new feature lands without the battery green and, if template-visible, the
  tarball e2e.
- `package.json` is the single version source; the README line and the side
  package.jsons are held to it by a test, so a release cannot leave one behind.
