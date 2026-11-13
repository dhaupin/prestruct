# Changelog

Consumer-facing changes to the engine and template. Written for projects that cherry-picked `init/` files into their own repos. Read before updating.

Rule from [CONTENT.md](./CONTENT.md): commit history is the source. This file records only what cherry-pickers must act on.

Format: [Keep a Changelog](https://keepachangelog.com/) - sections head `## [version] - date` under a `## [Unreleased]` block. The heading is what `scripts/release-notes.cjs` extracts for the GitHub release body.

## [Unreleased]

## [1.5.1] - 2026-11-13

### 2026-11-13 - the pack rides the published tarball (poststruct#79)

`package.json` `files` listed `bin/`, `engine/`, `init/` (plus the `!init` negations) but not `packs/`, so `npm pack` shipped zero pack bytes and `npm i prestruct` (and a `github:` dependency, which honours `files` too) installed a tree with no `node_modules/prestruct/packs/`. The `prestruct-proxy` pack - five wire-level contracts for the bot-proxy pair (method matrix, hostile-path fuzz, bot-render 302 fallback, refresh-secret parity, cache-key variant parity) - was committed and linted yet undeliverable.

- `packs/` joins the `files` whitelist, so `npm i prestruct` delivers `node_modules/prestruct/packs/`. `tests/distribution.test.mjs` pins the contract (`files` carries `packs/`, every committed pack dir is delivered).
- The publish lane's verify job and `tests/release-verify.test.js` pass `--allowed "packs/"` (the family default forbids `packs/` in the served-tarball scan).
- The README's "the pack travels with the checkout, not the npm tarball" claim is retired; a cherry-picker can now point `crashtest.config.js` at `node_modules/prestruct/packs`.

## [1.5.0] - 2026-11-13

### 2026-11-13 - the ceiling proof lands: React 19 + Vite 8 (the #58 deferred matrix)

The 1.2.0 ladder bounded the peer ranges to the proven matrix and named the two unproven majors: vite 8 (the `ssrLoadModule` / ModuleRunner port) and react 19 (interop and the island surface). Both are graded now, on the example lane - the proof vehicle the roadmap fixed in advance: the example bakes **10/10 pages** under vite 8.3.7 + react 19.3.1 + react-router-dom 7 + @vitejs/plugin-react 6, audit clean (0 failures). The e2e scaffold leg (`tests/e2e-fixture.mjs`) runs the same matrix end to end.

- **Peer ceilings moved:** `react`/`react-dom` `>=18 <19` -> `>=18 <20`; `vite` `>=5 <8` -> `>=5 <9`. `react-router-dom >=6 <8` is unchanged (6 and 7 both still proven). React 18 and vite 5-7 remain supported and render.
- **The engine needed no source change.** `react-dom/server`'s `renderToString` and the `StaticRouter` seam both hold on React 19; `createServer` / `ssrLoadModule` still resolve on vite 8. The one consumer-side break is vite 8's rolldown build options, not the prerender: `manualChunks` must be a FUNCTION (the object form is removed) and `minify: 'esbuild'` fails (esbuild is unbundled; oxc is the default). The example's own `vite.config.js` carries the function form, and the guide snippets now show it.
- **The example lane and the template battery move to the new matrix** (vite ^8.3.7, react/react-dom ^19.3.1, @vitejs/plugin-react ^6.3.0). Adopters move on their own schedule.
- **Node floor:** `>=20` -> `>=20.19` (vite 8's engine floor, `^20.19.0 || >=22.12.0`). Cherry-pickers on vite 8 need it; vite 5-7 still run on older Node 20.

## [1.4.0] - 2026-11-12

### 2026-11-12 - the Dependabot flow lands (railyard#31)

`.github/dependabot.yml` now carries the family flow: a weekly (Monday) pass, grouped minor/patch updates in one pull request, majors alone, and the `github-actions` ecosystem so the SHA-pinned refs move without a hand-edit. npm directories `/`, `/example`, `/init`. The config header names the family caveat - a tool whose output is committed as canon can have a "minor" release that changes the canon (the eyestruct 1.1.0 overlay case), so a bump arrives as a pull request that runs CI. The shape is proved and guarded on the parent (`dhaupin/creadev` PR #38; `dhaupin/railyard#31`). No version bump.

### 2026-11-12 - the staging fast-forward sync (family plumbing)

`staging` is a permanent mirror of `main`, so a merge-commit promotion drifts the two by one every time. This repo carried no sync job, so each promotion needed a manual fast-forward. `.github/workflows/staging-ff-sync.yml` now closes that gap: on every push to `main` it runs `git push origin origin/main:refs/heads/staging` - a fast-forward-only refspec, never a merge, never a force-push, and it fails loudly if `staging` ever moves ahead of `main`. The same canon ships in every family repo (and the coreforge site template). No version bump.

### 2026-11-10 - light mode by default (web + docs)

Owner directive: the family defaults to light. The product sites and docs sites shipped dark-first (a persisted `light` was the opt-in); now light is the first paint and a persisted `dark` theme is the opt-in. Shape: `<html>` pins `data-theme="light"`, the pre-paint bootstrap applies only a persisted `dark`, and the `theme-color` meta flips to the light paper. The CSS token blocks are untouched (the light block is already the second half of one set), so no palette, toggle handler, or gate changed.

- `example/index.html` - `<html data-theme="light">`; bootstrap applies only a persisted `dark`; `theme-color` light (`#f8f8f6`).
- `example/src/components/ThemeToggle.jsx` - default theme `light` (was `dark`).
- `docs/_layouts/default.html` - `<html data-theme="light">`; bootstrap inverted; `color-scheme` `light dark`.
- `example/public/site.webmanifest` - PWA `theme_color`/`background_color` -> light (`#f8f8f6`).
- Receipts: `npm run gate` 389/389; docs-lint clean; `npm run sync:check` PASS.

### Added

- **Engine-level auto breadcrumbs (`breadcrumb: true`).** The engine can now emit a schema.org `BreadcrumbList` per route, built from the route's own path at injection time - the one thing `buildJsonLd()` structurally cannot do (it is called site-wide, with no route argument, which is why the structured-data guide used to tell hosts to hand-roll the trail in a prerender extension). Set `breadcrumb: true` and each non-home route ships site-root -> segments -> the page's own title; the home route ships none (a one-item trail is not a breadcrumb), and a route already carrying its own `BreadcrumbList` in `route.jsonLd` is left alone (missing-only). This is the prestruct counterpart to freestruct's `breadcrumb: true`, so the family's two engines now speak the same discovery dialect. The flag and `siteName` ride `buildHeadExtras`, so flipping it on between builds re-renders instead of riding a valid-cache hit (the QC-sweep class). Battery-pinned both ways: emission, the home-route skip, the exactly-true gate, the missing-only suppression, coexistence with a non-breadcrumb route node, the trailing-slash `siteUrl`, and the cache-signature change.

### Changed

- **The family prestruct floor moves to `^1.3.0`.** `scripts/check-prestruct-pins.cjs` now refuses any declaration below 1.3.0, because 1.3.0 is the security round: the opt-in external audit lane gained the SSRF guard (private-host refusal before any socket, re-checked on every redirect hop). Every consumer declaration moved with the floor, and every web lockfile re-resolved to 1.3.0. The guard's own battery gains the inverse case - the old `^1.2.0` floor now fails - so the move is pinned both ways.
- **Family devDependency pins advance to the current cuts.** `crashtest` `1.2.0 -> 1.3.0` (via `scripts/crashtest-bump.mjs`, which regenerated `labs/crashledger.json` + `labs/hardening.md` + `labs/run-meta.json`; the verdict set is unchanged - 0 new, 0 regressed), `freestruct` `^1.2.0 -> ^1.3.0`, and `packstruct` `1.0.0 -> 1.1.0`. The docs-lane caller SHA moves to freestruct v1.3.0 (`7dfb172`) and its `crashtest-ref` moves to the crashtest v1.3.0 commit (`8738287`), so the lane's dogfood leg matches the committed ledger.

### Fixed

- **The `.gitignore` docs block carries the in-tree Jekyll + pagefind products (2026-11-10 sweep, coreforge#48).** Propagated from the coreforge adopter sweep (dhaupin/coreforge#52): a local `bundle exec jekyll build` + pagefind run drops its products beside the source, and the belt-and-suspenders block named only some of them. It now carries `docs/.jekyll-cache/`, `docs/.jekyll-metadata`, `docs/pagefind/`, and `docs/pagefind*`, so a local build leaves no untracked noise. No version bump.

## [1.3.0] - 2026-11-06

The security round since v1.2.0. The opt-in external audit lane - the pass that fetches the URLs a baked tree names - learned to refuse a private host before any socket and to re-check the host on every redirect hop, closing the SSRF primitive in the engine's only outbound path. The family's docs lane folded into a single reusable workflow and this repo became a thin caller of it. Every fix is battery-pinned.

### The docs-lane consolidation (2026-11-04)

The family built docs from four topologies; the two reusable lanes had drifted (ruby 3.2 vs 3.4, pagefind `latest` scrape vs npm pin). The docs lane is now ONE canonical reusable workflow in `dhaupin/freestruct`, and this repo is a thin caller of it.

- `.github/workflows/docs.yml` calls `dhaupin/freestruct/.github/workflows/docs-lane.yml@22bb7e9b2634d6cdd966963d9e25c7f892577276`, keeping only the trigger, permissions, concurrency, and this repo pins.
- Already a caller (the model the rest followed); the lane SHA is re-pinned to `22bb7e9b` to ride the superset lane. `freestruct-cmd` and `crashtest-ref` are unchanged.
- **`docs/freestruct.config.yml`: `linkCheck` re-enabled** (the suspend note named its own lift condition - "flip back when #32 ships in a pinned release" - and it has: the lane pins freestruct 1.2.0, whose checker strips `basePath` before resolving root-absolute hrefs). PROVEN against a real Jekyll build: the 1.2.0 engine reports 0 broken (37 pages). `devDependencies.freestruct` moved `^1.1.0` -> `^1.2.0` so the local gate runs the same engine the lane installs.
- No version bump; a workflow consolidation, not a released surface.

### Changed

- **The rename (govstruct PRD 16.5): `flowforge` -> `coreforge`.** Living references to the rig this repo carries now name `coreforge` (comments and docs); the rig itself is renamed, not forked, so nothing behavioral moves. Frozen receipts keep saying `flowforge` (citations like `flowforge#N`, `labs/`, and the rig extraction SHAs in `MANIFEST.md`), because that is what happened.

### Security

- **`audit --external` refuses private hosts before any socket (SSRF guard).** The opt-in external pass fetches the URLs a baked tree names, and a baked tree can be attacker-influenced (a CMS field, a scraped page, a dependency's demo HTML), so the pass was a server-side request forgery primitive: a link to `http://169.254.169.254/...` (cloud metadata), `http://127.0.0.1:<port>/` (a co-located service), or an internal `http://10.0.0.5/` made the run probe a host the tree's author cannot reach directly and report the status in the findings. `engine/scripts/audit.js` now classifies each URL's host **literal** (the family shape poststruct's external lane carries) and refuses a private, loopback, link-local, unique-local, or otherwise non-public address before any probe - a network-free, deterministic call. The classifier covers every spelling a parser accepts (dotted quad, bare integer, octal, hex, short forms, IPv6, the IPv4-mapped/translated/compatible/NAT64/6to4 v6 carriers the URL parser rewrites to hex, and the explicit-root trailing dot), plus the reserved names `localhost`/`*.local`. A refused URL is a WARN finding (`refused: ... SSRF guard`), never a silent skip, and it does not count as `checked`; the summary line and the returned `blocked` count name it. A public name that DNS-rebinds to a private address is a separate class (TOCTOU at resolution time) a literal check cannot see - noted, not claimed. `tests/audit.test.js` gains a no-socket refusal leg (regenerated into `init/` + `example/` via the engine sync).

- **`audit --external` re-checks the host on EVERY redirect hop (redirect SSRF guard).** The literal guard above checks the URL the pass is handed - not where the server points it. `headCheck` used `redirect: 'follow'`, so a public URL could answer `302 Location: http://169.254.169.254/latest/meta-data/` and the runtime would open the socket to the metadata IP before the guard ever saw the target, then report the status in the findings - the same SSRF primitive, reached one hop later. `headCheck` now follows redirects MANUALLY (`redirect: 'manual'`), resolving each `Location` against the current hop and re-running `isPrivateHostLiteral` on every hop's host; a hop that lands on a private host is a WARN finding naming the refusal, a public->public redirect still resolves to its final answer, and `MAX_REDIRECTS` (5) bounds the chain. `headCheck` is exported so the battery drives it against a real loopback redirect server (`tests/audit.test.js`, regenerated into `init/` + `example/`): a 302 to the metadata IP refuses by name; a relative `Location` resolves against the hop and is then guarded.

- **Pins, never floats (packstruct#69).** Every GitHub Action `uses:` in `.github/workflows/` names a 40-hex commit SHA (tag kept in the trailing comment), never a floating `@v4`/`@v1`. A new guard, `scripts/check-action-pins.cjs`, refuses any floating ref, a branch, or a `docker://` image; it runs as `npm run lint:pins` inside `npm run gate` (the `prepublishOnly` loop) and CI, and its own battery (`tests/check-action-pins.test.js`) proves it bites both ways.

### Fixed

- **The release ladder no longer parses `npm pack --dry-run --json`.** The phone's npm answers that probe with empty stdout (a config warning, no JSON) even under `--loglevel=error`, so the ladder's `JSON.parse` failed and read as a capability failure - exit 2 - on a clean tree. The ladder now derives the expected set from a REAL `npm pack` of the checkout, listed by the same `tarList` the served tarball already goes through.

- **The staged publish `.npmrc` no longer writes the deprecated `always-auth` line.** npm >=9 warns `Unknown project config "always-auth"` on it, and that warning reaches the child processes the `prepublishOnly` gate spawns. The staged file is now exactly one line (the `${NPM_TOKEN}` expansion).

### Changed

- **Changelog + release-notes standardized to the family shape.** `CHANGELOG.md` is now Keep-a-Changelog end to end (a `## [Unreleased]` block over `## [version] - date` sections) and `scripts/release-notes.cjs` is the family's single superset extractor: it reads the KAC heading, still reads the older bare (`## 1.2.0`) and v-prefixed (`## v1.2.0`) forms, closes the version token so `## [1.2.0]` never matches a `## [1.2.0-rc.1]`, and refuses a version with no section by name. One extractor across the family means one release-body shape everywhere.

### Fixed

- **The release ladder no longer races registry propagation, nor false-flags a branch-name `target_commitish`** - both surfaced by the crashtest 1.2.0 live cut. `scripts/verify-release.cjs` polls `dist-tags.latest` **and** the version entry through npm's post-publish propagation window instead of reading once, and the `release` job retries `npm pack prestruct@<ver>` the same way. The release check now accepts GitHub's `target_commitish` default-branch name and treats only a 40-hex SHA as a commit claim. This copy also gains the family `--allowed` flag (prefix-scoped forbidden-scan exemptions), pinned by a test.

### Fixed

- **The release ladder's `verify` job no longer races `release`.** `verify` now declares `needs: [publish, release]`, so it waits for the GH release object and its attached tarball before judging them. A bare `needs: publish` ran `verify` CONCURRENTLY with `release`: on a fresh cut the registry read replicas had not settled and the asset was not yet attached, so a publish that in fact succeeded failed red and needed a manual re-run (the packstruct 1.1.0 first cut). `verify` still stands alone in verify-only mode (`publish` and `release` both skipped). The propagation poll budgets also widened: the release-attach poll 120s -> 300s, and the registry poll in `scripts/verify-release.cjs` 120s -> 360s. `tests/qc.test.mjs` pins the dependency so a regression fails by name.

## [1.2.0] - 2026-11-01

### Family ride-along: the issue-walk set ports into the engine

A batch of engine surfaces ported from the sibling structs, each with its own battery. Every one is config-gated: a host that sets nothing renders the same HTML as before.

- **`prestruct indexnow` verb + `scripts/indexnow.js` (#36).** A 32-hex key (config `indexNow` or generate-once persistence), `<key>.txt` emitted into `dist/`, and a POST of the BAKED sitemap URLs to `api.indexnow.org`. `--dry-run` prints the request body without touching the network. Submission only counts once the output is deployed (keyLocation must resolve).
- **`hooks.postBuild` (#41).** The build pipeline now owns the hook chain, so a direct engine/CI run can no longer skip it the way the old npm-script chain could. `runHooks: true` is the opt-in gate (nothing executes without it); `PRESTRUCT_SITE_URL` / `PRESTRUCT_OUTPUT_DIR` are in the child env, and `${SITE_URL}` / `${OUTPUT_DIR}` placeholders substitute via function replacers. A nonzero hook exit fails the build.
- **Config-driven JSON-LD defaults (#30).** Organization + WebSite nodes from `siteName`/`siteUrl`/`author` when a host defines no `buildJsonLd`; `jsonLdDefaults: false` opts out.
- **Per-route `jsonLd` (#35).** Route-scoped schema nodes ship on their own page (`@graph`-wrapped when multiple), rebuild-idempotent.
- **Head discovery set (#49).** Feed autodiscovery (`feed`), hreflang alternates with per-route takeover (`alternates`), search-console verification metas (`verification`), a home-only `SearchAction` from `searchUrl`, and generated-only `llms.txt` with an `llms: false` opt-out.
- **`ogImageGeneration` (#43).** 1200x630 SVG templates render into `dist/og/` per route through the optional `@resvg/resvg-js` rasterizer (skipped loudly when absent), pre-loop so cached routes never point at a missing file.
- **RRD-7 named-import interop (#29).** A pre-transform rewrites a host layout's `import { useLocation } from 'react-router-dom'` into the dual-major namespace form before Vite links the externalized CJS graph -- the failure class that surfaced again as #68 (below).
- **The 404 head rides `injectMeta` (#42).** Title/description/og/twitter on `404.html` now flow through the same single-line, class-excluding pipeline as every page; only the genuinely-404 contracts remain (home-pointing canonical, noindex, zero-JS strip).
- **Config dialect table (#39).** The documented prestruct<->freestruct shared config mapping lives in the config guide.

### Fix: react-router 7 prerender seam (#68)

- On react-router-dom 7 (real ESM) the engine's `StaticRouter` and the host app's router could load as two module instances, each with its own React contexts. Every route then failed with `useLocation() may be used only in the context of a <Router> component` (and, when a host set `ssr.noExternal`, with a `module is not defined` / `Named export not found` Vite error before that). The engine now loads `StaticRouter` through the same Vite SSR registry as the app and redirects an inlined react-router CJS entry to its ESM twin, so both majors render with or without `ssr.noExternal`. If you cherry-picked the `rrdom-esm-redirect.mjs` shim and the `ssr.noExternal` lines from an earlier release, remove them; `prestruct build` should now end `Done. n/n pages rendered` without them.

### Peers: bounded to the proven matrix (#58)

- peerDependencies now carry ceilings: `react >=18 <19`, `react-dom >=18 <19`, `react-router-dom >=6 <8`, `vite >=5 <8`. A range with no ceiling reads as a promise nobody graded: unbounded `>=5` would install vite 8.x or react 19.x beside the prerender engine, and no such tree was ever graded here; an ERESOLVE at install is the honest failure. `ssrLoadModule` (the verb the whole engine runs on) is on Vite's deprecation path, so the ceiling matters most for vite. Vite 7 is now part of the proof: the example bake under **vite 7.3.7** rendered 8/8 pages whose HTML is identical to the vite 6.4.5 bake except the content-hash asset names and the `deploy-id` stamp (scratch clone, not a git tree), audit 0 failures / 0 warnings, no deprecation noise. The example lane moved to `vite ^7.3.7` (the router 7 shape: example on the new major, init battery pinned on 6); the remaining 1.3.0 lanes are vite 8 and react 19 -- ceilings move again only on proof.

### New: `prestruct audit` (the built-in post-build verifier)

- New CLI verb + engine module (`scripts/audit.js`, ported/remapped from the freestruct audit): reads the baked `dist/` without touching it and grades it. FAIL rows (exit 1): missing title/description, non-absolute canonical, duplicate head tags, missing og/twitter core tags, SVG og:image, unparseable JSON-LD, 404 without noindex, missing/empty sitemap, and pointer-less robots.txt (graded only when `config.robots` is set -- the author-owned copy is never engine-graded). WARN rows never fail: length bands, extended og/twitter set, og:image companions/disk ranges, h1 and JSON-LD hygiene. Flags: `--json`, `--external` (HEAD-checks external hrefs, warn-grade), `--internal` (unresolved internal hrefs, warn-grade). The scaffolded `init/` and example builds now END in the audit, so a regression fails the build. Action for cherry-pickers: drop in `scripts/audit.js`, add `&& node scripts/audit.js` to your build script.

### Honest sitemap lastmod + XML loud-fail

- `generateSitemap()` wrote a universal build-time `<lastmod>` on every route, so freshness signals churned even when one page changed. Now per route: the dist file's own mtime, preserved across identical rebuilds (byte-identical writes are skipped entirely). Same adoption: sitemap values pass through `assertXmlSafe` -- a control character now fails the build loudly instead of shipping a corrupt sitemap that reads green. Action: update `init/scripts/prerender.js` (drop-in) -- no config change.

### generate404() head tags no longer ship literal `$1`/`$2` (#33)

- The 404 page's og:title, twitter:title, description and canonical tags were built with function replacers whose returned strings contained `$1`/`$2` -- but a function replacer's return value is used LITERALLY, so `dist/404.html` shipped `$1Page Not Found | Site$2`-shaped garbage and lost all four tags. Values now rebuild from the capture groups. Action for cherry-pickers: update `init/scripts/prerender.js` (or describe: drop-in).

### Trailing-slash `siteUrl` no longer doubles the canonical (#53)

- `siteUrl: 'https://x.example.com/'` produced canonical/og:url of `https://x.example.com//` on every page (inject-brand) and inside sitemap locs + prerendered metas. The trailing slash is now stripped at every URL seam: inject-brand canonical/og block, prerender injectMeta, sitemap, 404 canonical, and the usePageMeta base. No config change needed; a trailing-slash siteUrl is simply correct now.

### Home canonical is the bare origin on every surface (#76)

- The 404 page was the one surface that emitted a trailing-slash home canonical (`https://x.example.com/`) while `index.html`, `og:url`, the sitemap home loc, and `usePageMeta` all emitted the bare origin (`https://x.example.com`). The 404's own override is gone -- it now rides `injectMeta('/', ...)` like every other page -- and `inject-brand`'s global canonical/og:url use the bare origin too, so all home writers agree. This matches the documented contract (the canonical guide's "Root is the bare site origin (no trailing slash)") and the form the live URL normalizes to. Action for cherry-pickers: update `init/scripts/prerender.js` and `init/scripts/inject-brand.js` (drop-in) -- no config change.

### CLI refuses unknown dash-word flags (#54)

- `prestruct build --Force` (or any misspelled flag) was silently ignored: typo'd flags now fail with `unknown flag(s): ... - run prestruct help`, exit 1, naming what the command actually takes. `--help` works on every subcommand.

### Loud config diagnostics for unknown keys (#52)

- A misspelled config key (`ogimg:` instead of `ogImage:`) passed build validation while silently dropping the SEO surface it drove. Unknown keys now print `[prestruct] config warning: unknown config key "x" (typo? see the config reference)` during build/validate. Warnings are diagnostics, not gates: they never fail the build.

### Proxy pair hardening (template scripts -- cherry-pick the pair)

- `init/scripts/proxy.js` eviction no longer deletes files that are not the proxy's: it touched only `64-hex .html` cache shapes; under the documented `PRESTRUCT_CACHE_DIR` override an operator's mounted non-proxy files could be evicted. The size cap is env-tunable (`PRESTRUCT_CACHE_MAX_MB`, default 500) and the cleanup log reports what it actually removed.
- `init/scripts/proxy.worker.js` guards KV's 512-byte key cap: a long query string used to reject the KV put/get AFTER a successful render (a post-render 500). Normal URLs keep the byte-identical legacy key (existing cache entries stay valid); only oversized keys fall back to the collident-proof `prestruct:sha256:<hex>` shape. The in-repo crashtest pack (v0.4.0) seeds an oversized variant under BOTH shapes with an opposed marker: a proxy that still consults the oversized legacy key is poisoned and fails loudly.

### Audit walk: escaping, proxy parity, and CLI audit gate

A full bug/gap/fiction walk over the engine, CLI, template, and proxy pair (`main` @ 498ab5f). Every fix below is cherry-pickable on its own.

- **`$$` no longer leaks into the grouped head additions (B2).** The feed, hreflang, and verification metas append through a FUNCTION replacer, which does not process `$`-syntax -- so the `$$` doubling used for the string-replacer metas shipped literally (`feed.url = '.../feed$1.xml'` became `.../feed$$1.xml`). Those values are now `escapeHtml`-only. Cherry-pick: `init/scripts/prerender.js` (`injectMeta` tail).
- **`generate404` escapes `siteName` once (B3).** It was pre-escaped and then escaped again inside `injectMeta`, so `siteName: "Tom & Jerry's"` shipped `Tom &amp;amp; Jerry&amp;apos;s` in the 404 title. Same class: the 404's home canonical `$`-doubled the siteUrl. Both fixed. Cherry-pick: `init/scripts/prerender.js` (`generate404`).
- **Per-route `ogImage` object carries its companions (B4).** A route that overrode `og:image` with a `{ url, width, height, alt, type }` object kept the site-wide `og:image:width/height/alt` (now describing a different raster), and a route-only object image was dropped when no global image existed. The route's companions now replace the globals (and a route that defines none strips the stale ones). Cherry-pick: `init/scripts/prerender.js`.
- **Worker single-flight actually dedupes + gains a concurrency limiter (B1, B7).** The Worker's flight entry was written AFTER the render, so a same-isolate burst never joined it -- the `FLIGHT` branch was dead code and every miss launched its own Browser Rendering session. The flight map is now written before the render is awaited (parity with the VPS `renderOnce`) and the Worker gains the VPS `MAX_CONCURRENT`/`withRenderLimit` limiter. Cherry-pick: `init/scripts/proxy.worker.js`.
- **`prestruct build` runs the audit (G1).** The docs promised the pipeline ended in the audit, but only the npm-script chain did; the CLI path had no audit call, so CLI users got no gate. `prestruct build` now ends in the audit (FAIL-class findings fail the build; warnings never do). Cherry-pick: `bin/cli.mjs`.
- **Prerender telemetry reports real cache hits (B5).** `result.cached` was `total - succeeded`, counting failed routes as cached; it now counts actual cache hits (matching `status.json`).
- **`replaceRootDiv` tolerates attribute reflow (B6).** The root-div matcher required the exact bytes `<div id="root">`; single quotes, spaces around `=`, or a leading attribute (prettier/minifier reflow) failed the build hard. The matcher is now attribute-tolerant.
- **RRD named-import rewrite handles default+named (E1).** `import rrd, { x } from 'react-router-dom'` was left untouched by the rewrite (the regex required `{` immediately) and would still die at link time on v7 CJS.
- **Proxy target URL is origin-checked (E2).** Both runtimes now require the resolved target origin to equal the configured one, so the SSRF guard no longer hinges on Node's HTTP parser rejecting `@`-prefixed request targets.
- **Docs + config truth (G2, G4, G5, F1).** The CLI guide lists `indexnow` among the verbs and the real build pipeline; the root `eslint.config.js` was syntactically invalid (`export [` + a phantom `eslint-plugin-js` import) and is now valid and dependency-free; `init/package-lock.json` peer ranges match `init/package.json`; the Worker header no longer claims a non-existent `x-forwarded-host` default for `targetUrl`.

### Stability walk: root-div corruption, 404 noindex gap, audit false-FAILs

A second bug/gap walk over the engine and audit (`staging` @ 6f1a231). Every fix is cherry-pickable on its own.

- **`replaceRootDiv` no longer corrupts a reflowed shell (B6 follow-up).** The matcher became attribute-tolerant, but the open-tag rebuild still sliced attributes at the fixed `<div id="root"`.length offset -- so a prettier/minifier-reflowed shell (`class` before `id`, `id = "root"`, single quotes) shipped corrupt markup: a duplicated `id`, a half-attribute fragment, or dropped attributes. The open tag is now preserved verbatim with only the `data-server-rendered` stamp swapped. Cherry-pick: `init/scripts/prerender.js` (`replaceRootDiv`).
- **404 noindex no longer rides an optional tag.** The noindex meta was inserted by replacing `<meta name="author">`, so a shell without that tag (author not configured) produced a 404 with NO noindex -- silently indexable. It now anchors on `</head>`. Cherry-pick: `init/scripts/prerender.js` (`generate404`).
- **`prestruct audit` tolerates reflowed head tags.** `grabMeta` matched exactly one character before the key attribute (`<meta[^>]property=`), so a hand-formatted head (`<meta  property=`, or an attribute ahead of the key) graded as a MISSING tag -- a false FAIL that fails a valid build. Extraction is now attribute-order and whitespace tolerant. Cherry-pick: `init/scripts/audit.js`.
- **`injectBrand` is library-safe again.** It called `process.exit(0)` when `dist/index.html` was missing despite its "never exits" contract; because the CLI calls it in-process, a missing shell killed the build green. It now returns `null`, and the direct-run wrapper owns the exit. Cherry-pick: `init/scripts/inject-brand.js`.
- **og-image slug collisions warn.** Two routes whose paths flatten to one slug (`/blog/post-1` and `/blog-post-1` -> `blog-post-1.png`) silently shared one generated PNG; the build now warns.

### Stability walk 4: inject-brand idempotence, per-route OG image cache

A fifth bug/gap walk over the injection seam, the incremental cache, and the CLI. Every fix is cherry-pickable on its own.

- **`injectBrand` no longer eats the body on a second inject (idempotence).** The OG/JSON-LD strip regex lazily matched the injected block's own closing `<script>`. When inject-brand emitted NO JSON-LD (`buildJsonLd` returned nothing, or `jsonLdDefaults: false`) there was no engine `<script>` to stop at, so the match ran past `</head>` into `<body>` and deleted the root div and the app entry `<script>` — a rebuild shipped a headless, scriptless shell, contradicting the documented "running the build twice is safe." The strip is now bounded at `</head>`. Cherry-pick: `init/scripts/inject-brand.js`.
- **`ogImageGeneration` participates in the incremental cache signature.** Enabling or retargeting per-route OG generation rewrites every route's `og:image`/`twitter:image` to the generated PNG — a rendered input — but it was absent from the cache signature. A build that turned generation on rode a valid-cache hit and shipped the OLD head while the generated PNGs sat unreferenced (the same class the earlier QC sweep fixed for feed/alternates/verification/searchUrl). The signature now carries a stable `ogImageGeneration` descriptor (template path, dimensions, font presence). Cherry-pick: `init/scripts/prerender.js` (`buildHeadExtras`).

### Stability walk 3: double JSON digest, silent IndexNow drop, config-key fiction

A fourth bug/gap/fiction walk over the CLI, audit runner, config validation, and the shipped proxy starters. Every fix is cherry-pickable on its own.

- **`audit --json` emits ONE digest, not two.** `auditOutput` printed its own JSON digest AND the caller (both `bin/cli.mjs` and the direct `scripts/audit.js` runner) printed its combined copy, so a plain `audit --json` wrote two concatenated JSON objects to stdout. The docs promise "one digest line for CI harvesting"; `jq` and any JSON parser choke on the concatenation. Both callers now capture and own the single line. Cherry-pick: `bin/cli.mjs`, `init/scripts/audit.js`.
- **A bad `indexNow` key is a loud config error, not a silent feature drop.** `resolveIndexNowKey` returns null on a non-32-hex key with the comment "config diagnostics already warned" -- but `validateConfig` never checked `indexNow`, so a mistyped key (or a placeholder) disabled IndexNow with no diagnostic anywhere. `validateConfig` now rejects anything that is not `true`/`false`/a 32-char lowercase-hex string/`{ key }`. The example's placeholder was also neither 32 chars nor hex; it now shows the real shape. Cherry-pick: `init/scripts/validate-config.js`, `init/ssr.config.example.js`.
- **`ecosystem.cjs` no longer points at a config key that does not exist.** Its header said `export PRESTRUCT_SECRET=... # must match config.proxy.secret`; the secret has always been env-only (a config `proxy.secret` is never read). Corrected to name the env var the proxy actually reads. Cherry-pick: `init/ecosystem.cjs`.

### Stability walk 2: port parsing, audit path confinement, footer-attribute reflow

A third bug/gap walk over the CLI, proxy pair, audit, and inject seam. Each fix is cherry-pickable on its own.

- **`normalizePort` rejects a valid-prefix PORT value (proxy).** `parseInt("8080abc")` silently yields `8080`, so a junk `PORT` with a numeric prefix passed the range check and the server bound an unintended port with no warning -- the exact class the guard exists to catch. `Number()` rejects it, the fallback is loud. Cherry-pick: `init/scripts/proxy.js`.
- **Audit disk-probe is confined to the output root.** `urlToDisk` path-joined a head-referenced URL straight onto `dist/`, so an og:image/JSON-LD value with `../` segments (`/../../../etc/passwd`) made the exists-on-disk probe read arbitrary host paths outside the tree. Every resolved path is now required to stay under the output root. Cherry-pick: `init/scripts/audit.js`.
- **The opt-in footer attribute survives a reflowed shell.** `deployIdFooter: true` inserted `data-deploy-id-footer` with a byte-exact `/<div id="root"/`, so a prettier/minifier-reflowed root div (single quotes, spaces around `=`, or an attribute before the id) silently dropped the attribute the config asked for. Now the same attribute-tolerant span the rest of the engine uses. Cherry-pick: `init/scripts/inject-brand.js`.
- **Doc truth:** the deploy-id table claimed the meta content is `<short-hash>-<ts>`; the timestamp was removed (per-commit, not per-build, so the incremental cache survives), so it is the bare git short hash.

### Packs conformance + pinned surfaces

- `npm run lint:packs` runs `packstruct lint packs/ --deep` -- the shared `/packs` spec linter (crashtest#16 class: manifest declares an entry that does not ship). The crashtest CI lane runs the repo's own exact `crashtest` devDependency pin and never a floating `@1` fetch; harness upgrades are one command: `npm run crashtest:bump <version>` (pin install + harness run + ledger regen + pin/stamp verification).

### Docs audit: one runner, one gate set (#75, #77)

- The docs audit converges on freestruct's consolidated runner shape. `scripts/lib/docs-audit.cjs` is a vendored byte copy of freestruct's (node builtins only -- no cross-repo import, no package dependency in either direction); prestruct's caller `scripts/run-docs-audit.cjs` owns its seven gates -- `frontmatter`, `links`, `nav`, `style`, `language`, `truthfulness`, `jekyll` -- plus its voice and exit code. `lint:docs` is one command now (was a five-script `&&` chain), a single gate runs alone (`node scripts/run-docs-audit.cjs truthfulness`), and the four superseded `check-docs-*.cjs` scripts are retired (`check-language.cjs` stays -- the language gate shells to it). The `jekyll` gate (#77) catches the three build-time Liquid classes the earlier chain never saw: a two-argument call to a single-argument string filter, an unknown `{% tag %}`, and an unbalanced `{% raw %}`. Action for cherry-pickers: nothing -- `scripts/` is not part of the shipped tarball.

### Version truth: package.json is the single version source (#70)

- A census leg (`tests/census.test.mjs`) derives the current version from the root `package.json` and refuses every living surface that drifted from it: the side package.jsons (`init/`, `example/`), `init/VERSION`, the committed lockfiles, and the README status line. Dated era rows (changelog sections, the `announcing-v1.1.0` discussion) and range pins (`^1.0.0`) stay lawful by design. A release is now: move `package.json` + the changelog, and CI names any surface you forgot.

### Engine and proxy hardening (walk pass)

- **Proxy pair, both runtimes.** VPS cache eviction now touches only the proxy's own cache-shaped files (an operator's mounted files survive under a shared `PRESTRUCT_CACHE_DIR`; the cap is env-tunable, `PRESTRUCT_CACHE_MAX_MB`, default 500, and the cleanup log reports what it actually removed). The Worker guards KV's 512-byte key cap: a long query string used to reject the put/get AFTER a successful render (a post-render 500); normal URLs keep the byte-identical legacy key, and only oversized keys fall back to `prestruct:sha256:<hex>`.
- **`mergeRoutes` junk tolerance + 404 CTA scheme guard.** A malformed `fetchRoutes()` row no longer crashes the merge, and a `javascript:`/`data:` CTA href on the 404 page falls back to `/` (the one page whose contract is zero JS).
- **`prestruct build` passes `--force`/`--clean` through to the engine.** The engine accepted both but the CLI dropped them, so `--force` silently served cached HTML and `--clean` was a no-op.
- **Prerender failures fail the build.** A route that errored during render used to exit 0 with a green summary; the CLI now exits 1 when any route failed. `status.json` build telemetry moved out of `dist/` (a deployed URL) into project-root `.prestruct/status.json`.

### `npm run gate` -- one pre-push loop over every CI lane

- A single command runs sync check, pack lint, docs lint, claims scan, the init eslint lane, and the test battery. Added after an init-tree `prefer-const` error rode CI-only for six commits while every hand-run lane stayed green.

### One release lane: `publish.yml` (the starter zip is retired)

- A version tag now drives one workflow. `release.yml` is gone: it minted a second GitHub release on the same tag (a race against `publish.yml`'s own `release` job) and built a starter zip from `init/`. The tag publishes npm and cuts the GitHub release from the same tag, its notes extracted from this changelog -- the family shape. There is no release archive to download; `npx prestruct init` scaffolds the template, and the npm tarball is the payload. Action for cherry-pickers: none -- the package contents are unchanged.

### CI: the staging integration branch

- `staging` is the permanent integration branch; `main` is the promotion target. CI now runs on both: `test.yml`, `engine-sync-check.yml`, and `crashtest.yml` verify a `staging` push, and `docs.yml` builds the docs on both branches. The docs deploy is gated to `main`, so a `staging` push can never publish unreleased docs to production. Repo-infrastructure only -- no package change.

### CI: the docs lane is a thin caller of the reusable runbook

- `docs.yml` no longer hand-carries the Jekyll -> freestruct -> pagefind -> Pages runbook. It calls freestruct's canonical reusable lane (`dhaupin/freestruct/.github/workflows/docs-lane.yml`, promoted for `dhaupin/freestruct#31`), pinned to a freestruct SHA, overriding `freestruct-cmd` (prestruct consumes freestruct as an npm devDep) and `crashtest-ref`. The deploy-to-main guard lives inside the lane, so every caller inherits it. Repo-infrastructure only -- no package change.

### One example target: generated from `engine/`, not synced on release

- The `sync-example.yml` release workflow is retired. The example site is generated from `engine/` by `node scripts/sync-engine.mjs`, exactly like `init/`, and CI enforces byte-identity -- so nothing needed post-release syncing. The old workflow was also stale: it copied `init/src/AppIslands.jsx` (the template skeleton) over the example's real island registry. `engine/ssr.config.example.js` is now a generator contract file (its `example/` copy had drifted), and `engine-sync-check.yml` runs the generator's own check so the file list lives in one place. Repo-infrastructure only -- the shipped `init/` template is unchanged.

### Release lane: the gate's init-lint leg needed init's deps

- `publish.yml`'s Install step ran a root-only `npm ci`, but the gate (`prepublishOnly` = `npm run gate`) ends in `npm --prefix init run lint` -- init's own `eslint`, which a root-only install never fetches. The first `v1.2.0` tag died at `sh: 1: eslint: not found` (exit 127) and minted nothing. The Install step now also runs `npm ci --prefix init`, matching `test.yml`'s separate init install. `tests/qc.test.mjs` pins both halves (the gate still lints init AND the release lane installs init deps) so neither can silently drop the other again. Repo-infrastructure only -- the shipped tarball is unchanged.

### Release lane: the verify ladder survives propagation, and stops mis-reading the release object

- The `verify` job's npm ladder read `latest` ONCE, seconds after `npm publish` printed `+ prestruct@1.2.0`. npm serves a fresh publish before its packument indexes it ("may take a few minutes to become available"), so the ladder red-flagged a cut that HAD landed. It now polls the packument (20 attempts, 6s apart) until the version and `latest` settle, then judges -- and still fails by name if the version never appears. Knobs (`VERIFY_RELEASE_REGISTRY`, `VERIFY_RELEASE_ATTEMPTS`, `VERIFY_RELEASE_DELAY_MS`) exist for the test seam only.
- The gh ladder compared the release object's `target_commitish` to the tag's commit SHA. GitHub records `target_commitish` as the DEFAULT BRANCH NAME for a release cut from an existing tag (the publish lane's `gh release create vX` shape) -- `main` on every prestruct cut, `v1.1.0` and `v1.2.0` alike -- so the check could never pass and v1.2.0 was the first tag to run the verify job at all. Only a full 40-char SHA is a commit claim now; a ref name is the creation hint, and the tag itself is the identity. Repo-infrastructure only -- the shipped tarball is unchanged.

### Release lane: the release attaches the served tarball, and verify judges it

- The `release` job attached nothing: the GitHub release object carried only the changelog body, so a consumer downloading the release got no artifact, and nothing tied the release to the npm payload. It now attaches the EXACT tarball the registry serves (`npm pack prestruct@<version>`) as the release asset -- the artifact npm received, not a re-pack of the checkout, so the release and the npm tarball can never drift.
- The `verify` job's gh ladder now takes `--asset prestruct-<version>.tgz`: it downloads the release asset and asserts its sha512 equals the registry's own integrity metadata for this version. The release and the npm artifact are the SAME bytes, so a consumer gets one artifact either way. A missing asset, or one whose bytes differ, fails by name. Repo-infrastructure only -- the shipped tarball is unchanged.

### CI: the publish lane's action refs are pinned to SHAs

- `publish.yml` used floating major refs (`actions/checkout@v7`, `actions/setup-node@v7`). They are now pinned to the commit SHAs the tags resolve to, per the family rule (pins, never floats). Repo-infrastructure only -- no package change.

---

## [1.1.0] - 2026-10-21

### Scaffold now compiles on react-router-dom v7 (and the example runs it)

- vite SSR rejects named imports from v7's CJS entry, and node's CJS-interop namespace only reliably carries `default` (v6 is ESM, usually with no default export). The scaffold's router imports are now `import * as rrdNS` + `const rrd = rrdNS.default ?? rrdNS` + destructure, which compiles identically on both majors. Files touched: engine usePageMeta (synced), example (App/AppLayout/usePageMeta/ToolsBlock/ ViewSource/Proxy/Home/NotFound/About/Deploy snippets), init (App/ AppLayout). Verified for real: example builds and renders 8/8 pages under react-router-dom 7.18.4 + vite 6.4.5; root battery 147/147 on v6.
- The example is now on v7 (clears its open-redirect/constructor-injection advisories) and the init template ships the v7-safe import form while its battery stays pinned on v6 -- both majors stay compiled and tested.
- The example also moved to vite 6.4.5 (plugin-react 4.x peers cover v4-v7): its audit is now 0 findings, and the Cloudflare build log JSX-arrow warnings (`>` in JSX text on Contact/ToolsBlock) are gone -- replaced with explicit arrow string expressions.

### Deep engine imports are now part of the exports contract

- `package.json` exports map adds `prestruct/hooks` (usePageMeta), `prestruct/islands` (mountIslands), and a `prestruct/engine/*` passthrough so every engine file is importable without re-publishing a spec entry. Previously only `.`/`bin`/`prerender`/`inject-brand`/`validate-config` exported; deep paths failed with `Missing specifier in "prestruct" package`. Verified against the packed tarball (still 35 files). The docs default stays the scaffold-relative import (`../hooks/usePageMeta.js`) -- the deep form is for host projects that want to pin to the package.

### Crash-test pack is documented in-repo

- The root README now names `packs/public/prestruct-proxy` (v0.3.0): where it lives, which proxy surfaces it attacks, where the latest run results land (`labs/hardening.md`, `labs/crashledger.json`), and the one-line adoption path from another repo's `crashtest.config.js` (`packs: ['/abs/path/to/prestruct/packs']`). Clarification for adopters: the pack travels with the checkout -- the npm tarball ships only `bin/`, `engine/`, `init/` and never includes `packs/`.

### vitest 5 lands: root dev-tree audit down to the deliberate v6 pin

- The remaining vitest-2 finding class (UI-server critical, mocker moderates, vitest's private vite 5.4 copy) is GONE: root, init, and the release battery all run vitest ^5.0.5 with the full test battery passing 147/147 first run, against vite 6.4.5 (vitest 5 peers ^6.4). Nothing in the suite touches the flagged surfaces (no `--ui`, no `vi.mock`), so the earlier "accepted" verdicts were replaced by removal rather than papered over.
- What deliberately remains: two react-router 6.x moderates on the ROOT devDependency pin -- that pin is the battery's v6-compile guarantee for the engine's dual-major support; v7 is verified live on the example. Maintainers' test tree only; consumers install their own router.

### Supply-chain pass: critical tinypool pin, CI hardening, honest alert ledger

- **Consumer exposure stays zero.** Security scanners (Socket et al.) grade the published manifest including its devDependencies. prestruct's tarball has zero runtime dependencies and the consumer install tree audit-checks clean (`npm audit` reports 0 with and without dev on a fresh `prestruct@1.0.0` install) -- a package's devDeps are never installed for its consumers. The real exposure is this repo's own build/CI tree, which is what was hardened below.
- **Critical fixed: tinypool prototype-pollution RCEs (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr).** vitest 2.x resolves tinypool 1.x, which is affected up to tinypool 2.1.2. An npm `overrides` pin (`tinypool: "^2.2.0"`) now applies at root and init, the release workflow injects the same override into the zip battery, and the full vitest battery passes on the patched line (battery later moved to vitest 5, above).
- **CI installs skip Chromium.** All workflows that run `npm install` set `PUPPETEER_SKIP_DOWNLOAD=1`: no test here drives a real browser (the render path is asserted to fail closed), so the ~170 MB Chromium fetch -- which is also the vulnerable extract-zip/basic-ftp chain -- is not executed at install time.
- **init template: `test:ui` script removed.** `@vitest/ui` is not a dependency and vitest 2.x's UI server carries a critical advisory while listening; the script could never run as-is, so the footgun is gone.
- **What remains and why it is accepted, documented per finding:** the remaining root audit highs/moderates live in code paths CI never executes (vite dev-server classes -- CI only runs `vite build`; vitest UI-server class -- never started; @vitest/mocker mock registration -- attacker-controlled input does not reach it; the puppeteer browser-download chain -- skipped at install). Clearing them from the ledger requires semver-major devDep bumps (vite 8, vitest 5, puppeteer 25) that belong to a tested platform-matrix pass, not a security patch. Clearing them in the SCANNER view only: consumers were never exposed.
- **Example site runtime fix:** `npm audit fix` bumped browserslist (OOM advisory) and @remix-run/router (protocol-relative open redirect) in the deployed example's dependency tree; react-router-dom stays on 6.x for the example (the two remaining react-router moderates are fixed in v7, and shipping that migration needs the scaffold import work tracked in a follow-up issue).

### Pack v0.3.0: cache-key variant parity now pinned at the wire

- New pack shape `cache-key-variant-parity` pins the issue-18 fix class (a cached route restoring another URL-variant's HTML) at the wire level, on both runtimes, browser-free. The scenario seeds marker cache entries -- `{html, cachedAt}` JSON into the Worker's KV namespace, marker files into the express proxy's disk cache via a new `cacheDir` moduleCtx arm (set `PRESTRUCT_CACHE_DIR` before importing the proxy module) -- then asserts each variant is served only its own bytes and that no cached byte reaches a non-bot request. Fail-open honesty: if the seeded key is never consulted (key-format drift, seeding arm broken), the row reports the exact surfaces it could not prove instead of claiming a pass.

### Release archive is correct and self-testing

- The v1.0.0 GitHub release zip shipped a test battery that could not run: repo tests import `../engine/...`, which does not exist inside the template. `release.yml` now remaps those imports to the template layout, injects the full test devDependency set (react, react-dom, react-router-dom, vite, vitest, happy-dom, express, puppeteer), and runs the battery inside `init/` BEFORE the archive is built -- a release can no longer ship a dead test suite. Battery proven 136/136 inside the rebuilt zip.
- Archive hygiene: `node_modules/`, `dist/`, `.prestruct/`, and the stale `package-lock.json` are stripped before zipping, tests + e2e/timing helpers are copied in, and guardrails assert `tests/engine.test.js` and `ssr.config.example.js` are present with no node_modules leak.
- Release notes body now lists the real archive contents (the v1.0.0 body named `ssr.config.js`, which the zip does not contain, and omitted both proxy variants, `validate-config.js`, and `wrangler.toml`).

---

## [1.0.0] - 2026-10-21

Identical content to the 0.9.0 bootstrap release; the version returns to the 1.0.0 lock and stays there. This is the tag the dormant Trusted-Publisher workflow publishes from: pushing `v1.0.0` triggers .github/workflows/ publish.yml for the first tag-based publish with provenance (requires the npmjs.com Trusted-Publisher entry: user dhaupin, repo prestruct, workflow publish.yml).

## [0.9.0] - 2026-10-21

First npm publish (manual bootstrap; the Trusted-Publisher tag pipeline is dormant until v1.0.0, per the runbook in .github/workflows/publish.yml). Behavior is identical to the internal v1.0.0 lock, renamed down for the bootstrap ladder: after the publish lands, the version returns to 1.0.0 and the `v1.0.0` tag drives the first tag-based publish with provenance.

## [0.2.6]

### 404 CTA follows the host theme (visible fix for dark-mode owners)

- The generated `404.html` CTA no longer hardcodes `background:#000; color:#fff` -- that fill was invisible on dark-themed hosts (black fill on a near-black page). The button now draws its text and 2px outline from `currentColor`, so it reads on any theme the host shell sets. If you cherry-picked `scripts/prerender.js`, re-copy or re-run the generator. Layout and copy are unchanged; only the CTA's color source moved.

### Phase 2 scaffold: npm-ready packaging (dormant -- nothing published yet)

- The repo root is now the npm package shape: "bin" (`prestruct` -> `bin/cli.mjs` with `init`, `build`, `validate`, `clean`, `help`), exports map for programmatic use (`prestruct/prerender`, `prestruct/inject-brand`, `prestruct/validate-config`), `files` whitelist (`bin + engine + init`), peerDependencies (react/react-dom/react-router-dom/vite resolve from the HOST project), engines >= 18.
- `.github/workflows/publish.yml` added: npm Trusted Publishing (OIDC), fires on `v*` tags only. **Dormant by design** -- no tag exists and no publish is allowed until the engine proves stable in real projects. First publish must be manual (OIDC cannot create a new package; see the runbook in the workflow header).
- `prerender()` accepts `prerender(config, { root })` so the CLI can run the pipeline inside a user project; engine copies keep project-root defaults.
- No version has been tagged or published; the npm registry still has no `prestruct` package.

### Phase 1: the engine is now one source

- The engine moved to `engine/` at the repo root: `scripts/prerender.js`, `scripts/inject-brand.js`, `scripts/validate-config.js`, `src/islands.js`, `src/hooks/usePageMeta.js`, `vite.config.js` (init-only). `init/` and `example/` copies are now **generated** by `node scripts/sync-engine.mjs` -- never edit them. CI verifies engine == init == example for 5 contract files.
- **Fixed: `deployIdFooter: true` no longer breaks prerendering** (tracked as W8). prerender's root-div injection is attribute-tolerant: any attributes injected by inject-brand (e.g. `data-deploy-id-footer`) now survive onto the prerendered pages.
- **Fixed: template builds silently degraded to SPA on fresh installs.** `init/` ships `vite.config.js` (missing plugin-react jsx automatic runtime), and pins `react`/`react-dom` 18 + `react-router-dom` 6 as devDependencies -- react-router-dom v7 dropped the `./server.js` subpath the pipeline needs. Cherry-pickers on v7: pin v6 or update your SSR entry.
- `init/incremental.js` removed (dead stub; cache logic lives in prerender.js).

### Must-read for cherry-pickers

- **`scripts/inject-brand.js` now reads `config.deployId` and `config.deployIdFooter`.** - `deployId` (default `true`): injects `<meta name="deploy-id">` with a build identifier. Pass `deployId: false` to disable. - `deployIdFooter` (default `false`, **opt-in**): adds `data-deploy-id-footer` to the root div for client-side footer display. See `init/ssr.config.example.js`. - Sites that copied the older `init/scripts/inject-brand.js` (meta tag always on, no footer attribute) keep their behavior with the new defaults. No action needed unless you want the footer.
- **`init/` is now the single source of truth for engine files.** `example/` copies are generated from `init/` via `node scripts/sync-engine.mjs` (repo-internal tool; run it after editing engine files). The CI sync check fails if `example/` has drifted.
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

- If `deployIdFooter: true`, the footer attribute is injected before prerender runs; prerender's root-div matcher then misses and routes prerender as empty shells. Do not opt into the footer until W8 is fixed (Phase 1).

---

## Earlier releases

See the [Releases table in README.md](./README.md#releases) and the [branch tags](https://github.com/dhaupin/prestruct/branches) for v0.2.4 and v0.2.2. No action-on-update notes needed for these.
