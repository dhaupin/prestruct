## Pass 61 (2026-10-28): #66 ship lane, #71 release trust ladder, #63 docs-preview recipe, #60 docs SEO identity, #59 freestruct step
**Scope:** (1) prestruct#66 -- adopt the eyestruct ship-from-download lane; (2) prestruct#71 -- adopt the verify-release trust ladder and the three-job tag ladder in publish.yml; (3) prestruct#63 -- run the docs Jekyll stack locally (no root, no system Ruby) and land the belt-and-suspenders gitignore; (4) prestruct#60 -- ship the family JSON-LD identity (founder + maintainer) with the docs SEO layer; (5) prestruct#59 -- confirm and land the missing freestruct step in docs.yml. All work on branch `staging` (per the new directive), no tags.

**#66 (ship-from-download).** `scripts/ship-from-download.cjs` copied byte-identical from eyestruct@9744c76 (sha256 `d9f10517e3daece1`, 11801 bytes). Generic phone-publish lane: stages a git-less zip tree into the Termux home, chooses `npm ci` or `npm install`, reads the staged `package.json`, refuses by name on token problems, exit 0/1/2. Its test ported from node:test to vitest -> `tests/ship-from-download.test.js`, 21/21.

**#71 (release trust ladder).** `scripts/verify-release.cjs` copied byte-identical from eyestruct@e1ba919 (sha256 `8c8eb979e1cf1b2b`, 19933 bytes) -- the generic core names no repo: name/version come from the checkout, exports keys and probes arrive as flags. `scripts/release-notes.cjs` adopted and adapted: prestruct's CHANGELOG writes `## 1.2.0 (...)` and `## v1.1.0 (...)`, not eyestruct's `## [x.y.z]`, so the matcher now accepts all three forms (bare, v-prefixed, bracketed) and slices from the end of the heading line. `bin/cli.mjs` gained `--version` / `-v` (the ladder's installed-bin probe answers from `package.json`). `publish.yml` becomes the three-job tag ladder, ported from eyestruct's v2 lane (6bf3e3d): publish (OIDC trusted publishing, npm >= 11.5.1 floor, the 0.x refusal and the tag==packaged-version gate, idempotent skip-if-already-published) -> release (GH release minted from the pushed tag, notes EXTRACTED from the changelog, empty extraction refuses, idempotent) -> verify (`verify-release.cjs --npm` for registry latest + served-tarball sha512 vs registry integrity + provenance attestations + the full pack ladder; `--gh` for the release object's target commit and the GH source-tarball diff against `git archive` of the release commit). A `verify-only` dispatch mode re-runs the ladder against what is already served. New battery leg `tests/release-verify.test.js` (4, vitest): the foreign-repo zero-edit proof, the caller-stated `--forbidden` refusal, the real `npm pack` ladder, and the doctored-tarball smuggle refused BY NAME. Rider gap noted in the issue: still no tarball-contents check inside publish.yml itself and no auto-minted GH release in the pre-1.0.0 lane -- both now closed by this ladder.

**#63 (local docs-preview recipe, no root).** The sandbox had no Ruby, so docs tokens were only verifiable by live curl AFTER push. Recipe run end to end here, no root: (1) prebuilt platform-matched Ruby 3.4.12 from the official ruby/ruby-builder releases (asset `ruby-3.4.12-ubuntu-24.04-x64.tar.gz`; the tag is the VERSION, not `toolcache`), unpacked into `$HOME/rubies` -- never the repo; (2) `LD_LIBRARY_PATH=~/rubies/x64/lib` (libruby.so lives in the unpacked lib tree). The prebuilt `psych.so` also links `libyaml-0.so.2`, which this base image lacks -- fetched rootlessly (`curl` the `libyaml-0-2` .deb from the Debian pool, `dpkg-deb -x` into `$HOME/libyaml`) and prepended to `LD_LIBRARY_PATH`, so no apt/root step is required (proven: `/proc/self/maps` shows psych loading `$HOME/libyaml/.../libyaml-0.so.2.0.9`); (3) the shipped binstubs bake `/opt/hostedtoolcache/Ruby/<ver>/x64/bin/ruby` shebangs, so `gem`/`bundle`/`bundler` were shimmed `#!/bin/sh` + `exec ~/rubies/x64/bin/ruby ~/rubies/x64/bin/<tool> "$@"`; (4) `GEM_HOME`/`GEM_PATH` at the unpacked gem dir (`lib/ruby/gems/3.4.0`) plus `RUBYLIB` to the stdlib + arch dirs; (5) Bundler never writes in-tree: `BUNDLE_PATH=$HOME/docs-bundle`; (6) built from a scratch COPY of `docs/` at `/tmp/docs-preview` (`bundle install` -> `Bundle complete! 4 Gemfile dependencies, 38 gems`, then `bundle exec jekyll build` -> 0.545s, green; four Liquid warnings are pre-existing doc fences, not failures); (7) served `_site` under the real baseurl by symlinking `/tmp/docs-serve/prestruct -> _site` and `python3 -m http.server 8899`, so baseurl'd links resolve. Dark + light frames captured first-person at 1280x800: dark background `rgb(14,14,14)`, light `rgb(255,255,255)`, the light half via a same-origin localStorage launcher (`prestruct-theme=light` then `location.replace`) because a `data:` URL's opaque origin never reaches the site's storage. `prestruct` commits no `docs/Gemfile.lock` (CI resolves fresh), so the gitignore block keeps that one line. Landed the belt-and-suspenders block from eyestruct@ca2f62a into `.gitignore`. The local build paid for itself immediately: it surfaced a real defect -- `docs/discussions/announcing-v1.2.0.md` carried `layout: none` (its v1.0.0/v1.1.0 siblings carry `layout: default`), so that page built headless with no site chrome even though `guides/changelog.md` links to it; fixed to `layout: default`.

**#60 (docs SEO identity) + #59 (the missing freestruct step).** Grepping the tree confirmed #59's suspicion: prestruct's `docs.yml` had NO freestruct/pagefind SEO step at all (only a pagefind index step), and no `docs/freestruct.config.yml` or `docs/_freestruct/inject-brand.html` existed -- so the docs rig shipped no family identity. Both land together, the build-day spec #60 asks for. Added `freestruct` as a devDep (^1.1.0, matching eyestruct/gistory; the family's PINNED-install rule). `docs/freestruct.config.yml` carries the identity: `author: Creadev.org` (expands via the `{{authorJson}}` seam to a schema.org Person under **"founder"** on the injected Organization block) and the maintainer Person (`dhaupin`, `jobTitle: prestruct maintainer`) appended after the built-in Organization + WebSite blocks through the missing-only gate. `docs/_freestruct/inject-brand.html` is the ENGINE edition (from freestruct's init kit), NOT the older flowforge shell edition -- the shell's only Organization sits inside a SoftwareApplication author field with no seam, so it cannot render the founder at all (the trap that cost eyestruct a round this week). The layout head is trimmed to the freestruct-fed contract (title + description only; canonical/OG/Twitter/JSON-LD are the engine's missing-only surface -- baking them would ship duplicates the audit flags). `docs.yml` gains the Node setup + `npm ci` + `node node_modules/freestruct/bin/freestruct.mjs --strict` step between Jekyll build and pagefind. **Config-shape gotcha found and fixed:** the family configs (eyestruct/gistory) put the deploy prefix in BOTH `site.url` (`.../prestruct`) and `basePath` (`/prestruct`), and freestruct's contract is `site.url (origin) + basePath + relSlug` -- so those double the prefix (gistory's LIVE sitemap and robots carry `.../gistory/gistory/...`). prestruct ships the correct shape (`site.url: https://docs.creadev.org`, `basePath: /prestruct`), matching packstruct/poststruct, with the "Canonical math" comment. `linkCheck: false` is required (freestruct#32 is unfixed in 1.1.0: its link checker resolves root-absolute `/prestruct/...` hrefs against the artifact root and fails every baseurl'd nav -- reproduced here, `--strict` exits 1 with all 25 links named broken; with linkCheck off, `--strict` exits 0 and `audit` reports 0 failures).

**#61 (CI guide + playbooks).** `docs/guides/` carried the reference; it had no CI page and no task-first recipes. Added `docs/ci.md` (the lane map: test.yml battery, engine-sync-check.yml, crashtest.yml, docs.yml, the two release workflows, and the `npm run gate` aggregate, each leg mapped to its workflow file with a when-red table) and `docs/playbooks/` (index + six legs: first-prerender, add-a-route, wire-an-island, red-audit-triage, docs-change, release). Both wired into `docs/_data/nav.yml` under Project. Every claim names its receipt (the workflow file, the script, the engine module, or the CLI verb), so a code/prose disagreement can be judged and the code wins - the content rule #61 states. The audit FAIL table in `red-audit-triage.md` is lifted from the `fail(...)` call sites in `engine/scripts/audit.js`; the lane tables are lifted from the workflow files. Docs gates green (35 pages, was 27).

**Proof:** `npm run gate` green -- sync check, packs, docs (style/links/frontmatter/language/truthfulness), claims, init eslint (0 errors), and the battery: 306 tests / 18 files (was 281/16; +21 ship-from-download, +4 release-verify). Jekyll build green; `freestruct --strict` exit 0; `freestruct audit` 0 failures; both docs theme frames seen first-person; the founder + maintainer JSON-LD verified in the baked head; the fixed v1.2.0 announcement re-checked first-person (chrome restored); the CI guide + playbooks index re-checked first-person.

**Next:** #57 (crashtest 1.2.0 bump, blocked on the registry release). Follow-up for the family: eyestruct/gistory configs double their prefix (freestruct#32 + the `site.url` shape); worth a shared fix.

---

## Pass 60 (2026-10-28): #67 prose-flow, #64 publish gate, #62 mobile table guard, #65 close
**Scope:** (1) prestruct#67 -- retire the 72-column hard-wrap habit across the living prose surfaces; (2) prestruct#64 -- wire `prepublishOnly` to the gate; (3) prestruct#62 -- the mobile table guard in the docs shell + the landing template; (4) close prestruct#65 with evidence (already shipped).

**#67 (prose flows).** Copied `scripts/unwrap-prose.cjs` from eyestruct@3adda1d and ran it over the living surfaces eyestruct unwrapped: the three `docs/discussions/*` posts, `README.md`, `AGENTS.md`, `CHANGELOG.md`, and the labs memory (`labs/TASKS.md`, `labs/prd-prestruct.md`). The guide pages under `docs/guides/` stay wrapped -- eyestruct's own guide pages (`docs/cli.md`) are still hard-wrapped at HEAD, so the worked example's scope is keepers, not guides. Every unwrap is line-break-only: word counts are byte-identical (AGENTS 5627, TASKS 20010, README 981, CHANGELOG 3964) and headings / lists / fences / thematic breaks are unchanged.

**The helper needed a fix before it was safe here.** The eyestruct copy decides frontmatter by counting the first `---` lines it meets in the first 40 rows. Two defects surface on a tree like prestruct's: (a) a mid-document `---` thematic break (TASKS.md uses 45 of them as pass separators) is folded into the preceding paragraph -- 6 rules vanished into ` --- ---`-shaped lines; (b) a file whose first non-fence row is a rule (CHANGELOG's line-9 `---`) is misread as an open frontmatter block, so the whole file collapses to one paragraph (CHANGELOG went 419 -> 120 non-blank, far past the real 417). Hardened: frontmatter only when line 0 is `---`, line 1 is a `key: value` pair, and a closing `---` follows; thematic breaks (`---` / `***` / `___`) flush the buffer and pass through; the CLI loop is behind `require.main === module` and `unwrap` is exported. Ten regression tests in `tests/unwrap-prose.test.mjs` pin every branch (paragraph join, frontmatter, top-of-file rule, mid-document break, `***`/`___`, fences, tables, list items, headings, blank-run collapse).

**#64 (publish gate).** `"prepublishOnly": "npm run gate"` added to `package.json` -- the gate chain that already existed now blocks a local `npm publish` from packing a dirty tree. Also fixed a formatting glitch in the same file (`],    "scripts": {` collapsed to a clean `],` + `"scripts": {`).

**#62 (mobile table guard).** Two surfaces. Docs shell `docs/_layouts/default.html`: the `table` rule gained `display: block; overflow-x: auto; -webkit-overflow-scrolling: touch;` plus `table td code { white-space: nowrap; }`, so a wide kramdown table scrolls in its own box instead of pinning the page to its min-content width. Landing template `example/src/index.css`: the `.compare` grid guard changed `overflow: hidden` -> `overflow-x: auto` with `-webkit-overflow-scrolling: touch`, and `.compare-row` / `.compare-cell` gained `min-width: 0` so long cells wrap rather than inflate the row past the viewport.

**#65 (closed, already shipped).** Both asks landed in the engine on 2026-10-26, before the issue was filed on 2026-10-27: `og:image:width` / `height` / `alt` companions and the per-route `ogImage` object form shipped in `937f08c`; the config-driven JSON-LD defaults (`jsonLdDefaults` -> Organization + WebSite, opt-out) shipped in `855b535`. No code change needed; closed with the commit receipts.

**Proof:** `npm run gate` green -- sync check, packs, docs (style/links/frontmatter/language/truthfulness), claims, init eslint (0 errors), and the battery: 281 tests / 16 files (was 271/15; +10 unwrap tests).

**Next:** tag v1.2.0 (owner action).

---

## Pass 59 (2026-10-28): issue #70 + v1.2.0 release prep + audit-fix walk
**Scope:** (1) prestruct#70 version-truth ruling; (2) v1.2.0 version bump across every living surface; (3) announcement + changelog rolling v1.1.0 -> 1.2.0; (4) push to GitHub (NO tag); (5) fix the audit-walk findings list from the prior session's report (`/tmp/audit-report.txt`, `main` @ 498ab5f).

**#70 (version truth):** `tests/census.test.mjs` derives the root version and refuses every living surface that drifted: side package.jsons (`init/`, `example/`), `init/VERSION`, both committed lockfiles, and the README `Status: **X.Y.Z` line. Dated era rows, `^`-range pins, and other packages' versions stay lawful. A full-tree scan confirmed every remaining `1.2.0` is a lawful surface (era rows / announcement / changelog / the pinned living set). `package.json` is THE single source.

**Version bump:** root `package.json` == `init/package.json` == `example/package.json` == `init/VERSION` == lockfiles == README status line, all at 1.2.0.

**Audit walk (fixes):**
- **B1/B7** Worker single-flight + `MAX_CONCURRENT` limiter in `init/scripts/proxy.worker.js`, mirroring the VPS `renderOnce`/`withRenderLimit` (flight map now written BEFORE the awaited render -- the old order made the `FLIGHT` branch dead code). Parity tests added in `tests/proxy.test.js`.
- **E2** Both proxy runtimes now origin-check the resolved target URL (SSRF guard no longer hinges on Node's parser rejecting `@`-targets).
- **B2** Grouped head additions (feed/hreflang/verification) drop `escapeReplacement` -- they ride a FUNCTION replacer, so the `$$` doubling shipped literally.
- **B3** `generate404` no longer double-escapes `siteName` (was `&amp;amp;`) nor `$`-doubles the home canonical.
- **B4** Per-route `ogImage` object carries its own og:image companions and strips the stale site-wide ones.
- **B5** `result.cached` counts real cache hits (was `total - succeeded`).
- **B6** `replaceRootDiv`/`findRootDivSpan` tolerate minifier/prettier attribute reflow (quote style, spaces around `=`, leading attrs).
- **E1** `rewriteRrdNamedImports` also rewrites the default+named form.
- **G1** `prestruct build` ends in the audit (FAIL rows fail the build).
- **G2/G4/G5/F1** Docs/config truth: CLI guide verbs + pipeline, root `eslint.config.js` made valid + dependency-free, `init/package-lock.json` peer ranges synced, Worker header phantom-default removed.
- Dead `MAX_CACHE_SIZE` const removed from `init/scripts/proxy.js`.

**Proof:** `npm run gate` green -- sync check, packs, docs, claims, init eslint (0 errors), and the battery: 271 tests / 15 files. Regression tests added for B2/B3/B4/B6/E1 in `tests/issue-walk.test.js` + `tests/engine.test.js`.

**Next:** tag v1.2.0 (owner action); the crashtest 1.2.0 bump rides #57.

---

## Pass 58 (2026-10-28): react-router 7 ESM seam closed (#68)
**Scope:** prestruct#68 -- "v7 prerender seam: the engine's StaticRouter import and the app's router load as two module instances." Bug label; worked example eyestruct@954676e.

**Root cause (two signatures, one seam):** the pass-57 v6/v7 fallback fixed the router IMPORT path, not the module INSTANCE. On v6 the CJS entry is `require()`-shaped so the engine's `import('react-router-dom')` and `ssrLoadModule` collapse to one module. On v7 (real ESM) they split, each copy minting its own React contexts: 1. `Named export 'useLocation' not found ... CommonJS module` -- host `ssr.noExternal` makes Vite INLINE `dist/index.js` and evaluate it as ESM. 0/n pages. 2. `useLocation() may be used only in the context of a <Router> component` -- the two-instance split, every route, externalized or not.

**Fix (engine/scripts/prerender.js):** - `rrdEsmTwinPlugin` -- SSR `load` hook: when a react-router(-dom) CJS `.js` dist file is loaded, serve its sibling `.mjs` twin via fs. Rescues the inlined (noExternal) case. No-op on externalized trees. - `loadStaticRouter` is now registry-preferring: after `createServer`, load StaticRouter THROUGH `vite.ssrLoadModule` so the wrapper and the host tree share one instance. The pre-server plain import remains the fail-before-server + externalized fallback; default/named interop kept.

**Proof:** - `tests/prerender-seam.test.js` (new, 9 tests): offline pins on `esmTwinSource`/`loadStaticRouter` + a REAL createServer/ssrLoadModule render of a v7 + `ssr.noExternal` fixture host (v7 installed under the `react-router-dom-v7` alias so the root rail stays v6), asserting n/n pages and per-route `useLocation` content. Reverting the engine fails 7/9. - Scratch: /tmp/repro (v7+noExternal), /tmp/v6app (v6+noExternal baseline), /tmp/ext (externalized) -- all 8/8 with the fix; baseline shows 0/8. - `npm run gate` green: 256/256 tests, sync byte-identical (9 contracts), packs/docs/claims pass, init lint 0 errors. `npm run e2e` all pass; tarball 44 files (no node_modules/dist).

**Consumer note:** hosts that shipped the eyestruct-style `rrdom-esm-redirect.mjs` shim + `ssr.noExternal` lines can drop both.

**Next pass:** consider a v7 leg in the CI example build (currently the example pins rr-dom ^7.18.4 already, so the integration leg also rides CI's example lane); if the alias devDep proves noisy, fold the v7 rail into the e2e fixture.

---

## Pass 57 (2026-10-27): vite 7 graded + peer ceiling up a notch, proxy single-flight
**Poll receipts:** CI green on cae8b52 across all six lanes (verify-engine-sync, build, proxy-pair, tests, crashtest run #42 with 0 new/0 regressed, docs deploy, CF Pages deploy). Registry: crashtest still 1.1.0 -> prestruct#57 stays parked on its trigger. Issues after close-out: #57 open by design; #58 closed (ask 1 shipped, ask 2 roams the roadmap). **Spike: vite 7 clears the lane (scratch clone first, then in-repo).** Example bake under vite 7.3.7: 8/8 pages, audit 0 f / 0 w, no deprecation noise around ssrLoadModule. Output byte-equivalence vs the vite 6.4.5 bake: so that only content-hash asset names and the deploy-id stamp diverge (scratch clone, not a git tree). The peer ceiling moved (`vite >=5 <8` both package.json and the shipped init manifest), example devDep -> vite ^7.3.7 with its lockfile (the router 7 shape), init battery rails on 6. Remaining 1.3.0 lane: vite 8 (ssrLoadModule -> ModuleRunner port) + react 19 islands. **Walk finding + fix: render single-flight.** The concurrency limiter (cap 5, recursive queue) bounds HOW MANY; nothing dedupes WHICH: a burst of N bots on the same uncached URL rendered the identical page floor(N/5) times. Both runtimes now collapse same key misses to one render: express renders through `renderOnce(key, url, force, renderFn)` (force skips the flight and owns no map entry, so a flight can never be deleted by a foreign request); the worker gains the per-isolate flight map (KV is eventually consistent, so this only dedupes the same-isolate burst; joiners carry `X-Prestruct-Cache: FLIGHT`). Three new battery pins in tests/proxy.test.js: one-burst-one-render, different keys render independently, forced refresh rides it not. Gates on the commit: full npm run gate green (battery 247/247, sync byte-checks, packstruct 1 pack / 6 shapes, docs incl truthfulness, init lint). crashtest lane: 54/54 rows REFUSED, 0 exploited, baseline unchanged.

## Pass 56 (2026-10-27): docs guide-cards grid restored + live-site probe round

**Symptom (live receipts, user phone + headless Chromium):** docs home "Guides" renders as a raw stacked-link list. Root cause: `index.md` ships `<div class="guide-cards">`/`.guide-card` anchors; the flowforge rig adoption replaced the old stylesheet and dropped those rules entirely. Fix: `.guide-cols`... (no - `.guide-cards` grid block in `docs/_layouts/default.html`, token-sheet only (auto-fill minmax 230px, surface/line/accent/ink-soft/--err-free). Verified visually DARK + LIGHT via a harness embedding the REAL layout `<style>` + REAL card markup (artifacts/guide-cards-{dark,light}.png) - accent headings, muted body, code chips, hover accent border, light re-tunes every rule.

**Probe round (live URLs via headless Chromium, console+network):**
- docs home / getting-started / hardening + mobile home: zero failed asset requests; sidebar/search/theme all healthy; rouge palette painted end to end (nb/nf/s1/se etc).
- Node-version drift fixed: getting-started said "Node.js 18+" and "Node.js version: `18`" while both engines pin `>=20` (also drift vs cloudflare.md's "20 ... safe default"). Now 20+, aligned with engines.
- example site console: ONE recurring CSP violation class - gtag's `www.google.com/ads/ga-audiences` beacon blocked by `connect-src` which omitted `www.google.com`. Added to `example/public/_headers` (+ dist receipt). `init/public/_headers` untouched: it carries only inspector defaults and its comment tells adopters to append their own targets.
- example pages render clean; no 404/5xx assets on either site.

Docs linter battery green after edits (style/links/frontmatter/language/ truthfulness, 27 files). Example build green, audit 0 f / 0 w.

## Pass 55 - the aggregate gate: `npm run gate` (2026-10-26)

The pass-54 promise shipped. One command carries every lane CI runs, loud fail on the first red, in cheap-first order:

```
sync:check -> lint:packs -> lint:docs -> lint:claims
           -> npm --prefix init run lint -> test:run (battery)
```

The first end-to-end run caught a second lesson on the way to green: `cd init && npm run lint` inside one npm script moves the WHOLE chain -- `&&` runs in a single `sh -c`, so the battery after it searched for test files inside init/ (`No test files found, exiting with code 1`). CI never saw it because test.yml runs the cd form as a standalone step. The gate uses `npm --prefix init run lint`, which runs the lint lane scoped to init without relocating the chain.

Proof: gate exit 0, end to end, ~69s locally (battery 244/244 included). Docs updated to match: AGENTS.md gates block now leads with the aggregate and carries the lint-only-rode-CI history (why the aggregate exists), contributing.md's "before submitting" section points at `npm run gate` with the --prefix trap note. CI still runs its own steps; the gate script is the contributor-facing superset-plus-loop so a lane cannot be forgotten again (the pass-54 silent-red generator).

## Pass 54 - CI redraw: the init lint lane had been silently red (ogimage prefer-const) (2026-10-26)

Solving prestruct#56's acceptance ("CI shows both build lanes green") surfaced something better than a close receipt: the Test workflow's Lint step (`cd init && npm run lint`) has been failing since the og-image pass -- engine/scripts/ogimage.js carried `let svg` that is never reassigned (one eslint `prefer-const` ERROR among allowed warnings), and every push since that landing went red at the lint step while the battery, docs gates, sync check, and crashtest proxy lane all stayed green. Nobody caught it because the lint step was never part of the local gate loop.

Fix: `const svg` in ogimage.js, engine synced to init/ + example/ (sync:check contract green), init's own lint exit 0 (0 errors), full battery 244/244, qc byte-identity green. init/package-lock.json's version field re-stamped 1.1.0 -> 1.2.0 (header had lagged the ladder).

Lesson for the gate set: a tracked lint lane that is not part of the pre-push loop is a silent-red generator. The lint gates we run by hand (lint:docs/lint:claims/lint:packs) cover the repo; the init tree's own eslint rides only CI. Candidate follow-up: a `npm run gate` aggregate that includes `cd init && npm run lint` so the pre-push loop cannot forget a lane again. Acceptance closed: Test run 40418101225 at 51950a5 walked both lanes green (all 12 steps success), all six checks green on the head, prestruct#56 closed as completed with the run receipts.

## Pass 53 - the remaining labs staging docs land on their trackers (2026-10-26)

The "are ALL the staging docs filed?" sweep. Inventory of every paste-ready/handoff document still in labs/, duplicate-check against each tracker, then direct filing through the GitHub integration. After this pass every issue-shaped labs doc is either filed and deleted (the new default) or kept as a receipts document; none remain as drafts.

- **flowforge#7** -- the highlighting issue (six-token rouge block, bash-heavy pages ~monochrome, web hand-painted comment hole; prebuilt palette-independent CSS from prestruct@c915760's verified fix).
- **freestruct#30** -- the sibling highlighting issue (same partial block + the fence-language census: most docs fences are bare ```).
- **flowforge#8** -- the repair-404.cjs shim-retirement handoff (the upstream fix shipped in prestruct's 1.2.0 ladder; the shim retired at the family's pin bump per their own MANIFEST trigger words). This one existed only as a draft from the theme-adoption round.
- **prestruct#56** -- the CI-gates tracking issue (example lane + the config-aware template build + init/dist artifact fix).
- **prestruct#57** -- the crashtest 1.2.0 bump tracking issue (the mechanized `crashtest:bump` runbook reminder). Its poststruct B1/B2 sibling content was already filed as gistory#7, so no duplicate.
- **Staging docs deleted:** flowforge-shim-retirement-issue.md, issues-highlighting.md, issues-stabilization.md (all now tracked by issue numbers), and issues-closeout.md -- the closeout targets (#34/#37/#38/#40/#51/#55 etc.) were already closed on the prestruct tracker with receipt verdicts before this pass, so the paste-ready close comments were obsolete rather than unfiled; commit history remains the source per the changelog rule.
- **Kept on purpose:** gistory-beta-report.md (the consolidated receipts document behind gistory#7-#10, header updated to the filed state), beta-gistory-trial.md (full trial receipts), gistory-online-plan.md (runbook, not an issue), poststruct-shapes-contract.md (contract doc).

## Pass 52 - dependency audit + cross-repo fix-class sweep (2026-10-26)

The "is our stack current?" pass, run against the family too.

- **npm/lockfile/Gemfile: all current.** packstruct 1.0.0 and crashtest 1.1.0 are the published latest, matching the pins; lockfile ships react 18.3.1 / react-router-dom 6.30.6 (newest v6 line) / vite 6.4.5 / vitest 5.0.5 / express 4.22.3, all newest-compatible. The vite 6-vs-8 gap stays a conscious matrix choice: the peer range is >=5 and the engine must build against the majors hosts actually run; the tarball e2e is the proof surface, not the dev pin. Jekyll `~> 4.4` is the newest 4.4 line, and the docs workflow keeps the artifact-deploy shape the Pagefind lesson demands.
- **This repo's CI actions were the real drift:** upload-artifact 4->7, configure-pages 4->6, upload-pages-artifact 4->5, deploy-pages 4->5, action-gh-release 2->3 (checkout/setup-node were already v7). Bumped in place; workflows otherwise untouched. The same-round push exercises them live.
- **Cross-repo walk (shallow clones, receipts inline):** freestruct's engine shares none of the last-week fix classes (their hooks already carry the 30s wall, no root-div swap in their injector, no islands runtime, CLI positional resolution is position-independent double-dash-only). Its CI is current except ONE straggler: docs.yml:74 pagefind cache on actions/cache@v4 while sibling steps are @v6. filed as dhaupin/freestruct#29. flowforge carries two: web/src/islands.js has the identical observe-stacking class prestruct pass 50 fixed (their observe() mints a fresh IO per scan of an unmounted visible island and disconnects only inside its own callback), and every actions/* pin is behind - upload-pages-artifact@v3 in particular predates the v4 line. Filed as dhaupin/flowforge#6 with the transposable island fix. Both issues went in directly through the connected GitHub integration (repo write arrived via Composio) - the labs-draft handoff model is retired, and the two placeholder drafts from this pass are deleted.

Pass-51 proxy fixes remain uncommitted from the previous round; see Pass 51 for contents.

## Pass 51 - the proxy pair walk: operator-env edges at hard seams (2026-10-26)

First deep walk of init/scripts/proxy.js (VPS) + proxy.worker.js (CF Worker) since the live-fire round. Wrangler contract verified against code first: binding names (BROWSER, CACHE), [vars] keys, secret placement all match -- no drift. The proxy is init-owned (not engine- contract), so example/ rightly ships none and the pack copy is the adversarial harness, not payload. Three fixes, all unit-tested:

- **Junk PORT env (VPS):** parseInt made server.listen(NaN) die at startup with an error far from its cause. normalizePort() now validates the 1..65535 range and falls back to 3000 with a loud warn.
- **Junk CACHE_TTL_SECONDS (Worker):** KV's expirationTtl rejects non-numbers AND values below the 60s protocol minimum -- and the put happens AFTER a successful, already-paid-for render, so a bad env value turned a working MISS into a 500 on the response path. ttlFromEnv() now rejects junk (default 86400) and clamps to the KV minimum instead of surfacing the operator's wish invalidly.
- **Empty/missing config.proxy.botList (VPS):** a proxy that renders nothing -- every request 302s -- used to bind silently and look green. createProxyApp now warns in the #52 diagnostic form (config is author-owned, so warn, not fail).

Worker browser-per-render churn (launch + close per request vs the VPS's pooled browser) is noted as a follow-up, deliberately NOT implemented without a live Worker runtime: the CF pooling surface (keep_active/sessions) cannot be verified from this environment, and the AGENTS.md Cloudflare rule says no unverifiable Puppeteer-surface changes ship in that file.

Gates: 244/244 battery, sync:check byte-identity, packstruct --deep, docs frontmatter+language+truthfulness, fiction signatures. Also fixed mid-run: the new findWorkdir positional test hit vitest's 5s default timeout when the cold npx spawn needed 30s+ -- raised to 80s with the reason in the test (spawnSync blocks; there is no in-test retry to catch an external timeout).

## Pass 50 - second QC walk: island runtime, CLI args, validator edges (2026-10-26)

Four boundary-class fixes, each with a regression test. Full gates pass.

- **islands.js observer lifecycle (engine/src, shipped to init/ + example/):** mountIslands is called after every SPA navigation, and a 'visible' island below the fold survives each scan as the SAME element. The old observe() stacked a fresh IntersectionObserver on it per scan, and mount() left the one-shot observers connected until their own callback ran. Now: an `observing` WeakSet guards the pending set, a WeakMap tracks the live observer per element, and mount() disconnects exactly the observer that got it there. Tests pin one observer across three re-scans, disconnects === 1 after intersect, and no re-observation of a mounted island.
- **bin/cli.mjs findWorkdir positional:** only args[0] was treated as the workdir, so `prestruct build --force dir` saw the flag first and silently built cwd instead of dir (cmdInit/cmdAudit already scanned for the first non-flag; build/validate were the odd ones out). Pinned by a live-process test running the positional on BOTH sides of the flag.
- **change frequency set closed (validate-config.js):** the validator knew four <changefreq> values and falsely refused half the sitemap protocol -- 'hourly', 'always' and 'never' are legal. One battery check now runs all seven spec values clean.
- **Seam re-sweep (inject-brand/audit/ogimage/cli exec-finish):** every exec site is a fixed command or a config-owned boolean chain, the audit's fetch rides a bounded AbortSignal with a proper UA string, and ogimage's lazy CJS resolver fails closed. No new $-surface or replacement-string risk: the grouped head additions and both root-div swaps are already function-replacer/slice-assembly only.

Gates: 239/239 battery, sync:check byte-identity, packstruct --deep, docs frontmatter+language+truthfulness, fiction signatures. One flake observed once: tests/cli.test.js hit a 33s cold-npx spawn timeout on a fresh scratch env and passed on rerun (1.9s) - the spawn contract, not the CLI, is the slow thing cold.

## Pass 49 - the QC sweep: gaps, edges, vulns, perf (2026-10-26)

Fresh-eyes QC over everything Pass 48 shipped. Four findings, four fixes, all with regression tests (tests/issue-walk.test.js + tests/engine.test.js):

- **Re-entrancy gap (caught live by the perf sweep):** prerender's root-div swap matched only `<div id="root"></div>` - an EMPTY div. But prerender writes its rendered home page over dist/index.html, so a bare rerun of `node scripts/prerender.js` (no fresh vite step) read a shell whose root div carried last pass's markup and FATALed every route with what looked like a missing shell. Fix: findRootDivSpan() depth-counts nested divs to locate the whole root element (open tag through its matching close), replaceRootDiv/generate404 slice-assemble the swap (no replace() string at all, so $-shaped content stays literal with zero escape surface), and a previous pass's data-server-rendered stamp is normalized out. Verified live: rerun over a shipped dist exits 0, and two consecutive passes on the example are byte-identical (idempotent). Timing receipts: cold vs warm full build on the example 6.4s -> 5.6s; a full 8-route rerender over a shipped dist ~2.0s.
- **Hung-hook edge:** postBuild hooks carried a 30-MINUTE execSync timeout (typed wrong once, never tested). Now 30s - the family reference posture: a hung hook may cost the build its runtime, never the deploy; a hook needing longer backgrounds its own work. The timeout test pins real elapsed time (<40s) and the SIGTERM kill signal is recorded in the failure entry so a timeout is distinguishable from a clean nonzero exit.
- The other sweep edges (junk feed/type values, empty injection extras) were already pinned by Pass 48's battery - rerun green.

Gates: 235/235 battery, sync:check byte-identity, packstruct --deep, docs frontmatter+language+truthfulness, fiction signatures, tarball e2e (fresh-project real build) all pass.

## Pass 48 - the open-issues walk: every open issue fixed or earned closed (2026-10-26)

The program: go through ALL open issues, fix in the engine, close with receipts. What landed (each with its own battery in tests/issue-walk.test.js or pinned by existing suites):

- #34/#51/#37/#40 confirmed already landed: `prestruct audit` (grades, duplicate-tag FAIL class, --json/--external/--internal) plus internal linkcheck. Closed with audit verdicts, not re-forked.
- #36 IndexNow: engine/scripts/indexnow.js - key shape validation, generate-once persistence, <key>.txt emission, baked-sitemap submission with --dry-run off-network mode; `prestruct indexnow` verb.
- #41 postBuild hooks: engine/scripts/hooks.js - pipeline-owned chain, runHooks opt-in gate, function-form placeholder substitution, PRESTRUCT_* env hand-off, nonzero exits fail the build.
- #29 RRD-7 hosts: import-analysis interop plugin rewrites named imports into the dual-major namespace form before vite links the externalized CJS graph (the root fix the npm-engine hosts needed).
- #30/#35 JSON-LD: config-driven Organization+WebSite defaults (opt-out), per-route jsonLd with rebuild-idempotent replace + @graph wrapping.
- #49 SEO-gap set: feed autodiscovery, hreflang alternates (route takeover), verification metas, home-only SearchAction, llms.txt (generated-only, `llms: false` opt-out). External link audit was already shipped (#40 sibling).
- #43 ogImageTemplate: engine/scripts/ogimage.js - 1200x630 template renders into dist/og/, optional @resvg/resvg-js skipped loudly when absent, generated for EVERY route pre-loop (a cache-hit route in a vite-cleared dist would otherwise point at a missing og file).
- #42: generate404 no longer special-cases the four text tags - the 404 head rides injectMeta (the same single-line pipeline as every page); only the genuinely-404 contracts remain (home-pointing canonical + noindex + zero-JS strip), all function-replacer form.
- Docs/CI: #28 (checkout/setup-node v7, upload-pages-artifact v4, node 22 in CI lanes, ruby 3.4, jekyll 4.4), #50 (release posts get trailing-slash permalinks + a real layout instead of extensionless bytes), #39 (documented prestruct<->freestruct shared config dialect table), #44 (digest verified, moduleCtx seam already present, nothing to adopt for this repo's bound surface), #47/#55 umbrella receipts.

Lesson (swap-generation trap): baseline slot writes that pick by mtime order silently re-seat stale captures - name by content generation, not by ls -t.

Lesson (feature wiring vs the cache): anything that writes per-route artifacts outside the route loop must run for cache-hit routes too, or the incremental cache compiles a dist that pretends the artifacts exist.

Gates at close: vitest 228/228, sync 9/9 byte-identity, packstruct --deep, docs lint x5, claims scan, example build 8/8 + audit 0/0, and the tarball e2e (second PASS run after a registry blip aborted the first).

---

# TASKS.md -- pass log for prestruct

Working log, not documentation. One section per pass: what was done, what was learned, what the next pass should pick up. Newer passes on top.

---

## Pass 47 - stabilization start: cherry-picks land in-house, the audit goes online in CI (2026-10-26)

The maintainer's program: stabilize prestruct, get the audit online, solve issues, cherry-pick solves into the in-house family. Delivered:

- **Family state re-probed:** gistory main moved 2e0d049 -> d49686f (ferry snapshots + brain-stone mirrors + a new poststruct/eyestruct wordprint transfer stone -- clone ff-pulled). The staging CODE is untouched (bin/cli.mjs not in the diff), so both beta bugs stay open upstream and the trial receipts stand. Target repos unchanged (poststruct 22fc13c / monoforge f8e45fb / eyestruct de0c79d -- still stubs); gistory-sync still E404.
- **Cherry-picked the beta solves INTO poststruct's staging clone (the "solve in house" step):** bin/cli.mjs B1 (leading verb is grammar, not a directory -- `poststruct audit dist` now works; before: "No audit/ directory" exit 2, after: counts {fail:1,warn:4} exit 1 correct) and B2 (--module parsed position-independently; CLI-side filter on finding ids since engine opts only feed the site module; `--module head` -> {fail:0,warn:4} all-head ids, counts recomputed for schema honesty). Battery after patch: self-test PASS 8/8 expected FAIL ids. One-file patch, receipts in labs/issues-stabilization.md Issue 2 for the next ferry/PR.
- **The audit went ONLINE in CI, and the walk caught a real red first:** init's own unconfigured build FAILS the audit (6 fails / 9 warns -- inject-brand skips without ssr.config.js; the shell ships placeholder meta the audit CORRECTLY grades red). Left that red in place where it belongs (a configured site) and restructured: - init/scripts/audit-if-configured.cjs (init-owned, NOT engine-synced): runs scripts/audit.js when ssr.config.js exists -- exit carries through -- and refuses with a NAMED SKIP otherwise. init's build verified green: exit 0 + the skip lines. - test.yml gains the audited gate: the EXAMPLE (tracked configured project) installs + builds + ends in the real audit -- measured locally first per the gates-first rule: **0 failures / 0 warnings, exit 0**. Head regressions now fail CI, not just local builds. - test.yml artifact path fixed (root `dist/` does not exist in this layout -> init/dist/, name init-dist).
- **labs/issues-stabilization.md:** three paste-ready issue bodies -- (1) the CI audit-gate walkthrough for prestruct's tracker; (2) the poststruct B1/B2 patch, battery-proven, ready for the next ferry/PR; (3) the crashtest 1.2.0 bump reminder (mechanized already; read-only CI lane holds since pass 42).

Gates run before commit: battery + sync + packstruct + docs + claims. Next: the remaining open prestruct issues are the feature rows (#35/36/ 39/41/43/49) and the cross-repo ledger -- candidates by value fr(n) are the twin-upstream re-land once the family pushes land.

---

## Pass 46 - gistory report addendum + the prestruct-shapes contract drafted (2026-10-26)

The maintainer asked for new issues recorded into gistory and to continue. Two deliverables shipped:

- **Addendum in labs/gistory-beta-report.md** (the paste-ready issue body): C1 eyestruct CLI ergonomics receipt (flags before the command die with the named UNKNOWN_COMMAND refusal -- feedback, not a bug; the README documents command-first); C2 the gate/ledger conformance receipts from adopting labs/.eyes in OUR repo and running THEIR binaries against it (gate exit 0 on the pending-pin seed; the UNRECORDED/DANGLING_ROW pairing law verified in the contract text); C3 all three trees' own batteries PASS from an independent run (poststruct 8/8 expected FAIL ids, monoforge 5 asserts, eyestruct 15/0/8-skip); C4 the repoparity note (live repos are stubs vs staged trees -- the last-mile push is the online trigger); B4 re-checked, gistory-sync still E404.
- **labs/poststruct-shapes-contract.md: the M1 pack spec, paste-ready upstream.** Encodes the contracts we VERIFIED by cross-running the two engines on the same trees: (1) robots is the OPT-IN contract -- pack robots-checks gate on ctx.robots, sitemap-without-robots on an opted-out site is not a finding (the #1 divergence, would false-FAIL otherwise); (2) the 404 keeps only its noindex contract (prestruct/404-noindex-solo FAILs indexable signals or missing noindex; all other checks skip 404); (3) landed-injection FAIL on shell defaults surviving prerender; (4) data-server-rendered FAIL on routes; (5) deploy-id dup FAIL + freshness warn (idempotent-injection class); (6) og companions from the object form (#38); (7) trailing-slash canonical integrity (#53 class); (8) dead /assets ref FAIL (the stale-restored-cache class). Manifest + ctx-arm + self-audit fixture requirement per poststruct's PRD spec; network/renderer surface deliberately excluded (their fence).

Gates: lint:docs green (language gate over the new prose), vitest 200/200. Next: when the family pushes land, publish the pack ONCE poststruct's M1 loader exists -- this file is the spec, the repo shape follows it.

---

## Pass 45 - ops home adopted at labs/.eyes; third missing-asset finding closes the visual sweep (2026-10-26)

The maintainer's beta heads-up set the ops convention: operational state of this kind lives under labs/ (labs/.eyes, labs/.rig). This pass adopted it and finished the visual surface sweep the pass-44 logo fix started.

- **Second instance of the found class, sharpened.** The docs <head> DOES have a favicon link -- but it was a placeholder data-URI: a generic indigo #4f46e5 tile with a white "P" (system font). Valid data URI, all DOM gates green, NOT our brand -- the og-image escape-soup receipt's direct sibling (loads fine, ships someone else's pixels). Replaced with `<link rel="icon" type="image/svg+xml" href="{{ site.baseurl }}/icon.svg">` -- the exact pattern the sibling fleet layouts use, pointing at the pass-44 mark that now exists and is raster-proven.
- **Sweep closed.** Every site.baseurl asset reference in the layouts resolves to a real file now (header logo + favicon both live at docs/icon.svg); the remaining header icons are inline SVG, not assets. Example-site assets (og-image, webmanifest icons, favicon-32) were verified present in pass 40/44 rounds; no further dangling refs.
- **labs/.eyes adopted, conformance-tested against the real tool.** Seeded to the eyestruct manifest schema (strict subset): pin rows honest -- renderer resvg@2.6.2 (the actually-installed version, the one eyestruct's README names) and browser-image pending@no-pinned-browser-yet (no pinned Chrome exists in this workspace; captures are the pending lane, exactly as the 0.9.0 browserless-spine cut describes); routes seeded for the docs home in dark/light at 1280x800 (path /prestruct/ -- the deployed docs base). Ledger seeded empty ([]). Conformance run with the real binaries: `gate` -> "0 visual artifact(s) all explained by 0 ledger row(s)" exit 0; `ledger list` -> "(empty ledger)" exit 0. First capture rows land when a pinned browser exists (the eyestruct MVP cut wiring).
- **CLI receipt: eyestruct wants the command first** (`eyestruct gate --manifest ...` works; flags before the command die with the named UNKNOWN_COMMAND refusal -- consistent with its "no bare stack traces" contract; usable ergonomics note, nothing to fix in prestruct).
- **labs/.rig: not created.** No local source-of-truth shape exists to conform to (gistory carries none; the rig lock tarballs live in the staging trees' horcrux/). Reserved per the heads-up; it gets folded in the day this repo adopts a rig artifact that needs an ops home.

Gates: lint:docs green with the .eyes seed present (42 prose files); vitest 200/200. Next candidates: wire the .eyes raster receipts to a docs CI lane when the gate spins; poststruct M1 prestruct-shapes contract from pass 40 remains the next real adoption.

---

## Pass 44 - the docs logo shipped, found + proven the beta-eyes way (2026-10-26)

The maintainer reported the docs site shows NO logo and asked for the beta eyes to look at what we have. Findings matched the eyestruct founding receipt exactly, without even needing the browser lane:

- **The bug:** docs/_layouts/default.html:197 loads `<img src="{{ site.baseurl }}/icon.svg" class="brand-logo">` -- and docs/icon.svg DID NOT EXIST. Every page shipped a broken header image plus a 404. Pure asset-chain audit repro'd the user's on-screen finding; the classic "DOM gates green, pixels missing" class the eyestruct PRD was founded on.
- **The fix:** docs/icon.svg created -- a self-contained brand mark riding the og-image brand sheet (accent #c8f000 on the #080808 site dark; three stacked structure slabs, the accent one offset as the "pre" edge). No fonts, no external refs, decorative img contract unchanged (alt="" + aria-hidden, layout untouched -- the file it referenced now exists, which is the whole fix).
- **The beta-eyes verification chain (the method working on its first external repo):** (1) reference-vs-asset audit found the gap; (2) the eyestruct raster gate PASSES the committed mark: strict parse + render + byte-size sanity OK (862 bytes opaque); (3) the honest LOOK: resvg rendered a 128px inspection copy from the same renderer and the pixels were viewed (beta/gistory/icon-render-check.png, since removed) -- accent slab legible, tile matches both themes, no escape-soup. Receipt embedded in the session summary for the record.
- **Scope held:** nothing else moved. The existing .brand-logo CSS sizes it; the layout contract needed a file, and got one that re-rasterizes clean in CI if wired to the eyestruct gate later.

Gates: lint:docs green (frontmatter/language/style/links), vitest 200/200. Next: wire the docs raster gate into CI if the repo adopts the eyestruct spine; poststruct-shapes contract remains the next real adoption (pass 40).

---

## Pass 43 - the betas verified for online: all three trees battery-green, targets measured stub-level, bring-online runbook written (2026-10-26)

The maintainer confirmed the gistory fragments are real repos and wants them online ASAP; "the spec we see is what hits in beta." This pass turned the trial receipts into ship-state proof and the exact last-mile plan.

- **Repos measured (git ls-remote -- API rate-limited, so no-HTTP probes):** dhaupin/poststruct HEAD 22fc13c, dhaupin/monoforge f8e45fb, dhaupin/eyestruct de0c79d -- all LIVE. Deep-1 clones diffed against the staging trees: every target is a 2-6 file scaffold stub, staging carries the real content (53/63/94 files). One push per repo brings each online.
- **Batteries run for real, in the beta clone:** - poststruct `npm test`: self-test PASS -- good corpora clean + bad corpus hits 8/8 expected FAIL ids (the negative test is the product). - monoforge `npm test`: 5-assert self-test PASS -- bad config refused, stray dir refused, stamp ok, unfilled doctor FAIL, refilled PASS. - eyestruct `node --test tests/*.test.js`: 23 tests, 15 pass, 0 fail, 8 SKIP (the browser-capture lane -- honest for the browserless-spine 0.9.0 cut). The raster row refuses without a renderer, exit 2, never fake-passes: contract verified in the suite itself.
- **Sync state:** the beta clone was ff-pulled to 2e0d049 (gistory main); the two commits past 2a92d6c are gistory labs receipts only, so the pass-40 staging receipts stand against current trees.
- **RUNBOOK: labs/gistory-online-plan.md** -- the staged trees + verified spec IS the beta surface; poststruct first, monoforge second, eyestruct third (the family sequencing both PRDs state); then npm bootstrap ladders (manual 0.9.0 then OIDC flip), Pages + docs deploys, and the CI batteries already riding in the staged trees. Small pre-cut nice-to-haves captured: fix the two poststruct CLI bugs BEFORE the bootstrap publish so 0.9.0 never ships with them.
- Restraint held: the runbook is owner-gated (pushes + npm bootstrap need auth this workspace does not have); nothing from beta/ is committed to prestruct -- only the plan + receipts ride in labs/.

Gates re-run green before commit. Next: poststruct bin/cli.mjs one-edit fixes could land upstream with the report; when the pushes happen, the parity table above is the receipt to diff against.

---

## Pass 42 - the house tools walked back at ourselves: CI moved to the read-only lane, id-census declined with a receipt (2026-10-26)

The maintainer's challenge: "did you grab packstruct and crashtest? It'll help you understand it all." Answer: both were already pinned EXACT and in daily use (the gates + the 54-run campaign), so the honest continuation was to walk their full surfaces for capabilities we don't exercise -- and adopt only what can fail.

- **Verified inventory:** `crashtest packs --json` -> one pack, prestruct-proxy v0.4.0, 5 attacks, armedByKey moduleCtx (machine blob clean). `crashtest run --module-plan` -> 54 attack ids, 54 WILL-FIRE / 0 NEEDS-ARMING / 0 SKIPPED-FILTER (the plan is static; the run report is the honest capability ledger).
- **ADOPTED: the CI lane now runs the read-only contract.** The workflow's gate step ran plain `npx crashtest run` -- the READ-WRITE lane, which rewrites labs/crashledger.json + hardening.md + run-meta.json on every CI execution (PRs / forks included). The harness's own docs name the read-only CI mode: `run --expect-baseline <ledger>` (exit rules unchanged; labs/ is diffed, never written). Verified locally before wiring: same 54/54 tally (106 ops / 208 requests), exit 0, and md5sum -c proves labs/crashledger.json + run-meta.json stayed byte-identical -- the run even self-reports "read-only diff - no ledger/report written". The committed ledger stays canonical: cut by bump/canonical runs, diffed by CI. Workflow comment now records the contract and the verification receipt.
- **DECLINED with a receipt: packstruct's `--against` id-collision census.** First try (`--against engine/`) failed honestly: the sweep imports every source file to harvest library ids and hit template artifacts (engine/vite.config.js imports @vitejs/plugin-react -- not runtime-installable), seeding 0 ids and FAILing. The faithful target is the runtime library: `--against engine/scripts/` ran green but seeded 0 library ids -- the engine exports function names (prerender, injectBrand, audit...), not pack-shaped ids, so there is nothing for the census to collide against. A gate that cannot fail is ceremony, not protection; lint:packs stays `lint --deep` (which DOES fail: manifest-vs-disk conformance, the crashtest#16 class). Recorded so the next host that ships a module library adopts it knowingly.
- **Boundary learned (the packstruct --against semantics):** the census imports candidate sources to enumerate ids. Directories that mix runtime library code with template/build artifacts will false-FAIL on the first import-dep-less file -- pass a runtime-only dir, and expect 0 seeds to mean "no library id space", not "pass".

Gates re-run green before commit. Next: crashtest:bump 1.2.0 when it ships; the poststruct M1 prestruct-shapes contract from pass 40 stays the next real adoption.

---

## Pass 41 - the gistory beta report ships paste-ready; write-auth probes failed honestly (2026-10-26)

The maintainer asked for the beta findings reported to dhaupin/gistory. Both write paths probed before accepting the paste-ready route:

- **GitHub issues API: 403** (anonymous, IP rate-limited; no token exists in this workspace -- the server-managed credentials reach only the cloud_git tool for the connected prestruct repo).
- **Git push probe: no credentials.** Anonymous HTTPS push refused with "could not read Username" from a scratch clone with a probe-only empty commit (cleaned up after; never left /tmp).

So the report rides paste-ready, the fleet's established handoff convention (labs/flowforge-shim-retirement-issue.md precedent): full issue body at labs/gistory-beta-report.md -- title + body ready to paste into a dhaupin/gistory issue. Contents: the four POSITIVE feedback receipts (refusal-name contracts held incl. MISSING_RENDER/RASTER_BAD_XML; eyestruct raster PASS on our og-image.svg at 55,462 bytes opaque; monoforge's doctor battery surfaced one real prestruct gap we closed same-day (the publish 0.x refusal); shared-audit WARN-ladder agreement with the one robots-opt-in divergence documented for prestruct-shapes) + the four actionable findings (B1 poststruct CLI swallows the audit verb so the README form cannot work; B2 poststruct --module parsed as comma-operator, forever null; B3 monoforge doctor false-positive classes -- exports glob-unaware, files-path blind to negation, walkFiles ignores .gitignore; B4 gistory README advertises `npm i gistory-sync` which is E404 on the registry -- engine exists only in the repo tree, the manual 0.9.0 ladder has not fired).

House style kept: findings carry the exact failing line from the beta tree and a one-line fix shape, so each is a copy-edit not a hunt. When the maintainer (or any session with GitHub write auth) pastes the report, this pass's ledger entry is the receipt that it was prepared and verified.

Gates re-run green before commit. Next: when poststruct's M1 opens, draft prestruct-shapes from the pass-40 divergence notes (robots opt-in contract first).

---

## Pass 40 - the gistory betas pulled; their premises exercised against prestruct (2026-10-26)

The maintainer's ask: pull dhaupin/gistory's three nested staging betas (poststruct, monoforge, eyestruct -- all struct-family siblings) and exercise prestruct to support their premises. Clone lives at gitignored beta/gistory (outside the prod workflow; nothing from it is committed). Full receipts: labs/beta-gistory-trial.md.

- **poststruct (audit-what-shipped leg).** Its engine audited prestruct's baked init/dist: 1 FAIL (robots missing) + 4 WARN; prestruct audit on the SAME tree: 0 FAIL + 4 aligned WARNs. The one divergence is prestruct's documented robots opt-in contract (engine-graded only when config.robots is set) -- recorded as the contract the future prestruct-shapes pack must carry, so the pack never false-FAILs a deliberate robots opt-out.
- **poststruct beta bugs found (paste-ready upstream):** the documented `poststruct audit dist` form cannot work -- bin/cli.mjs swallows the `audit` verb as the dir argument, so the real invocation must drop the verb; the `--module` flag is parsed as `(args.find(...), null)` (comma operator) and is always null. The engine itself works; the CLI wrapper lies about the README contract.
- **monoforge (the factory doctor).** Scoped run (beta stashed): 5 FAIL + 1 WARN. CLOSED the one honest gap: prestruct's publish.yml now refuses v0.* tags with a named error -- the family ladder premise (0.x is the manual-bootstrap era; the OIDC lane publishes 1.0.0+ only), same contract the doctor checks. The other four are doctor false-positive classes (exports `./engine/*` glob-unaware; files-path blind to `!`-negation excludes; walkFiles ignores .gitignore so untracked scratch hit the dash law; all their rows pointed at the beta clone -- prestruct's own prose is dash-clean). Hand upstream as paste-ready findings, not prestruct bends.
- **eyestruct (the visual-ledger leg).** Raster gate PASS on prestruct's shipped og-image.svg (55,462 bytes opaque) -- the pass-32 rasterization discipline already satisfies the committed-visual-artifact premise. Two bonus receipts for THEIR contract: the PNG was refused as RASTER_BAD_XML (named reason, no crash -- receipt 4 as designed) and the gate's MISSING_RENDER refusal before the optional renderer was installed (capability gaps exit 2 with a name). `@resvg/resvg-js` installed --no-save inside the beta tree only.
- **Honest beta state:** gistory-sync is NOT on npm (registry 404) despite the README install line -- the engine exists in the repo tree only; the manual 0.9.0 ladder has not fired. The staging CLIs are zero-dep and ran with plain node; nothing touched prestruct's dep tree.

Gates: publish.yml is a workflow-file change only (no runtime surface); the 5 pre-push gates re-ran green before commit. Next: paste the poststruct CLI bug + monoforge doctor false-positive findings upstream when write auth exists; revisit when poststruct's M1 ships -- `prestruct-shapes` is our first customer and the shapes are now specified from exercise receipts.

---

## Pass 39 - release button-up sweep, freestruct-round style (2026-10-26)

The maintainer asked for the freestruct release cadence checked and mirrored ("check their commits -- they did a ton of rounds"). Pulled the freestruct commit history (API, last ~40) and mapped its release pattern onto prestruct: version sweep, issue-board sweep to receipts, docs-uniformity sweeps, a pre-tag gate with fresh pins, and a pre-tag announcement draft.

- **The one real version-truth bug found: the tarball count claims said 35 files -- the pack is actually 37 now** (audit.js joined bin/engine/init when pass 33 shipped the audit verb). README's "install test from the registry tarball (35 files)" and AGENTS.md's "(35 files / ~57KB is the expected size)" were both stale. README now says 37 with the reason inline; AGENTS.md keeps history but pins the rule: verify against the CURRENT whitelist, not the recorded number. Measured, not assumed: `npm pack --dry-run` reports total files: 37 + integrity hash.
- **CHANGELOG's Unreleased stanza was missing the pass-36 proxy hardening** (the file's contract is "what cherry-pickers must act on", and the template proxy pair IS shipped payload). Added a "Proxy pair hardening (template scripts)" group: name-filtered VPS eviction + PRESTRUCT_CACHE_MAX_MB, Worker hashed-key fallback, and the pack's poisoned oversized-legacy probe as the CI-catchable regression tripwire.
- **Docs mirrored to main's truth:** docs/guides/changelog.md gained the Unreleased stanza (condensed, action-per-row); docs/guides/roadmap.md gains a "Shipped on main, ahead of the tag (1.2.0 state)" list and its pack row moves v0.3.0 -> v0.4.0 (with the seeded shapes described, not just counted); labs/prd-prestruct.md's Adversarial QA row likewise.
- **Announcement draft added: docs/discussions/announcing-v1.2.0.md**, in the shipped v1.0.0/v1.1.0 format (frontmatter + layout:none) marked draft-until-tag. It answers #50's question in passing: the existing announcement pages already use layout:none + extensionless permalink, so "release post ships as bytes, not a page" is already the pattern -- close-able if the owner agrees.
- **Issue board sweep:** 20 open; the closeout ledger's 8 paste-ready receipts (#34 #37 #38 #40 #31 #51 #29 #42) re-verified against shipped screens (audit verb + flags in bin/cli.mjs, ogImage object form in inject-brand/validate-config + battery pins) -- still accurate, GitHub write auth still not available in this workspace. #55/#47 stay open as cross-repo ledgers; #28/#50 are CI/docs items; feature rows #35/#36/#39/ #41/#43/#49 remain the twin-pack reference phase.
- **Glyph sweep:** the only emoji in md source are the two section markers inside labs/hardening.md -- those are the crashtest harness's own regenerated report format, not authored prose; rewriting them would fight every future run.

Gates: vitest 200/200, sync:check, packstruct --deep, docs frontmatter/language/truthfulness (27 pages), claims scan, all green. No template-behavior change on this pass -- the tarball battery is not re-run per the AGENTS gate list (only the 5 gates run before every push).

Next: owner actions are the tracker closes (paste-ready), the v1.2.0 tag when ready, and the twin-pack PR to freestruct -- after which #47/#55 and the roadmap "cross-repo" rows collapse to a single receipt post.

---

## Pass 38 - crashtest hard run + the pack covers the hashed-key contract (2026-10-26)

"Run prestruct hard" round: the harness (pinned crashtest 1.1.0) fired full against the deployed proxy pair, and the packs/ fixture got the one coverage gap it still had.

- **First full run held: 54/54 REFUSED, 0 EXPLOITED, 0 BOUNDED** (99 ops / 206 requests). All five prestruct-proxy contract shapes REFUSED on both runtimes; every harness module without a declared route degraded to its honest vocabulary skip -- no false positives.
- **Coverage gap closed: cache-key-variant-parity never attacked the hashed key shape.** The pack's seeding derived keys "from the documented format" -- but only the legacy `prestruct:<encodeURIComponent(url)>` shape, so the pass-36 hashed-key fallback (oversized keys -> `prestruct:sha256:<hex>`) shipped un-adversaried; a regression that reverted the fallback could not be caught. The pack (now v0.4.0) seeds a third oversized-query variant under BOTH shapes with opposed markers: the hashed key carries the variant's real bytes, the legacy key is POISONED -- serving the poison proves the legacy key is still in play (real KV rejects that key outright, so in production this is the 500-on-response-path class). A proxy that predates the fallback yields the honest "seed not consulted" skip, never a fake pass. VPS side seeds the same variant under its full-URL SHA-256 filename scheme (no cap there -- it must behave like its siblings).
- **Small ledger lesson:** the verdict detail hardcoded "2 URL variants"; after three variants and a poisoned probe, the detail strings now compute variantCount and name the poisoned probe explicitly -- run reports must describe what actually ran, not what used to run.
- Gates: determinism lint flat (node:crypto SHA-256 == WebCrypto digest, so the key derivation in the pack is seeded and deterministic), packstruct --deep censused the extended module, vitest 200/200, sync:check, lint:docs, lint:claims all green. Harness re-run: 3 variants x 2 surfaces, 54/54 REFUSED, 0 new / 0 regressed (106 ops / 208 requests).

Next: when crashtest 1.2.0 ships, `npm run crashtest:bump 1.2.0` (pin + run
+ ledger regen in one commit) and re-diff the baseline. The remaining pack shape worth considering: a REFUSED-over-time probe for the VPS TTL knob if it ever becomes env-configurable like the Worker's CACHE_TTL_SECONDS.

---
---

## Pass 37 - fine-grained assets: deploy/runtime units + scaffold statics + the docs the guides lead to (2026-10-26)

After pass 36 closed the proxy pair, the noted remainder was "fine-grained assets." Walked them: pm2 ecosystem.cjs, systemd unit, wrangler.toml, proxy.package.json, init/ssr.config.example.js, init/index.html, init/.gitignore/.npmignore, init/public/_headers + _redirects, example/public/_headers + _redirects (plus llms.txt, site.webmanifest), and README-proxy.md end to end against the shipped code.

- **README-proxy.md told VPS operators to put the cache-refresh secret INTO ssr.config.js.** Step 7 ("Update ssr.config.js") showed `secret: 'a-long-random-string'` as a config field, with the Worker section doing the same line ("same value as wrangler secret"). That contradicts every shipped contract: ssr.config.example.js, config.md, api.md, migration.md ("a config proxy.secret was never read") and AGENTS.md all state the secret is the PRESTRUCT_SECRET env var -- a config-side key is silently ignored AND the example invited committing a shared secret to the repo. Both block examples rewritten: config uses `url`/`targetUrl`/`botList` only, with an explicit env-or-wrangler-secret note in each. Sweep for the same pattern (`proxy.secret` / a quoted `secret:` value): the only remaining matches are the migration note and a test pinning the retired key's absence -- correct usages both.
- Everything else clean, and cross-checked rather than assumed: the systemd unit referenced by ecosystem.cjs exists (scripts/prestruct-proxy.service, env-file pattern, hardening features intact); wrangler.toml's CACHE_TTL_SECONDS IS read by the Worker (`env.CACHE_TTL_SECONDS || '86400'`); the scaffold _headers/_redirects carry all the AGENTS.md lessons and no `*.js`/`*.css` glob rules and no SPA fallback; the init/.npmignore backstop matches the disk-state lesson.
- Boundary noted (not fixed, deliberate): proxy.package.json pins @cloudflare/puppeteer as a devDependency -- correct for the VPS install surface (the server never imports it; proxy.worker.js loads it lazily and only on Worker deploys), but the pinned version predates current CF Browser Rendering API guidance. Left alone: bumping without a Workers Paid project to deploy against is untestable here. Next pass with a live Worker project should verify the pin and raise it.

Gates: vitest 200/200 (12 files), sync:check byte-identity, packstruct --deep, lint:docs (frontmatter/language/truthfulness), lint:claims, tarball e2e all green (deps reinstalled via npm ci after the runner restart wiped node_modules -- passing results from earlier turns do not carry).

Next: the engine's remaining fine-grained assets worth a source walk are the crashtest.config.js harness itself and the packs/ fixtures (packstruct -- deep sweeps behavior, but nobody has stepped through fixture intent); then a docs assets pass for the docs-site partials beyond the frame.

---
---

## Pass 36 - every surface: the proxy pair walked, three findings fixed + pinned (2026-10-26)

Continued the walk to the remaining surfaces: engine stragglers (clean), vite configs (clean), and the proxy pair -- the biggest un-walked surface (init-owned, crashtest-covered but never source-walked).

- **VPS cleanupCache deleted ANY file in the cache dir.** readdirSync'd the whole directory and evicted the OLDEST FILES whatever they were -- with the documented PRESTRUCT_CACHE_DIR override, an operator mounting a shared/large directory could have NON-PROXY files deleted once the dir crossed the size cap. Eviction now touches only cache-shaped files (64-hex `.html` from cacheWrite); decoys survive. The size cap became an env knob (PRESTRUCT_CACHE_MAX_MB, default 500) so small-disk operators can reach eviction behavior and tests can exercise real eviction without a 500MB fixture. Also fixed the ops log: the old line printed the REMAINING count as "removed" -- a misleading signal during incidents.
- **Worker KV key could still blow the 512-byte cap.** Long query strings overflowed `prestruct:` + encodeURIComponent, and the put/get REJECTS would turn an already-successful render into a post-render 500. cacheKeyFor(): legacy encoding stays the key for every normal URL (byte-identical existing cache entries); only oversized keys fall back to SHA-256 hex under a shape-tagged prefix (collision-proof per the shared cache-key lesson). fetch() wired to it.
- **Pins.** tests/proxy-cleanup.test.js imports the proxy lazily with the env overrides already set (CACHE_DIR is import-time) and exercises real eviction: 8 x 200KB cache files + 1MB cap -> oldest evicted, newest survives, decoys untouched (the first attempt taught us the honest corollary: decoy sizes no longer COUNT toward the cache total once the filter is in -- which is exactly correct). Worker cacheKeyFor pins: legacy key parity for normal URLs, hashed fallback shape + determinism for oversized.
- Harness lessons recorded: `await` inside a non-async function killed proxy.test.js's whole file compile; a 1.2MB decoy over the 80% floor evicts ALL cache files (boundary-case behavior worth knowing before pointing the override at a shared dir).
- vite.config pair + remaining engine stragglers (inject-brand CLI wrapper, prerender stats/cache-tail, islands): walked, nothing to change.

Acceptance: proxy suites 24/24, full battery + e2e gates below; commit follows.

---

## Pass 35 - engine walk + issue close-out + freestruct round 2 (2026-10-26)

The maintainer's ask: close the issues, more freestruct rounds, walk the engine for bugs/gaps/edges/vulns.

- **Engine walk findings (both fixed + pinned).** (1) `mergeRoutes` died mid-build on a non-object route (null / bare string from a CMS mapping) with an obscure `Cannot read properties of undefined (reading 'path')` far from its cause. validate-config flags these, but a non-STRICT build still reaches the merge -- the downstream posture is skip-LOUD per entry, valid routes keep rendering. (2) The 404 CTA href accepted scheme-shaped values post-escapeXml: escapeXml fixes the attribute-breaking class, but a `javascript:/data:` destination ships as a WORKING script href on the one page whose whole contract is zero JS. Scheme allowlist (relative, http(s), mailto:, tel:, hash) with '/' fallback + quote-escape casing pinned.
- **Freestruct round 2 (probes through the patched vendored tree).** checkLinks root-relative/pretty contracts green; computeBuildHash rerun-stable + content-moving + 404-free; indexnow harvest + key gate green; cross-validation on a broken fixture graded the same FAIL classes as ours; the 404 pipeline stamps noindex + full treatment. All green -- and the probes found a real their-side bug: the CONFIGLESS audit crashed (`config.twitter` on null, while their own cmdAudit passes null deliberately, contradicting their help text). Patched upstream as 0004 (`config?.twitter?.username`), verified grading. We never carried the class (our remap dropped handle grading) -- twins covering blind spots, again. Pack README/PR draft updated.
- **Issue ledger.** labs/issues-closeout.md: 8 issues ready to close with paste-ready evidence comments (#34 #37 #38 #40 #31 #51 #29 and #42 as designed-out); feature/roadmap rows stay open with better pointers. No gh auth in this workspace, so closing is a paste (or wire gh auth).

---

## Pass 34 - the twin pack: prestruct's remaining fixes upstreamed to freestruct (2026-10-26)

The maintainer's ask: the twins need each other -- everything prestruct did should reach freestruct too. Full freestruct engine reads made the delta small and exact: their audit, xmllike lastmod, assertXmlSafe, stable build hash, og object form and companions already carry the family mechanics (most arrived FROM our side). Two real gaps remained:

- **AEO robots preset port (0001+0002).** Their generateRobots always writes `User-agent: *`. Ported 1b5f36d 1:1: config `robots: { aeo: true, aiBots: 'block'|'allow' }` groups the 6 search-surface bots (Allow) and the 5 training crawlers (verdict), Sitemap pointer last; 'robots' joins their KNOWN_CONFIG_KEYS with warn-ladder shape diagnostics. Contract pinned in the port comments: absent/true = BYTE-identical today-output (their robots is engine-owned, unlike ours), and the bot lists must never drift between twins (one side adds a bot, both commits).
- **og:image:secure_url port (0003).** Their companion builder gains the one-line upgrade: http-only sources carry the https variant; https sources ship nothing redundant; per-page overrides stay wholesale (no companions on override).
- **Verification.** Direct engine calls against the patched vendored 1.1.0 tree: robots default byte-stable + full aeo block + aiBots flip; diagnostics warn exactly once on bad shapes and zero false-fires on valid ones; injectPage secure_url/companion/override triangle green. Harness lesson recorded for their tracker: injectPage reads the page MODEL's html -- a disk-only per-page override comment is invisible (two false test failures before that was straightened out).
- **Artifacts.** labs/freestruct-upstream/: parity table README (both directions, plus the deliberate non-ports and why), three unified diffs against engine/ 1.1.0 hunk-anchored on stable lines, pristine copies for re-diffing if 1.2.0 lands first, paste-ready PR post.
- Acceptance: prestruct gates untouched (battery/gates rerun below); no prestruct-side engine change in this pass.

---

## Pass 33 - the family audit adopted: `prestruct audit` is ours now (2026-10-26)

The maintainer's ask: we do not actually have our own audit (validate-config is pre-build only; everything post-build was graded by borrowed freestruct installs) -- so read freestruct fully and make the audit ours. Adopted, not copied: the FAIL/WARN ladder ports, but every grade remaps onto OUR contract's honest shapes.

- **`engine/scripts/audit.js` + `prestruct audit` CLI verb.** Same shape the family shares (fails/warns/pages/sitemapLocs, --json digest, capture mode) so shared tooling keeps working against either engine. Our remaps: twitter:site/creator never graded (prestruct ships no handle config and never emits them); robots.txt graded ONLY when `config.robots` is set (the author-owned public/robots.txt is never engine-touched, so grading its absence would punish contract-abiding output); og:image companion hint points at OUR object form; SVG trap stays FAIL. Building blocks kept from the freestruct port: attribute-order-tolerant grabMeta, the duplicate-tag probe (guards the rebuild/strip contract), disk-existence WARNs (site-local CDNs stay valid), the code-payload-stripped link walker (their Pass 26.14 lesson -- our example is code-heavy and the naive scan lit up). Flags: --json / --external (HEAD->GET, 50-cap, warn-grade) / --internal (warn grade always: a link to a never-prerendered dynamic route is a gap, not a failure). CLI verb added to bin/cli.mjs + help; works configless.
- **Manufacturing adoptions from their xmllike.js/scan.js:** (1) `assertXmlSafe` loud-fail for sitemap fields -- control characters cannot appear in XML and escaping cannot save them; refuse instead of shipping a corrupt sitemap that reads green. (2) Honest per-route `<lastmod>`: the universal build stamp moved every lastmod every build; now each route carries its dist file's mtime, and byte-identical cache-hit rewrites SKIP the write so the mtime stays the content-change date. Verified in the unit battery (mtime rides, fallback stamps, control-char refusal).
- **Wired as the last mile of every template build:** init/ + example `build` scripts end in `node scripts/audit.js` (main-module runner with the freestruct realpath lesson -- raw argv[1] matching silently skipped symlinked installs). A regression now fails the build, which is what the audit is FOR. Example build: 9 pages, 0 failures, 0 warnings, first run.
- **Sync contract extended:** audit.js joined sync-engine.mjs's CONTRACT, tests/qc.test.mjs's two lists, and engine-sync-check.yml (13 generated files now, was 11).
- **Docs:** cli.md documents the verb (FAIL vs WARN rows, the three flags) and the new build-script last mile; CHANGELOG Unreleased carries both entry classes (audit + sitemap changes) with cherry-picker actions.
- Acceptance at close: battery 190/190 (24 new audit tests + sitemap assertions), sync:check green over the extended contract, e2e tarball walk green WITH the audit in the packaged build script, packstruct/docs/ claims gates pending final run. Pack v0.3.0 unchanged (proxy surface).

---

## Pass 32 - freestruct-audit-driven: ogImage object form + committed og raster (2026-10-26)

The maintainer's ask: run every audit we have against ourselves, fix what surfaces, update packs, push.

- **Harness + audit inputs.** `npx crashtest run` (exact-pin 1.1.0 lane): 54/54 REFUSED, 0 EXPLOITED, 0 new/0 regressed -- stamp reset to today. freestruct 1.1.0 `auditOutput` on a fresh example build: every page graded the same two facts -- og:image FAIL (the svg source passed as the social url) and og:image:width/height/alt WARN. Both facts match our proposals #31/#38 word-for-word, so the freestruct run doubles as the evidence pass for closing them.
- **og raster.** Social scrapers still need a raster, and the VM has no system fonts, so tofu went probabilistic the first try. Fixed the way freestruct's ogimage.js solves it: explicit TTF buffers into `@resvg/resvg-js`. `example/tools/{render-og.mjs,fonts/}` render public/og-image.svg -> committed public/og-image.png (1200x630, 113KB, Geist 400/600/800 + Geist Mono 400/600, OFL). Rerun once per design change; SVG stays the source of truth.
- **Engine: ogImage object form.** `inject-brand.js` now accepts the string shorthand (unchanged, zero companions) AND `{ url, width, height, alt, type }`, emitting only the companions that validate at the seam (digits-only width/height, string alt/type; secure_url emitted only to upgrade an http source). `prerender.js injectMeta` resolves objects through `.url` on both the global and route value (the literal "[object Object]" corruption path is closed). `validate-config.js` grades the object shape. New inject-brand block: six cases including the junk-companion drop and the alt-escape; suite 31/31.
- **Example wired.** `ssr.config.js` ogImage -> the object form pointing at og-image.png. Rebuilt 8/8; the prerendered head now carries the full companion set. freestruct audit rerun: **0 failures, 0 warnings, 9 pages** -- first fully green external audit grade on our own output.
- **Docs + PRD.** config.md gained the "ogImage: string or object" section; PRD surface table row updated (config keys + example audit state).
- **A sync-discipline trap recorded.** Forgetting `node scripts/sync-engine.mjs` after the engine edit made the example build say `content="[object Object]"` -- the generated copies are the deployed behavior, engine edits alone are inert. The sync:check gate catches drift, but only on push; during a session, run sync before every example build.
- Acceptance: vitest 166/166, qc engine-sync green, e2e tarball walk green (see pass-closing run below), packs v0.3.0 unchanged (proxy shapes; the og form is build-surface, which stays out of the proxy pack per R5).

---

## Pass 31 - flowforge theme adopted (docs + example); shim-retirement issue drafted (2026-10-26)

The maintainer's ask: family parity on the theme (flowforge's is better and newer), plus a heads-up to flowforge that their repair-404 shim can retire once a prestruct release carries the Pass 28 fix.

- **/docs adopts the flowforge rig wholesale.** `docs/_layouts/default.html` is now the flowforge docs layout with a brand-data-only diff: theme key `prestruct-theme`, brand split `pre|struct`, dhaupin/prestruct links, prestruct footer identity, the prestruct baked SEO head kept (departure: no freestruct engine on these docs), and the K shortcut rendered by CSS (`.search-key::after`) so pagefind never indexes hint text - our Pass-7-era lesson rides into the adopted frame. `site.data.nav` already had the exact group shape the rig consumes; the sidebar lit up from it unmodified. Prism scripts left with the old frame (kramdown/rouge is the highlighter; the rig's Rouge token colors replaced dead client-side prism CSS).
- **/example adopts the family token sheet.** `example/src/index.css` now declares the web styles.css tokens (`--paper/--surface/--raised/--ink/ --ink-soft/--accent/--accent-deep/--moss/--err/--line/--code-bg/--nav-bg/ --accent-contrast`) with the one-sheet-wins values, light block mirrored; ALL pre-hoc hex hardcodes are now tokens, including the syntax-token spans (.tok-*/.hl-*/.vsw-*) remapped to the rig's Rouge vocabulary and the button pair (#d4ff00/#080808 -> accent + accent-contrast). Toggle: key `prestruct-theme` (one key repo-wide), dark default per family convention; `example/index.html` gained the no-flash inline bootstrap (before first paint, before the bundle) + media-split theme-color metas.
- **The issue draft.** `labs/flowforge-shim-retirement-issue.md` tells flowforge their `repair-404.cjs` workaround for prestruct#33 can retire at their pin bump once 1.2.0 ships (their MANIFEST pins the retirement to exactly that event). This workspace has no GitHub write auth for the flowforge tracker, so the draft is a paste-ready handoff (same shape as the family's cross-repo posts).
- **Acceptance checks.** Example: full build 8/8, prerendered index carries the bootstrap + media theme-colors, shipped CSS carries the family values (grep-based, since the CSS is token-sourced). Docs gates: style/links/ frontmatter/language/truthfulness all PASS on the swapped layout. Ruby is not installed in this VM, so the Jekyll render itself stays verified by CI's docs build (the same split as every docs-frame change to date).
- **Note for future self:** the docs-side light tokens were transcribed from the flowforge web sheet; if flowforge reconciles its doc-sheet values to the web sheet again (their MANIFEST tracks that), re-cut the two blocks here in the same commit as their receipt bump.

Gates: battery untouched (no engine change), docs suite PASS, example build 8/8 with dist inspected.

---

## Pass 30 - docs-frame defect pair + convention amendments (2026-10-26)

Second ledger pass; all four are docs-side, all verifiable with the docs gates.

- **#46:** the dead prism line-numbers pair in `docs/_layouts/default.html` (CDN link + orphan `.line-numbers-rows` support block) deleted. Only `prism.min.js` + `prism-autoloader.min.js` load; autoloader never loads plugins and no rule ever adds the `line-numbers` class, so both removals are no-ops by construction -- same proof the freestruct#17 reference fix carried on its own docs.
- **#32:** the classic `<script src="pagefind/pagefind.js">` deleted from the layout. The Pagefind 1.5.x bundle is ESM, so the classic tag threw `import.meta outside a module` on every built docs page before any app code ran, and murdered whatever executed after it in the file. The dynamic `await import()` inside `doSearch()` is the whole loader (it already worked); a comment at the site of the old tag names the bug class.
- **#45:** both announcement posts reshape to the crashtest "file IS the post" convention: wrapper prose and the nested `~~~md` block are gone, frontmatter + body only -- GitHub view-source and copy-raw now yield the post verbatim. Root README gains the direct Creadev.org workshop link, matching packstruct's line.
- **#48:** both posts re-flowed -- no more hand-wrapped ~72-char prose in paste-to-Discussions documents (one flowing line per paragraph); fences, bullet items, tables and headings keep their shapes. The transform was a scratch script applied once, reviewed by diff, not a keeper.
- **Flowforge crosslink noted, not worked here:** flowforge's `scripts/repair-404.cjs` receipt is a public workaround for exactly the #33 defect closed in Pass 28, with its retirement pinned to the upstream release that carries it. Nothing to change in this repo for that -- but it makes tagging prestruct 1.2.0 the unlock for flowforge's own pin bump.

Gates: docs style/links/frontmatter/language/truthfulness PASS, fiction scan PASS. Engine untouched; no template-visible change, no e2e needed.

---

## Pass 29 - crashtest 1.1.0 adopted; harness upgrades become one command (2026-10-26)

The maintainer's request: crashtest moves fast (1.1.0 shipped, 1.2 next) -- make the repo's pinned lane update-friendly instead of a manual four-file ballet.

- **The mechanism.** `npm run crashtest:bump <version>` (`scripts/crashtest-bump.mjs`): registry existence check -> exact devDep install -> harness run (regenerates labs/; nonzero exit stops) -> verifies `labs/run-meta.json.crashtestVersion == target` -> prints tally + baseline diff + the one-commit checklist. Exit codes: 0 ok, 1 stage failure, 2 usage.
- **The invariant got teeth.** tests/qc.test.mjs gains "crashtest devDep pin equals the committed ledger stamp" -- a half-bump (pin moved, ledger stale, or a manual npx run that rewrote the stamp) now fails the battery on main instead of silently re-scoping the gate. This is pass 26's floating-@1 lesson enforced structurally, not by memory.
- **Real adoption run (the proof it works):** `crashtest:bump 1.1.0` -> pin 1.0.0 -> 1.1.0, tally 54/54 REFUSED / 0 EXPLOITED, baseline 0 new / 0 regressed, devDep pin == ledger stamp == 1.1.0. The ledger diff is a PURE addition: 19 governance/memory skip rows (undeclared-vocabulary knobs), zero verdict changes among the original 35. The QC parity test passes on the new tree.
- **Why adopting 1.1.0 is safe now but wasn't a demand before:** its 19 new rows remain permanent skip rows for knobs this target never declares -- zero applicable-coverage gain, which is what pass 26 declined to chase. The difference after this pass is that the bump is cheap enough that the ledger tracks the harness line instead of defending a pin it no longer benefits from. 1.2.0 lands the same way: one command, one commit.
- **Doc truths swept:** workflow header (pin rationale now names the bump command), packs/README, CHANGELOG Unreleased stanza, PRD Adversarial-QA row (35/35@1.0.0 -> 54/54@1.1.0 + bump command), roadmap ledger line. Found-and-fixed in the same sweep: README's layout table still said the pack was v0.2.0 (shipped v0.3.0 for four passes) -- a stale-truth miss the truthfulness gate does not cover because it can't know pack versions.

Gates: battery (qc now 7 tests), sync untouched (no engine change), lint:packs/docs/claims, and the bump's own harness run recorded above.

---

## Pass 28 - issue-ledger workday: #33 #53 #54 #52 solved; crashtest+packstruct npm hookup; 1.2.0 ladder (2026-10-26)

First pass driven by the GitHub issue ledger (28 open at start). Four actionable defect classes ported from the freestruct cross-walks (#47/#54 are evidence posts), one pack-spec hookup the maintainer asked for, and two regression-surface findings found while working. Feature proposals (#28 #29 #31 #34-#43 #49-#51) left open - roadmap rows, not this pass.

- **#33 (proven live against npm 1.1.0): generate404 shipped $1/$2 garbage.** Function replacers use their return value LITERALLY; the four head-tag lines on dist/404.html were `$1Page Not Found | Site$2` shaped and the og:title/twitter:title/description/canonical tags were gone. Fixed with group-aware callbacks ((m, a, b) => `${a}value${b}`). Same lesson, inverse direction of the pass-9 $-expansion family. Pinned by a test asserting no $1/$2 ever lands and the tags carry real values. NOTE: our own Pass 27 log line and the shipped 1.1.0 both carried this the moment generate404() was rewritten; nothing in the battery caught it because every prior 404 test asserted a substring that survives the $1 prefix.
- **#53 (proven live): trailing-slash siteUrl doubled the canonical.** `siteUrl: 'https://x/'` produced `https://x//` on every page's canonical + og:url (inject-brand), sitemap locs, prerendered metas, and the client-side usePageMeta base -- while robots.txt already stripped, which made the miss look premeditated. Normalized at the five consumption seams with one repeated regex and a #53 pointer comment (freestruct's canonicalBase is the reference shape). Roots of trust: the config stays validated as-is, the JOIN normalizes.
- **#54 (the flag half): unknown dash-word CLI flags exit 1 loudly.** `prestruct build --Force` used to ride silently as an ignored token: checkFlags() now refuses with the supported-flag list, --help is first-class on every subcommand, and the passthrough test pins --force/-f/--clean still green. The source-tree-injection half is N/A for prestruct by construction: inject-brand is hardwired to <workdir>/dist and init is never-clobber - the wrong-tree damage class has no reachable seam here. Pinned in tests/cli.test.js (6 tests, spawned-process).
- **#52: unknown/retired config-key warnings.** validate-config.js exports KNOWN_CONFIG_KEYS + RETIRED_CONFIG_KEYS (empty today: no shipped key was ever retired without a seam) and configKeyWarnings(); the CLI's report() prints `[prestruct] config warning: ...` during build/validate. Diagnostics, not gates: a typo'd key can never silently no-op again, and a green build stays green. ISSUE #52's sub-note ("the pack never runs in CI") was already shipped by pass 25's crashtest.yml - no rework.
- **crashtest + packstruct npm hookup (maintainer request).** devDependencies now pin BOTH tools EXACTLY: crashtest@1.0.0 (the ledger's harness - the pass-26 pin becomes the devDep itself, CI runs `npx crashtest`, no --yes fetch, no float) and packstruct@1.0.0. New gate `npm run lint:packs` = `packstruct lint packs/ --deep` (current pack: 1 pack checked, 1 module probed, 6 ids censused, CLEAN). Wired into crashtest.yml before the harness step: a pack manifest declaring an entry that does not ship dies at lint time (crashtest#16 class). AGENTS gates list and packs/README updated. The full harness run also re-verified 35/35 REFUSED / 0 new / 0 regressed from the local devDep.
- **Version ladder -> 1.2.0** (root pkg == init pkg == init/VERSION); the CHANGELOG gains the Unreleased stanza with all four defect classes written for cherry-pickers; CHANGELOG-maintained release truths updated. Propsals and roadmap rows untouched.
- **Blockers deferred to the next pass:** #29 (rrd v7 hosts die at ssrLoadModule) needs the dual-mount engine layout work; #28 is a platform-matrix; #34/#51 the audit command surface - all real, all bigger than this pass, all now have recorded evaluation notes.

Gates: battery (full run recorded below), sync, lint:packs, lint:docs, lint:claims, init build, example build, tarball e2e - statuses brought to green in the commit that carries this entry.

---

## Pass 27 - dotall-trap fix: `[^"\r\n]` on 15 HTML-tag replacements, live mangle proven (2026-10-26)

Issue-hunting pass. The gates were green (147/147 + docs/claims), so the search went line-by-line against the repo's own battle lessons. Result: the title-regex dotall lesson from pass 7 was applied to exactly ONE regex of its class -- the eight `injectMeta` meta-tag replacements, the four `generate404` head replacements, and the script/modulepreload strips kept the unfixed shape.

- **The defect.** `content="[^"]*"` + `/s` can pair a prose fragment with a closing quote far below: any shell comment like `<!-- <meta property="og:title" content=" -->` made the og:title replacement start ON THE COMMENT and consume through the real tag's closing quote, landing the new title inside the comment and shredding the real tag's opener. Proven live BEFORE the fix: a shell with a commented og:title note produced `<meta property="og:title" content="My Route | Site"og:title" content="Real Route" />` -- shipped mangle on every prerendered page of that site. The init-style shell comment conventions ("Do not add brand meta here directly", commented favicon/manifest links) are exactly the prose this trap feeds on.
- **The sharpened lesson.** See AGENTS.md. The `s` flag was never the boundary: `[^" ]` matches newlines WITHOUT any flag, so "removing dotall" while keeping `[^" ]*` is a no-op. Single-line matching means excluding the line terminators in the class itself: `[^\"\r\n]*`.
- **Fixed:** 12 metas/link regex lines in injectMeta + generate404, plus the script/modulepreload strips in generate404 (`[^>\r\n]`) -- same class, bounded by the next `>` but still cross-line-able. The 404 robots strip needed no defensive change: its trailing `/\?>` anchor already forbids the cross-line match; the new test pins that fact rather than assuming it.
- **Regression pair** in tests/engine.test.js (og:title fragment into injectMeta; robots fragment into generate404). The og:title test ran RED against the old regex, GREEN after the fix. Battery 149/149 (147 + 2) on the first post-fix run; `sync-engine.mjs` caught the contract drift between edit and generator (generated 11 files, check 5/5 byte-identical).
- **End-to-end proof:** example rebuilt through its own synced copy (vite -> inject-brand -> prerender --force): 8/8 pages, `/about` ships per-route title/description/canonical/og/twitter intact -- the real-document path the fix must not regress.
- Considered and left alone: `connectSrcRegex` in inject-brand is already single-line ([^\n]*), and the islands/usePageMeta surfaces carry no HTML replacement regexes.

Gates: battery 149/149, sync 5/5, docs + claims (run below), example build 8/8 with meta inspected by hand.

---

## Pass 26 - crashtest CI pin (floating harness), example AEO robots shipped, R2/R3 closed (2026-10-26)

Repo survey pass. All five gates were green at HEAD before touching anything (battery 147/147, sync 5/5, docs style/links/frontmatter/language/ truthfulness, fiction signatures), so the work here is two real defects found by looking, not a green-field feature.

- **The new CI lane floated its harness.** `crashtest.yml` (Pass 25) ran `npx --yes crashtest@1 run`; crashtest 1.1.0 is now on npm, so the gate silently moved from the committed 35-row baseline to 54 rows. All 19 new rows are permanent skip rows (`governance/*`, `memory/*` -- "knob not declared on this target"), i.e. zero applicable coverage for a proxy pack that declares no such vocabulary. That is the same false-coverage optics Pass 16 refused for the build-time surfaces: more rows, no more proof. Fixed by pinning `crashtest@1.0.0` (the version the committed labs trio was produced with) and documenting the bump rule in the workflow: bump and regenerate `labs/` in the SAME commit, and only when the new rows apply. Proof the pin is the right one: `npx --yes crashtest@1.0.0 run` reproduces the committed ledger exactly (35/35 REFUSED, 0 EXPLOITED, 99 ops / 206 requests, "0 new / 0 regressed") -- the only diff is `generatedAt`.
- **R2 shipped: the example now runs the AEO preset.** `robots: { aeo: true }` in `example/ssr.config.js`, and `example/public/robots.txt` deleted. The passthrough file was dead weight the moment generation was on (prerender writes `dist/robots.txt` after vite copies `public/`), and its content was the OPPOSITE policy -- it allowed GPTBot, ClaudeBot and Google-Extended. Two robots files disagreeing is exactly the drift the opt-in contract exists to avoid. Verified live: example build 8/8 pages, `dist/robots.txt` carries the 6 search-allow groups, 5 training-block groups, sitemap line.
- **R3 closed honestly.** Pass 25 made the decision the row was waiting on (published package, not a pinned checkout or composite action) but left the PRD row saying "decide". Both R2 and R3 are now marked SHIPPED there.
- **Lesson: a floating `npx pkg@1` inside a gate is version drift in a commit nobody reviews.** The gate's meaning is a property of the harness version, and so is the baseline row count -- "0 new / 0 regressed" stays green while the row set underneath it changes. Pin the version the ledger was cut with, and treat a bump as a reviewed change with its ledger.
- **Lesson: generated-vs-committed is not the only drift direction.** Pass 22 caught a STALE harness silently rewriting the baseline downward; this pass caught a NEWER one rewriting it upward. Either way the committed ledger stops describing the gate.

Gates: battery 147/147, sync 5/5, docs audit PASS, fiction scan PASS, example build 8/8 with the AEO robots output inspected by hand.

---

## Pass 25 - crashtest wired into CI, ledger npm-parity, announcement count fix (2026-10-22)

- Spot-run of the PUBLISHED crashtest@1.0.0 via npx against the committed crashtest.config.js: 35 REFUSED / 0 EXPLOITED, 99 backend ops across 206 in-process requests, "baseline: 0 new / 0 regressed / 0 accepted hits". That is first-parity proof that an adopting repo only needs one line (packs path) + npm. The regenerated labs/hardening.md + labs/crashledger.json + labs/run-meta.json are committed as-is (npm-run stamps; verdict set identical to HEAD).
- New .github/workflows/crashtest.yml: installs root devDeps (express present, puppeteer deliberately never installed -- fail-closed render is the pinned contract of bot-render-fallback), runs `npx --yes crashtest@1 run`. Exit code is the gate: fail on a NEW EXPLOITED or a REFUSED->EXPLOITED regression, the same rule hardening.md documents. Hardening artifacts upload on failure for triage. README carries the matching shields.io workflow badge -- the repo's first README badge.
- Announcement correction: docs/discussions/announcing-v1.1.0.md said "(17 REFUSED, 0 EXPLOITED)"; 17 was stale pre-pass-22 output read from an old hardening.md. Current truth is 35 REFUSED, 0 EXPLOITED. Anyone who already pasted the discussion's md block must update that one number.
- Lesson: fresh crashtest runs re-stamp wall-clock fields, so the committed labs trio is an occasionally-regenerated ledger, not byte-frozen state; the gate keys on exit code + verdict set, never on the timestamp lines.

---

## Pass 24 - v1.1.0 release artifacts double-verified; announcement draft added (2026-10-22)

- Both release artifacts grabbed from their publishers and re-verified from the downloads themselves: npm tarball 35 files, whitelist shape, engine/init synced pairs byte-identical, version 1.1.0; GitHub zip 37 files, no stale `../engine/` / `../init/` import remnants, standalone battery 141/141 from the unzipped artifact. The first v1.1.0 zip had shipped the raw imports (Pass 23); the corrected artifact is what ships.
- `docs/discussions/announcing-v1.1.0.md` added: the discussion announcement draft mirroring the v1.0.0 post's format (frontmatter + one ~~~md block to copy). lint:docs PASS on all five sub-gates; lint:claims PASS after removing a stray vant boot-state dump (`models/`, `horcrux/models/`) that the Pass-22 ghost boot had dropped into the repo worktree.

---

## Pass 23 - v1.1.0 zip battery defeated by a silent `cp dir/.` failure; artifact gate added (2026-10-21)

Post-release verification pass. The npm tarball checked out: 35 files, the `bin/ engine/ init/` whitelist shape, version 1.1.0, no node_modules/dist strays. The GitHub zip did not: its `tests/` shipped the RAW repo imports (`../engine/scripts/...`, `../init/scripts/...`) that resolve only in the repo layout -- in the artifact they point at directories that do not exist, and the standalone battery fails 8/8 with import errors.

- **Root cause:** release.yml copied raw repo tests over the remapped init/tests copies, then "restored" them with `cp init/tests/. "${PACKAGE_DIR}/tests/" 2>/dev/null || true`. GNU cp requires `-r` for a `dir/.` source; the error ("cp: -r not specified; omitting directory 'init/tests/.'") was swallowed, the copy did nothing, and the raw copies won. The in-init battery passed 141/141 anyway because inside `init/` the remapped paths DO resolve -- the same repo-shape-vs-artifact-shape trap as v1.0.0, one level of shell-quietness deeper.
- **Fix (release.yml):**\ the archive now ships ONLY the remapped init/tests (the raw `cp tests/*` re-copy was deleted -- it was pure overwrite churn), and a new hard gate runs BEFORE "Create GitHub release": unzip the built archive into /tmp, npm install, `npx vitest run` from the artifact tree. The workflow can no longer ship a zip its own tests cannot run from.
- **Verified locally before re-firing:** full archive sequence simulated in /tmp/relcheck2 (fixed flow) -> artifact battery 141/141 (8 files); root battery 147/147 (9 files). yaml-lint clean.
- **Next pass:** nothing open from this fix; tag was re-pushed to re-fire release/publish, artifact re-downloaded and re-verified after the rerun.

---

## Pass 22 - Brain stone refresh, crashtest on the newest harness, v1.1.0 tagged (2026-10-21))

Release round; the pre-flight the owner asked for, in order:

- **Brain updated in the dedicated vant install** (/home/daytona/vant): identity/goals/progress rewritten to the post-1.0.0 reality (append-only npm, the Socket-vs-consumer-tree verdict, the v7 interop correction with its retracted claim, pack v0.3.0, Node >=20 platform state, the prd-prestruct.md rename), five fresh lessons appended. start.md's wake pointer updated to the new PRD name.
- **Stone regenerated** (`vant snapshot --brain prestruct`), roundtrip decoded to verify the new content is inside, then copied to the repo horcrux/ together with the new `.sha256` integrity sidecar (byte-verify: sha256 matches the sidecar). horcrux/README.md documents the sidecar + the PRD rename.
- **Crashtest on true upstream HEAD:** the local ~/crashtest install was stale (18-row-era harness vs the committed 35-row baseline) -- ff-updated to origin/main (7977e7a), deps refreshed, re-run: **35/35 REFUSED, ledger byte-identical to the committed baseline, 0 new / 0 regressed**. Two lessons: a harness that writes into your working tree must be version-checked BEFORE the run (a stale one silently rewrites your baseline downward), and `git checkout -- labs/` restores the committed truth while the binary is corrected.
- **Version ladder 1.1.0 everywhere** (root pkg == init pkg == init/VERSION, pinned by qc) and the release-truth flips: README/docs claims now say 1.1.0 published; CHANGELOG stanza heading flipped from "unreleased"; PRD R1 marked shipped.
- Tag v1.1.0 pushed from this state; publish.yml (npm, OIDC provenance) and release.yml (self-testing zip battery) fire from the tag.

---

## Pass 20 - PRD rewritten to current truth; zero unfinished rows found (2026-10-21)

The 2026-10-20 planning PRD predated Phase 2 (engine extraction, npm ship). Every phase and wart in it had already closed; even its two "still open" P2 rows shipped unrecorded (robots.txt generation + AEO preset; cache stats as root `.prestruct/status.json`; migration guide already current). Rewrote `labs/prd-prestruct.md` as: current shipped-surface inventory (schema, package, platform state, pack, verification gates), the completed ledger with the closeout rule that phase history lives in TASKS.md/AGENTS.md, and a forward-row table carrying the parked decisions only (R1 tag readiness, R2 example AEO-robots flip, R3 crashtest CI lane, R4 RENDER_LANE, R5 prestruct-build pack, R6/R7 majors kept battery-first). Kept AGENTS.md's hook operational: forward work enters as a PRD row first; a Task entry on movement. Nothing in Section 6 is scheduled work yet -- those are the decisions a human owes, not code a robot owes. Renamed to `labs/prd-prestruct.md` (prd-[project].md is the naming standard going forward).

---

## Pass 19 - vitest 5.0.5 lands; root dev-tree audit down to the deliberate v6 pin (2026-10-21)

Closing the "leverage or clean up" question on the vitest-2 residue: the answer was CLEAN UP -- nothing in the suite touches the flagged surfaces (no --ui, no vi.mock, no watcher RPC), and vitest 5.0.5 peers vite ^6.4, which we already had.

- Probe first (`npm i --no-save vitest@5.0.5` -> battery 147/147, vite 6.4.5-clean), then commit for real: root + init devDeps and the release.yml battery injection all move to ^5.0.5. Init build zero errors.
- Result: the entire former vitest-2 class (UI-server critical, mocker moderates, vitest's private vite 5.4 copy with its esbuild/launch-editor chain) is out of the tree the way npm reports it. Root audit is now TWO moderates -- both react-router 6.x advisories on the DEVDEPEND pin, which is deliberate: the root battery must keep compiling the engine against 6.30.x for the v6-compile guarantee (issue 26's v7 path is verified live on the example). Consumers are unaffected: they install their own router.
- Lesson: the "breaking" audit fix (npm suggested vitest@5.0.5 --force) was a 40-line config-free bump that the battery proved on the first run. Peer-range hygiene paid: the engine never restricted vite, so vitest 5 peer-locked into ^6.4 cleanly.

Gates: vitest 147/147 on vitest 5, init build, audit 2 (intentional), docs suites, fiction scan -- PASS.

---

## Pass 18 - react-router-dom v7 shipped for real; vite 6; JSX-build warnings zero; Node 20 engines (2026-10-21)

Solved issue #26 end to end, then used its findings to clean the CF Pages build log and the example's dependency ledger.

- **The namespace-import shape from Pass 17 was half-wrong, corrected.** A bare `import * as rrdNS` + destructure COMPILES under v7 but its node interop namespace only reliably carries `default` -- the destructures became undefined and every route failed with `useLocation is not a function` (0/8 pages). The surviving form is the guarded interop: `const rrd = rrdNS.default ?? rrdNS; const { ... } = rrd`. Lesson: "it compiled " is not "it rendered" -- run the full prerender before claiming a fix shape. Pass 17's claim was premature; this pass owns that.
- **Shipped on both majors.** Engine usePageMeta (synced), example (App/AppLayout/usePageMeta/ToolsBlock/ViewSource/Proxy/Home/NotFound/ About/Deploy snippets), init (App/AppLayout) converted. Example renders 8/8 pages under rrd 7.18.4; root battery 147/147 on v6; init build compiles the same form under v6. The example now RUNS v7 (clears its open-redirect + constructor-injection advisories); the template ships the v7-safe form while its battery pins v6.
- **vite 6.4.5 for example + init + root devDeps** (plugin-react 4.x peers cover v4-v7; engine peer range unchanged >=5). The example's audit is now 0 findings -- earlier all vite 5.4 dev-server/launch-editor/ esbuild classes, gone with the major. Render path proven 8/8.
- **CF build-log warnings zeroed.** The four `>` -in-JSX-text warnings (Contact.jsx x2, ToolsBlock.jsx x2, echoed again during prerender) are explicit arrow expressions now (`{'\u2192'}`); build runs clean.
- **puppeteer removed from root devDeps** (and from the release.yml battery injection) -- no test imports it for real; battery 147/147 without it; 98 packages left the install and the basic-ftp/extract-zip chain left the tree entirely.
- **Node 20 engines.** root/init/example declare node >=20 (matches tinypool 2.2.0's ^20||>=22); README, cloudflare.md, AGENTS claims updated to 20+. CF Pages builds on 22 already.
- Gates: vitest 147/147, sync 5/5, docs suites, fiction scan, npm pack 35 files -- all PASS; example build 8/8 under vite 6 + rrd 7; init build green under vite 6 + rrd 6.

---

## Pass 17 - Supply-chain pass: tinypool critical pinned, CI installs hardened, v7 scaffold finding banked (2026-10-21)

Triggered by Socket alerts on npm prestruct 1.0.0. The decisive fact: Socket grades the published manifest INCLUDING devDependencies; npm never installs a dependency's devDeps for consumers, so the fresh 1.0.0 install tree is audit-clean (verified locally: 0 findings, dev included). The real exposure was this repo's own build/CI tree.

- **Critical fixed:** vitest 2.x resolves tinypool 1.x (two prototype- pollution RCEs, GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr, patched 2.1.2). `overrides: { tinypool: '^2.2.0' }` at root + init, the release workflow injects the same override into the zip battery. Full battery passes 147/147 on the patched line; init build/lint green; `npm pack` still 35 files. Learn: vitest 2.1.9 runs fine on tinypool 2.2.0 -- no vitest major needed for the critical.
- **CI install hardening:** every workflow that runs `npm install` now sets `PUPPETEER_SKIP_DOWNLOAD=1` -- no suite drives a real browser, so the 170MB Chromium fetch (the vulnerable extract-zip/basic-ftp chain) never executes at install time.
- **init:** `test:ui` script removed (UI advisory footgun; @vitest/ui not installed so it could not run). Learn reinforced: JSON files cannot carry comments -- one edit wrote prose into init/package.json and release.yml's JSON.parse would have choked; caught and reverted immediately. JSON.parse is the smoke test to run after touching it.
- **Example site:** audit fix landed the browserslist (OOM) and @remix-run/router (protocol-relative open redirect) fixes. A react-router-dom 7.18.4 bump was attempted and REVERTED with evidence: v7 ships CJS, vite SSR rejects named imports from CJS modules, and the scaffold has ~9 files with named imports (AppLayout, usePageMeta copy, ToolsBlock, ViewSource, Proxy, Home, NotFound, About, Deploy x2). The namespace-import form ( `import * as rrd` + destructure) was proven live: AppLayout and the hook copy compiled and rendered 8/8 under v7 before the revert. The remaining vite findings (all dev-server classes) stay accepted with reasoning in CHANGELOG; majors (vite 8 / vitest 5 / puppeteer 25) are a platform-matrix pass, not a patch.
-  Follow-up tracked as issue 26: react-router-dom v7 scaffold migration, with the live-proven fix shape and the full file list.

Gates: vitest 147/147, sync 5/5, docs suites, fiction scan, pack 35 -- PASS.

---

## Pass 16 - Pack v0.3.0: cache-key variant parity pinned at the wire (2026-10-21)

Worked issue 25's five scenarios against the one-surface pack model; one shipped, three refuted from shipping in THIS pack, one remains open.

- **Shipped: `cache-key-variant-parity`** (pack 0.2.0 -> 0.3.0). Seeds marker cache entries on BOTH runtimes browser-free -- worker: fake KV (`{html, cachedAt}` JSON, key prestruct:<pathname+search>); vps: marker files into the proxy's disk cache, armed by a new `cacheDir` moduleCtx key; `crashtest.config.js` now sets `PRESTRUCT_CACHE_DIR` before the dynamic import of `scripts/proxy.js` (CACHE_DIR resolves at module load). Asserts: cross-variant serve collision (the issue-18 serve class), seed-served bytes present, and zero cached bytes to non-bots. Fail-open accounting: if the seed is never consulted (key format drift), the row names the unprovable surfaces instead of faking a pass. Verified live: 35/35 REFUSED (34 baseline + 1 new), 0 new EXPLOITED, 0 regressed; two consecutive runs byte-identical on the ledger modulo generatedAt.
- **Refuted from this pack: `404-theme-follower`, `buildJsonLd-bare-object`, `status-optout-parity`.** All three pin build-time surfaces (the generated 404 page, inject-brand's JSON-LD, the status.json opt-out). An HTTP pack shipping permanent skip-rows for surfaces it structurally cannot reach is false-coverage optics. They are already unit-pinned in tests/ (issue 19/21/23 fix commits); if they are ever wanted at the wire, that is a separate prestruct-BUILD pack proposal, not pack bloat here.
- **Open: `bot-snapshot-discipline`** still needs the RENDER_LANE decision (opt-in Chromium lane, CI cost trade) from issue 25. Parked until the maintainer decides lanes.
- Extra row growth is the harness side: the current crashtest v1.0.0 library fires 34 attack ids on the two proxy routes (was 17 committed baseline) -- authz/race/session/taxonomy/upload horizontal sweeps, all REFUSED. The regenerated labs/ ledger is the new committed baseline.

Gates: vitest, sync, docs lint, fiction scan -- PASS on this commit.

---

## Pass 15 - Closes issue 24 quick wins; crashtest pack named in the docs (2026-10-21)

Issue 24 asked for four things; the close-out item-by-item report:

- **Docs note (item 2) DONE.** Root README gained a "Crash testing (in-repo pack)" section plus a `packs/` row in the repo-layout table; CHANGELOG's v1.1.0 stanza documents the pack and states the packaging boundary plainly (npm tarball ships `bin/`/`engine/`/`init/`, never `packs/`). `packs/README.md` already carried the concrete adoption shape (`packs: ['/abs/path/to/prestruct/packs']`), so it was crosslinked, not duplicated.
- **Stale-labels item (item 3) FOUND ALREADY RESOLVED.** The issue predates actually checking disk: `grep -rn 'ln/' labs/` is zero hits. `labs/hardening.md` + `labs/crashledger.json` were regenerated 2026-10-20T23:06 against the current `prestruct-proxy/` labels. No re-cut needed; the issue's "stale docs artifact" is history.
- **Pin-lockstep advisory (item 4) VERIFIED SATISFIED at HEAD** (`refresh-strict-parity` exists at both layers: pack + `tests/proxy.test.js`). No action.
- **CI gate (item 1) PARKED, honest about why.** The crashtest runner is not in this repo's devDependencies -- the 34/34 runs came from the crashtest checkout. Wiring CI would decide how an external harness enters CI (pinned GitHub checkout vs published package vs composite action) and that decision does not exist yet. Tracked here rather than faked; revisit alongside dhaupin/crashtest#4.

Gates run on this commit; nothing else moved.

---

## Pass 14 - Docs scaled for the npm era + nitpick true-up (2026-10-21)

Docs pass after the npm 1.0.0 publish. Every fix is fact-supported against engine/CLI output; no invented claims.

**Fiction removed (Pass 14a true-up, commit 8ad0d79):**

- 3 guides + changelog pointed at `dist/.prestruct/status.json` and a `generatedAt` field abolished by the issue-23 fix. Now: project-root `.prestruct/status.json`, no timestamp, rationale stated.
- `docs/guides/changelog.md` + README + AGENTS claimed "not published yet". Rewritten to the live-registry state (1.0.0 published, provenance, tags-are-the-trigger convention, main ahead = next planned release).
- `cli.md` pinned to `bin/cli.mjs` reality: `-f` alias, route failure fails the build (exit 1), clean's exact target, validate's passing line, `[dir]` positional contradicted by a stale "no --dir flag" sentence (gone).

**Premier-experience scale-out (Pass 14b, this commit):**

- `docs/index.md` guide cards: added the 6 newer guides people could not find from the homepage: structured-data, bot proxy, migration, api (deep package imports included in the card text), advanced islands, build optimization. Links verified to resolve; docs-links gate PASS.
- `docs/guides/cli.md`: the generic "Cloudflare CLI / Build hooks" filler is gone, replaced by a deploy section tied to prestruct's actual pipeline (git-connected pages runs `npm run build` which IS prestruct; wrangler direct upload operates on prestruct's `dist/`). Proxy commands section now names the real per-variant prerequisites (proxy.package.json deps, wrangler.toml) and links the proxy guide.
- "22 guides" count corrected to 23 (the actual file count).

Gates: docs style/links/frontmatter/language/truthfulness PASS, vitest 142/142, sync 5/5.

---

## Pass 13 - v0.9.0 bootstrap publish + v1.0.0 restore verified installatble (2026-10-21)

The publish saga, closed out. npm needed a manual bootstrap before trusted publishing could take over: a fresh package name's first publish has no existing version for the TP workflow to yank the token from, so the workflow's `--provenance` publish 403s on a pristine package. Ladder used: manually bump 1.0.0 -> 0.9.0, npm-login publish (plain, no provenance), restore pins to 1.0.0 (package.json, init/package.json, init/VERSION), commit + push, tag `v1.0.0`, let `publish.yml` do the real publish.

**Verified live:**

- Registry: `prestruct@1.0.0` is `latest` (was 0.9.0 during bootstrap).
- Publish run 39528238363 succeeded, logs show `prestruct@1.0.0` packed.
- Provenance attestation verified at the registry level (npmjs.com 403s bots, so direct page fetch is not possible): sigstore bundle's cert binds `repo:dhaupin/prestruct:ref:refs/tags/v1.0.0`, workflow `publish.yml`, run id 39528238363, trigger `push`. `latest` dist-tag.
- Tarball from the registry (not a local pack): 35 files, 68K packed, 292,504 unpacked. No `node_modules`, no `dist`, no `.prestruct`.
- Fresh-project install test (`/tmp/pverify/mysite`, bare `npm init` + `prestruct@1.0.0` + react18/rrd6/vite5 from the host's own resolution): `npx prestruct init` never clobbers (0 created / 25 skipped on re-run), `npx prestruct build` produced `dist/` with `index.html` (baked title, canonical, description, `data-server-rendered`), `404.html`, `_headers`, `_redirects`, `sitemap.xml`. The package WORKS from the registry, not just from the repo.

**Found during the install test (docs follow-up, next pass):**

- Getting-started's page-component snippet uses the repo-relative import (`from '../hooks/usePageMeta.js'`) which is correct for the scaffolded app, but any user who instead writes the mental-model deep import (`prestruct/engine/src/hooks/usePageMeta.js`) hits the `exports` map: the package only exposes `.`/`bin`/`prerender`/`inject-brand`/ `validate-config`. Deep imports of engine src are NOT part of the contract. If a deep-import ergonomics export is ever wanted (`./hooks` or `./engine` wildcard), it needs an `exports` entry AND a qc test asserting the specifiers exist in the packed tarball. Until then, docs must stay consistent on the scaffold relative import.
- host-plugin-react@6 requires vite@^8; the install test used plugin-react@^4 with vite@5. Worth a one-line note somewhere user-facing if deps drift further (init/package-lock pins the assured set).

---

## Pass 2 -- Phase 0: stop the bleeding (2026-10-20)

**Done:**

- Reconciled `inject-brand.js` drift (W1): merged deployId/deployIdFooter into `init/scripts/inject-brand.js` as single source; footer default flipped to opt-in (`config.deployIdFooter === true`), matching semantics documented in `init/ssr.config.example.js` and set in `example/ssr.config.js`. Example copy byte-identical.
- New `scripts/sync-engine.mjs` (copy + check modes), wired as `npm run sync` / `npm run sync:check`. CI error message in `engine-sync-check.yml` now points to it. Covers 4 CI-checked engine files + `AppIslands.jsx`; `ssr.config.example.js` excluded (example-owned branding).
- Version single-sourced at `0.2.6` (root + `init/package.json`); PLAN.md engine-sync row marked done.
- `CHANGELOG.md` added at repo root, written for init cherry-pickers (must-read entries over history narrative).
- Phase 0 log + W8/W9 appended to `labs/prd.md`.

**Verified:** vitest 46/46; `sync-engine.mjs check` OK; `cd init && npm run lint` 0 errors (1 pre-existing warning in proxy.js). Root-level `npx eslint` fails pre-existing: root package.json lacks `"type": "module"`, so the root `eslint.config.js` never loads anywhere. CI only lints `init/`, so this did not block. Queued for Phase 1.

**Learned:**

- Sync contract: `init/` is source of truth; `sync-example.yml` copies on release publish; `engine-sync-check.yml` + `tests/qc.test.mjs` enforce byte-identical on every push. Drift happened because a feature landed in only one copy -- OldSchool fix: always change `init/`, then run `node scripts/sync-engine.mjs`.
- W8 (latent bug found during reconciliation): with `deployIdFooter: true`, inject-brand rewrites `<div id="root"` before prerender runs, so prerender's `'<div id="root"></div>'` shell replace misses and every route prerenders empty. Dormant (both configs use false). Phase 1: make prerender's root-div matcher attribute-tolerant.
- Root lint has never worked (`type: module` missing); do not "fix" casually -- adding `"type"` to root package.json changes module semantics for every root `.js` file; bundle it with the Phase 1 engine extraction.
- Vant brain runs in a dedicated install (`/home/daytona/vant`) with its own default template brain parked in `template-brain-backup/` (gather captures ALL scopes in an install, no CLI filter -- so a shared install would bloat the repo stone with unrelated brain content). Canonical brain content lives in `models/private/prestruct/`; `models/public/prestruct/` is a curated pointer-only mirror that feeds the repo stone.
- Public stone: `horcrux/prestruct-p_st0neph0enix2026.svg`. Password `st0neph0enix2026` is IN the filename by design (boot convention) so the OSS brain is bootable by contributors/agents: restore via  `VANT_ALLOW_FILENAME_PW=true` (vant gates legacy filename-password lookup) or via an explicit password / `VANT_BRAIN_PASSWORD`. Locator schema quirk learned: `parseFilenamePassword` splits on `-`/`_` and takes only the first segment after `p_` -- stone passwords must never contain separators or they can never round-trip through the filename convention. Consequence of the  transparent password: every file in the dedicated install ships inside the stone -- OSS-safe discipline applies to the whole brain, personal/private content must live in a separate install's brain instead.

**Setup for next pass (Phase 1: extract the engine):**

1. Create `engine/` at repo root. Move `prerender.js`, `inject-brand.js`, `islands.js`, `usePageMeta.js` with a stable export surface (`prerender(config)`, `injectMeta(html, meta, url)`).
2. Make `sync-engine.mjs` a generator: engine/ -> init/ -> example/ with path rewrites. Byte-identical CI check stays; it now verifies the generator ran.
3. Delete `init/incremental.js` (stub); inline cache logic becomes a module inside `engine/`.
4. `engine/validateConfig.js` with structured diagnostics. Keep exits 0 on CF Pages; add structured `[prestruct] Invalid route meta: /blog: expected {title}` output.
5. Fix W8 while touching prerender (root-div matcher tolerant of attributes), and fix W9 (kill the dead footer-scan in inject-brand, fold into prerender).
6. Decide: `PRESTRUCT_STRICT=1` env flag (exit 1 locally, exit 0 on CF)? See labs/prd.md open question 1.
7. Also queued: root package.json `"type": "module"` + fix root lint.

---

## Pass 1 -- audit and PRD (2026-10-20)

- Full repo audit. Findings logged as W1-W7 in `labs/prd.md` (engine drift, no engine source dir, version sprawl, exit-0 policy, incremental stub, duplicated meta logic, non-portable example config).
- Suite was 45/46: failing test was the init<->example sync check on `inject-brand.js`.
- `labs/prd.md` written: Phases 0-3 + 4 open questions.
---

## Pass 3 - Phase 1 begins: engine extraction (2026-10-20)

**Done:**

- `engine/` created as the single source (`scripts/prerender.js`, `scripts/inject-brand.js`, `scripts/validate-config.js`, `src/islands.js`, `src/hooks/usePageMeta.js`, `vite.config.js` init-only). sync-engine.mjs is now a generator (engine -> init + example, INIT_ONLY group for template-owned files). init/incremental.js stub deleted.
- Module surfaces: `replaceRootDiv`, `injectMeta`, `generateSitemap`, `generate404`, cache helpers, `prerender(config, {force})`, `injectBrand`, `validateConfig` + CLI guards (isMainExecute) so imports never run pipelines.
- W8 fixed for real: root-div injection is attribute-tolerant; footer attr now survives prerender (verified live: prerendered pages carry `data-deploy-id-footer data-server-rendered="true"` with deployIdFooter: true). W9: dead footer-scan dropped from inject-brand.
- Config validation: validateConfig() with structured `[prestruct] config:` diagnostics; exits stay graceful. PRESTRUCT_STRICT=1 fails build on config diagnostics (open question 1 resolved: env flag, default off).
- Simple enablement: `npx vitest run` runs 46/46. sync-engine.mjs check: ok.

**Latent break found and fixed (this is why the end-to-end build mattered):**

- The init template could never prerender on a fresh install: (a) missing vite.config.js -> JSX compiled via esbuild classic runtime -> "React is not defined" per route; (b) react-router-dom unpinned -> npm auto-installs v7, which dropped react-router-dom/server.js. Both masked by the graceful exit-0 fallback. Fixed: template ships vite.config.js (engine/vite.config.js -> init only) and pins react/react-dom 18 + react-router-dom ^6.30.
- Proof: `cd init && npm run build` -> 8/8 pages rendered, footer attrs on rebound prerendered pages, 404 + sitemap written.

**Learned:**

- The engine contract is 5 files + an INIT_ONLY surface; example-owned files (ssr configs, AppLayout, App, main, vite.config) must never be generated.
- Always re-run `node scripts/sync-engine.mjs` after touching engine/; CI fails otherwise (this is now the single place edits land).
- `dist/index.html` shell must survive attribute injection: the root-div matcher and inject-brand both expect extra attrs.

**Setup for next pass (Phase 1 cont./rest of PRD):**

1. Decide docs tagged for the footer behavior + strict flag (docs guides config.md / cli.md refresh).
2. PRD open question 2 (proxy in npm package) -> Phase 2 scaffolding.
3. PRD Phase 1 leftover: none; Phase 2 starts with package bin/cli.mjs.
4. Re-run example build once CF sync lands (CI builds auto-run on push).
---

## Pass 4 - Phase 2 scaffolding: npm packaging wired, dormant (2026-10-20)

**Done:**

- Root package.json is the npm package shape: exports map (prestruct/, prestruct/prerender, prestruct/inject-brand, prestruct/validate-config), bin -> bin/cli.mjs, files whitelist (bin + engine + init), peerDependencies resolve from the HOST project, type: module, engines >= 18. Version field 1.0.0 set but NOT tagged and NOT published (per owner: prove stability first).
- bin/cli.mjs: init (never-clobber scaffold), build (validate -> vite build -> inject-brand -> prerender), validate (exit 1 on bad config), clean. prereq refactor: prerender(config, {root}) for host-project execution.
- .github/workflows/publish.yml: OIDC trusted publishing on v* tags ONLY, mirroring the dhaupin/crashtest runbook. Dormant: no tag exists - do not publish until stability is proven. One-time manual npm publish + Trusted Publisher setup required when it is time (runbook in workflow header).
- prereq fix: cleanCache() now mkdirs from the cacheFile path (cmdClean ENOENT found by smoke-testing CLI commands).
- Battery: 61/61 tests, sync check ok, init lint ok. Pack sim from clean checkout: 367.9 kB / 126 files, no junk. e2e after refactor: init build + example build both exit 0, example renders 8/8 with correct root attrs.

**Learned:**

- Destructuring a boolean return: `const { ok } = report(config)` yields undefined for a boolean return -> silent else-exit with EMPTY diagnostics. Debug-visible because console output vanished while trace-exit pinned the else branch. Rule: match return-shape to destructure (report returns ok boolean; validateConfig returns {ok, errors}).
- npm peers are auto-installed (npm 7+) - root devDeps must pin react/react- dom 18 and react-router-dom ^6.30 so engine.test.js can import prerender.js through vite's import-analysis (v7 has no ./server.js subpath).
- npm pack uses disk state, not git - check the tarball from a clean checkout (git archive sim) before trusting local dry-run numbers.
- CLI debug discipline: fs.appendFileSync probes bypass console entirely; use when stdout/stderr look possessed.

**Setup for next pass (stability completion, part of "go through prestruct"):**

1. Windows path check for cli init walk; example/AppLayout has paths in engine that need re-shape? None - keep as-is.
2. Fresh-project simulation: use the packed tarball in a scratch Vite app after `npm pack`, verify prestruct init/build/validate E2E (uses the real npm morphology, not the repo shape).
3. Then the stability sweep for the engine (PRD phase 2 gate for v1.0.0): docs guides refresh (config.md / cli.md refresh + footer semantics), CI green, brain + TASKS updated. Only then discuss tagging/publishing v1.0.0.

## Pass 5 - Docs refresh: README/AGENTS/deploy guides crosslinked to reality (2026-10-20)

**Done:**

- README.md rewritten (pre-package era text was 90% stale): npm package quick start (prestruct init/build/validate/clean), engine monorepo layout table, captive CLI section removed (v0.2.6 release table gone), dormant publish state stated plainly, crosslinks to docs/, README-proxy, AGENTS, SCOPE, PLAN.
- AGENTS.md: react-router-dom/server.js section now records the v7 package-root fallback + "test against installed v7" rule (from the tarball e2e pass). New section "The npm package: host-project execution, not self-hosted deps" (peerDeps contract, prerender(config,{root}), CLI surface, report-boolean and gitignore-anchoring lessons, sync discipline, crosslink block).
- docs/guides/cloudflare.md (the de-facto deploy.md): CLI/3-step-script build mention, Node 20 default + PRESTRUCT_STRICT, removed the WRONG cache hint (curl x-prestruct-refresh against the Pages domain - that header flushes the RENDER PROXY cache, not Pages), Pages-vs-proxy boundary clarified, condensed best practices into next-steps crosslinks.
- README-proxy.md: notes that npx prestruct init already scaffolds the proxy files. SCOPE.md Key Files moved off dead scripts/ paths to engine/ + bin/; PLAN.md Docs section unmangled (footer had been glued to the link list).

**Verified:** relative-link sweep across the six touched files - every .md target resolves (two checker false-positives in cloudflare.md were sibling guides, correct relative to the file). Commit: f279122 (6 files, +280/-185).

**Learned:**

- "deploy.md's" in repo vocabulary = README-proxy.md (VPS/Worker) + docs/guides/cloudflare.md (Pages). They flank different halves of deploy and must stay crosslinked or readers route through the Pages guide for lines that belong to the proxy.
- Code-first lesson from CONTENT.md pays: the new README is shorter than the old one despite covering MORE (CLI, package, layout table).

**Setup for next pass:**

1. CF Pages deploy of docs/ (no Pagefind in the Pages build today).
2. When it is ever time to publish: tag flow per publish.yml runbook only.

## Pass 6 - Phase 3 P1s: Worker bot-list sync + VPS keep-alive starters (2026-10-20)

**Done:**

- **Worker bot list sync (PRD P1).** `syncProxyBotList()` added to `engine/scripts/inject-brand.js`, called at the end of `injectBrand()` when `config.proxy.url` is set: rewrites the `BOT_LIST` array literal in `scripts/proxy.worker.js` from `config.proxy.botList`. Idempotent (no write when equal), skips silently when the Worker file is absent (proxy optional / example has none), warns and skips when the array literal can't be found (manual-edit infestation), returns the found/synced boolean for callers. Escapes backslashes and single quotes in bot tokens (same toReplaceSafe discipline as all injected strings).
- 8 new behavior tests in `tests/inject-brand.test.js` run against real temp-dir worker files (rewrite, no-op missing file, no-op on empty/malformed botList or missing proxy.url, no-op when BOT_LIST absent, idempotence, quote escaping). Suite: 21 tests in that file; battery 68/68.
- **pm2 + systemd starters (PRD P1).** `init/ecosystem.cjs` (pm2 config: fork-mode, single instance, 700M memory cap, 3s restart backoff, Chromium headroom documented - never clusterise the proxy) and `init/scripts/prestruct-proxy.service` (systemd unit: EnvironmentFile for PRESTRUCT_SECRET, PORT comment, hardening PrivateTmp/NoNewPrivileges, WorkingDirectory/User to edit). Both ship via `prestruct init`.
- README-proxy.md: step 5 now points at the shipped starters with a table + pm2 commands; "Keeping bot lists in sync" rewritten: the build syncs the Worker's BOT_LIST automatically (old hand-copy instructions removed).
- **PRD open questions closed** (Section 6 answers written): W4 = PRESTRUCT_STRICT env flag, default off (landed in Phase 1); proxy = copy-in via prestruct init, never npm-imported; example-only features = shared-engine config flags (deployIdFooter); docs stay Jekyll/gh-pages. Phase 3 progress table updated (robots.txt, cache stats, migration refresh remain P2 open).
- PLAN.md feature table refreshed to current reality (engine single-source, CLI, validation, fetchRoutes all Done; NPM package = built but dormant; bots/starters Done) and "Current" list now says v1.0.0 upublished.

**Verified:** sync check 5/5 byte-identical engine->init+example; vitest 68/68; node --check on engine + ecosystem.cjs; ecosystem loads via require. systemd-analyze isn't installed locally, so the unit file was verified by inspection only (PORT/secret contract match against proxy.js source: lines 75/271). Remaining Phase 1-era open item unchanged: fresh-project tarball E2E.

**Warts found:** none new; search-tool/git-noise issues in this box were environmental, not repo defects.

## Pass 7 - Tarball E2E (2 real bugs), .ignore, P2 leftovers: robots + cache stats (2026-10-20)

**Deliverables:**

- **`.ignore` added** for ripgrep/search-tool noise: package-lock.json (41k lines), init/ + example/ (generated byte-identical copies - single source is engine/), node_modules, dist, docs/_site, coverage, horcrux/ binary assets, OS/editor noise. Baseline: 11,123 files visible to search -> 54. Git tracking is NOT affected (that is still .gitignore's job) - documented in the file header.
- **Fresh-project tarball E2E** (the Phase-1-era setup item, done for real): `npm pack` -> bare scratch Vite app -> `npm i <tgz>` -> `npx prestruct init` -> `cp ssr.config.example.js ssr.config.js` -> `npx prestruct validate` -> `npx prestruct build`. Full pipeline green end-to-end through the real npm morphology (not the repo shape). **Two real bugs caught live:** 1. **npm pack shipped 4,007 files / 17MB** - disk-state lesson from pass 4: init/node_modules + init/dist sat on disk under the `files` whitelist. Fixed with negation patterns in files + `init/.npmignore`; tarball now 35 files / 57KB, zero vendored deps. (New AGENTS lesson: `files` whitelist entries take negation patterns AND nested .npmignore - belt and braces, keep both.) 2. **Title regex dotall trap (engine/scripts/inject-brand.js).** Every `prestruct init` user's shell carries `<title>, description...` inside a build-instruction comment; the dotall `s` flag paired that comment fragment with the REAL closing `</title>` far below, eating the comment closer and landing a malformed head. The example build never hit it (example's first literal title IS the real tag), so tests + example smoke were blind to it. Fix: drop the `s` flag (`[^<]*` single-line matching means a fake closer-less fragment is auto-skipped) + reword init/index.html's comment so the literal expression loses its teeth. Regression tests: 2 (trap-active + trap-fixed shells). 3. **CLI silently dropped --force/-f/--clean on `prestruct build`.** Engine accepted the flags (`prerender(cfg, {force})`, `cleanCache()`) but `bin/cli.mjs` built `{root}` only: `--force` logged "(cached)" and served stale HTML, `--clean` was a no-op. Fix: args forwarded to prerender + cleanCache; HELP updated. Verified via tarball reinstall: "(forcing rebuild)" appears and dist reflects config changes.
- **P2: robots.txt generation** - `generateRobots(config)` in engine/scripts/prerender.js + write during prerender when `config.robots` is set (true = minimal block + Sitemap pointer; object = custom body + opt-out `sitemap:false`). Without the key, an author-owned public/robots.txt is never touched. 5 unit tests.
- **P2: cache stats** - `dist/.prestruct/status.json` written every build (generatedAt, routeCount, succeeded, cached, force, routes[].cached). Static-sites-safe per PRD preference (a file, not a runtime endpoint). Verified live in the tarball e2e (`cat dist/.prestruct/status.json | jq .succeeded` pattern works in CI health-checks).
- **Docs**: docs/guides/config.md gained "robots.txt (opt-in)" + "Cache stats (static monitor)"; PLAN.md feature table rows flipped to Done.

**Verified:** sync 5/5 contract files byte-identical; vitest 75/75 (7 new unit tests this pass); scratch rebuild produced correct dist (robots.txt present, status.json valid JSON, title reflects route meta under --force and under default cache-skip). Tarball down to 57KB, so CI and npx installs stop transferring idle MB of node_modules.

**Next:** upstream the AGENTS.md lessons (npm pack disk-state negation + .npmignore both; title-regex comment trap; CLI flag pass-through linter); then the still-open P2: refresh docs/guides/migration.md after the engine extraction, if the doc's claims drift further from reality.

## Pass 8 - AGENTS lessons verified + pushed; migration.md refreshed (2026-10-20)

**Done:**

- **Pushed** all 7 accumulated local commits to origin/main (14695c6.c7bfc83. e60d0b0.f279122.5438363.1ffb2c0.4fe5ce3 -> 4fe5ce3 live at HEAD).
- **AGENTS.md gained 3 pass-7 lessons** under the npm package section: 1. npm pack uses DISK state, not git -- files-whitelist covers whatever sits on disk under it; fix pattern is files-negation + nested .npmignore + `tar -tzf | wc -l` as the size gate (35 files / 57KB expected, not 17MB). 2. Title-regex dotall trap -- never dotall a regex that replaces an HTML tag; shell prose (comments carrying `<title>,`) pairs with the real closing tag cross-line and corrupts the head. `[^<]*` single-line is comment-proof. 3. CLI-to-engine flag pass-through -- engine-accepted options reachable from the CLI need an installed-package verification; repo-shape tests use a different module instance and cannot see the gap (found live: `--force` silently no-op'd through `prestruct build`).
- **docs/guides/migration.md refreshed** against current reality: - New first section "From prestruct v0.1 / v0.2 (older layouts)" -- the upgrade path the PRD asked for: CLI install, init never-clobber semantics, a habit-vs-reality table (engine single source, PRESTRUCT_STRICT, deployIdFooter config flag, robots opt-in, build-managed Worker bot list), and `--clean` guidance for stale incremental caches. - CRA steps now lead with `npm i -D prestruct` + `npx prestruct init` and `build: "prestruct build"`, keeping the hand-copy 3-step script as an explicit dep-free escape hatch. - "Common migration patterns" dynamic-data block switched from a hand-rolled routes assembly to `fetchRoutes()` (matching docs/guides/config.md). - "After Migration" checklist now lists validate + cache-stats watch; PRD P2 "docs: migration guide from v0.1" item is DONE.

**Verified:** sync check 5/5 byte-identical; vitest 75/75 (battery green); link hygiene intact (migration.md references docs/guides/config.md as prose, all fenced blocks balanced after repair of a missing code-fence close and a stray list item found during self-review).

**Now open:** P2 leftovers are cleared through robots.txt + cache stats + migration guide. Remaining aspirational work per PLAN: none pending; next natural step when the owner decides is to tag v1.0.0 and let the dormant publish workflow fire.

## Pass 9 - Edge-case sweep: 6 defects found + fixed, E2E-proven (2026-10-20)

**Method:** line audit of all engine files (prerender.js, inject-brand.js, validate-config.js, islands.js, usePageMeta.js) plus bin/cli.mjs cross-checked against AGENTS.md's standing lessons; every fix got a regression test, and the library-shape fixes got a tarball E2E confirmation through the real CLI.

**Fixed (all engine/ root, synced to init/ + example/):**

1. **replaceRootDiv $-expansion (the big one).** SSR output containing "$1"/"$&"-shaped text -- prices, code samples, quotes -- was a replacement string to String.replace and would expand into capture-group references, mangling prerendered HTML (same class as the documented $120 meta bug, but it hit EVERY route with a literal dollar sequence). Function-form replacer now; unit test + tarball E2E proof: route rendering "Price: $120 -- ref: $&" ships intact (pre-fix that $& duplicated the whole app markup inline).
2. **generate404 user-text injection + $-expansion.** notFound.heading/body/ label/href/siteName went into markup raw (a <script> heading shipped working JS) and into string replacements (an $& heading rewrote the matched tag). Now: escapeXml on every user value before markup, function-form replacers in every replace() call. 2 tests.
3. **generate404's root-div replacer was string-form too** -- caught by the new $& test before it could ship. Converted with the rest.
4. **validate-config: duplicate route paths now error.** Two routes with the same path collide in the incremental cache key and double-write the same dist file with different meta (silent SEO corruption). Trailing-slash variants are correctly treated as distinct. 2 tests.
5. **syncProxyBotList $-tokens.** config.proxy.botList entries shaped like "$&" expanded inside the string replacer; function form keeps tokens literal. 1 test.
6. **prerender() process.exit(0) in library-called paths (no-routes, missing dist).** A callable function must never kill the host process (test runners / host CLI lose control). Both now return; CLI behavior is unchanged (build still completes, exit 0, same log lines).
7. **bin/cli.mjs init walk no longer ships .npmignore into user projects** (it belongs to the package tarball, not scaffolded apps -- a user's own npm-pack would prune their files). Proven in the E2E: scaffold contains no .npmignore.
8. **usePageMeta empty-base canonical guard.** Without siteUrl/VITE_SITE_URL the computed canonical was relative ("/about") and would be written as a non-canonical href; guarded to skip when base is empty.

**Tests:** 75 -> 81 (6 regressions). Battery green, sync 5/5 byte-identical.

**Not fixed (considered, fine as-is):** islands.js visible-strategy leaves an IntersectionObserver attached if a visible island is removed pre-intersect (browser-only, GC'd with the element); generateRobots writes cfg.body raw to robots.txt (plain-text file, no HTML injection surface); sitemap changefreq/ priority unescaped (closed-value validation upstream). Logged here so the next audit doesn't re-open them.

CLI state: local commit only this pass -- push on request as usual.

## Pass 10 - Issue ledger closed out; proxy vulns patched; versions unified (2026-10-20)

**Ledger question answered: yes -- all tracked prestruct issues are now fixed and closed.** Full tally below; the PRD wart table gained a closeout ledger so the next reader stops asking. Note W3 had silently REOPENED after the 1.0.0 npm-shape move (root 1.0.0 vs init/package.json + VERSION stuck at 0.2.6); recovered this pass and pinned closed with a CI test.

**Security/edge fixes (proxy pair -- init-owned copy-in files, not engine contract):**

1. **VPS proxy render queue skipped acquisition (DoS, P1).** `withRenderLimit` queued overflow requests as bare `fn()` calls: the first freed slot decremented activeRenders, then the queued fn ran WITHOUT re- acquiring -- activeRenders under-counted, concurrency became unbounded again exactly under sustained bot load (the browser-pool OOM scenario the limit exists for). Queued callbacks now recurse into withRenderLimit (safe: the queue branch cannot recurse twice) and rejections propagate to the waiting caller (previously swallowed, leaving the caller's promise forever pending - a second latent bug in the same line).
2. **Timing-safe secret compare in BOTH proxies.** The x-prestruct-refresh header compare was `===` against PRESTRUCT_SECRET; response-time differences gated on the first differing byte enable byte-by-byte secret recovery. VPS: SHA-256 both sides + crypto.timingSafeEqual. Worker (no node:crypto): XOR over both encoded secrets' full byte length.
3. **Worker HIT responses now carry X-Prestruct-Rendered-At** (KV stores {html, cachedAt} JSON; legacy bare-HTML cache rows parse-fail into a safe fallback because KV rows live < 24h TTL). Header was previously missing on hit -- the one VPS/Worker parity gap the audit found.
4. **Worker comment cleanup** of the timing-safe block avoided a truncated sentence ("secretWorkers").

**Version unification (W3 reclosed):** root package.json, init/package.json, init/VERSION now all 1.0.0; release.yml stamps init/package.json (JSON rewrite, not just the text VERSION append) plus init/VERSION from the tag; qc.test.mjs pins all three equal -- the drift that reopened W3 can no longer land silently (battery: 82/82 with the new test).

**Walk of remaining proxy surface considered and cleared (logged so the next audit skips them):** URL-concat cannot pivot origin (absolute-form request URLs become a PATH on the target host); express 405 gate runs before the GET handler; VPS HIT carries mtime-based Rendered-At (parity now true on both proxies); KV put shares TTL with bot-served rows; CSP injection in inject-brand only touches connect-src with an origin allow-list pattern.

**Verified:** node --check on both proxy files; vitest 82/82; sync check 5/5 byte-identical (proxy files intentionally outside the contract list).

---

## Pass 11 - Proxy unit battery + live timing harness (express/puppeteer installed)

Post-pass-10 follow-through: the three security fixes had no execute-able proof because both proxy files bound express/puppeteer at import time and the repo had neither dep. Fixed the shape, then tested.

**Import safety (gate + lazy imports), matching the engine-file convention:**

- `init/scripts/proxy.js`: `createProxyApp(config)` + `isMainExecute()` gate; config binding, listen, browser pre-warm only on direct execution; `secretMatches`/`isBot`/`withRenderLimit`/`MAX_CONCURRENT` exported.
- `init/scripts/proxy.worker.js`: top-level `import '@cloudflare/puppeteer' REMOVED - lazy dynamic import inside the render step (unit tests import the module without the package); `refreshSecretMatches`/`isBot`/`cacheKey` extracted and exported; verified `import()` succeeds with the package absent (which the static import failed).
- `PRESTRUCT_CACHE_DIR` env override for the VPS proxy's import-time `mkdirSync('.prestruct_cache')` (tests/CI no longer litter the CWD); added `.prestruct_cache/` to .gitignore as belt-and-braces.

**Tests: `tests/proxy.test.js` (20 tests, battery now 102/102)**

- withRenderLimit queue: saturates exactly at MAX_CONCURRENT and never exceeds under 40-job overflow (the pass-10 unbounded-concurrency bug can not regenerate); queued rejections propagate instead of hanging callers; immediate-path rejections propagate too.
- VPS `secretMatches`: exact match true; wrong first/middle/last byte, longer/shorter token, empty/null header all false; NO secret configured -> false for everything (feature-off, not allow-all).
- Worker `refreshSecretMatches`: same candidate set, and results are pinned EQUAL to the VPS comparator's on identical inputs (parity test).
- Worker helpers: cacheKey determinism + URL-safety, isBot list, default export shape.

**Live timing harness: `tests/timing-harness.mjs` (run manually, not in the battery - statistical results):**

- Layer A (hrtime, interleaved-batch microbench, 120x256 samples/candidate, 6 candidate tokens diverging at different offsets): - VPS fixed comparator: FLAT - all |t| <= 0.42 vs correct, medians ~1.35us. - Worker fixed comparator: FLAT - all |t| <= 0.94, medians ~1.15us. - naive `===` control (the old code shape): DISTINGUISHABLE - t = 86.8 on the wrong-first-byte token, t = 8.1-10.4 on length variants: the early- exit leak shape is REAL and measurable at nanosecond granularity. This is the empirical proof for pass 10's fix #2, before vs after.
- Layer B (real TCP socket): an amplified naive control (sleep proportional to matched prefix) is DETECTED by the harness end-to-end (methodology has signal); the REAL VPS app over real sockets is below-threshold across all candidates (p50 ~0.7-0.8ms; network jitter, not gate timing, dominates). Two harness verdict bugs were found and fixed during bring-up: leak detection direction (correct token is the slow one under naive prefix compares - detection must be symmetric), and a vacuous baseline (`entries.find(...)[1]` is the array, `.p50` was undefined -> everything below-threshold, B2's first PASS was hollow).

**Honest limitations:** the wrong-middle naive token stays undetectable in this V8 build (~same ns cost as full compare) - naive-=== characterization, not a claim about the fix; the Worker's fetch handler needs the Workers runtime and is covered by comparator-level tests only (same limitation shape as documented in pass 10). Harness is deliberately not a CI test: machine noise makes hard statistical thresholds flaky; the vitest battery covers the behavioral logic deterministically.

**Verified:** vitest 102/102 (was 82; +20 proxy tests); sync check 5/5; `node --check` on all touched js; harness OVERALL PASS exit 0.

---

## Pass 12 - Docs side quest setup: vant-frame port + docs-audit suite wired

The docs side quest, setup phase. Docs were stale (jekyll-theme-minimal frame, pre-package install story, missing pages pattern); per owner direction the frame now matches dhaupin/vant/docs and carries vant's docs-audit suite.

**Frame ported from vant (re verified how vant ACTUALLY works via research first):**

- docs/_layouts/default.html - custom layout (sidebar from site.data.nav, Pagefind modal + Cmd+K, dark mode, copy buttons, Prism). Vant-brand strings replaced (title/desc/favicon/github links/license); pagefind + brand paths use site.baseurl; search result URLs guarded against /prestruct doubling (the baseurl gotcha is already in AGENTS.md from the pre-Jekyll docs).
- docs/Gemfile - jekyll ~> 4.3 + jekyll-redirect-from only; theme gem gone.
- docs/_config.yml - vant shape (no theme, no defaults block; every page carries layout via frontmatter).
- docs/_data/nav.yml - the freestruct menu layer: 6 sections / 23 pages. Vant's _plugins/nav_generator.rb was NOT ported: research showed vant's own layout consumes site.data.nav while the generator writes site.config['nav'] - a vestigial mismatch, not a feature.
- All 23 docs pages retrofitted with the 5-field frontmatter contract (version/permalink/layout/title/nav_order); nav_order collisions from the old config partially deduped (proxy 15, redirects 12).
- docs.yml workflow: UNCHANGED (Jekyll + Pagefind + artifact deploy) - bundler-cache picks up the new Gemfile automatically.

**Docs-audit suite ported + adapted (scripts/check-*.cjs, wired as lint:docs + lint:claims, run in test.yml CI):**

- Port gotcha caught live: repo is "type": "module", so the ported CommonJS .js scripts died at first run; renamed .cjs. Vant-package-shaped assumptions (bin/vant.js, ./lib requires, /vant baseurl) retrained onto prestruct truth: bin/cli.mjs case-dispatch, engine/init/example module refs, /prestruct permalinks.
- fiction-signatures = THIS repo's audit history made mechanical: 0.2.6 stale version, npx degit install story, bare react-router-dom/server, the SPA-fallback /index.html 200 rule, vite build --ssr (banned approach), jekyll-theme-minimal (dead frame). Negation + FICTION-OK escape valves.
- check-language.cjs ported verbatim (docs/ + labs/ + .github/ + root meta scripts, longest-run >= 3 per Unicode script block) - our own mid-session language drift history makes this one earned, not borrowed.

**Findings fixed (the first audit cycle):** frontmatter x47 -> PASS; links x4 -> PASS; style x44 (16 untagged fences, 20 emoji-in-prose, 5 trailing-whitespace) -> PASS; stale npx degit quick starts on docs/index + getting-started -> package-era; bare SPA-fallback example in troubleshooting -> removed-path example; 3 lesson-quotes in architecture.md documented via FICTION-OK waivers. Suite final: 6/6 gates PASS.

**Cross-repo bugs filed on dhaupin/freestruct (the jekyll/freestruct stack research turned up):**

- freestruct#7 - README says v0.3.0 while package.json/CHANGELOG say 0.3.2, and no tags/releases exist to verify either.
- freestruct#8 - README config example is invalid YAML (nested site/twitter/ og keys lost their indentation).
- (freestruct#2 - packaging/upublished-npm was already open; not duplicated.)

**Verified:** lint:docs PASS (style/links/frontmatter/language/truthfulness), lint:claims PASS, vitest 102/102, sync check 5/5. No ruby/bundle in the workspace, so the Jekyll build itself is validated by the docs.yml CI job, not locally (documented limitation).
