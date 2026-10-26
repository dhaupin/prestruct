# Changelog

Consumer-facing changes to the engine and template. Written for projects
that cherry-picked `init/` files into their own repos. Read before updating.

Rule from [CONTENT.md](./CONTENT.md): commit history is the source. This file
records only what cherry-pickers must act on.

---

## Unreleased (the version ladder pins 1.2.0; the v1.1.0 tag remains latest on npm)

### New: `prestruct audit` (the built-in post-build verifier)

- New CLI verb + engine module (`scripts/audit.js`, ported/remapped from the
  freestruct audit): reads the baked `dist/` without touching it and grades
  it. FAIL rows (exit 1): missing title/description, non-absolute canonical,
  duplicate head tags, missing og/twitter core tags, SVG og:image,
  unparseable JSON-LD, 404 without noindex, missing/empty sitemap, and
  pointer-less robots.txt (graded only when `config.robots` is set -- the
  author-owned copy is never engine-graded). WARN rows never fail: length
  bands, extended og/twitter set, og:image companions/disk ranges, h1 and
  JSON-LD hygiene. Flags: `--json`, `--external` (HEAD-checks external
  hrefs, warn-grade), `--internal` (unresolved internal hrefs, warn-grade).
  The scaffolded `init/` and example builds now END in the audit, so a
  regression fails the build. Action for cherry-pickers: drop in
  `scripts/audit.js`, add `&& node scripts/audit.js` to your build script.

### Honest sitemap lastmod + XML loud-fail

- `generateSitemap()` wrote a universal build-time `<lastmod>` on every
  route, so freshness signals churned even when one page changed. Now per
  route: the dist file's own mtime, preserved across identical rebuilds
  (byte-identical writes are skipped entirely). Same adoption: sitemap
  values pass through `assertXmlSafe` -- a control character now fails the
  build loudly instead of shipping a corrupt sitemap that reads green.
  Action: update `init/scripts/prerender.js` (drop-in) -- no config change.

### generate404() head tags no longer ship literal `$1`/`$2` (#33)

- The 404 page's og:title, twitter:title, description and canonical tags
  were built with function replacers whose returned strings contained
  `$1`/`$2` -- but a function replacer's return value is used LITERALLY, so
  `dist/404.html` shipped `$1Page Not Found | Site$2`-shaped garbage and
  lost all four tags. Values now rebuild from the capture groups. Action for
  cherry-pickers: update `init/scripts/prerender.js` (or describe: drop-in).

### Trailing-slash `siteUrl` no longer doubles the canonical (#53)

- `siteUrl: 'https://x.example.com/'` produced canonical/og:url of
  `https://x.example.com//` on every page (inject-brand) and inside sitemap
  locs + prerendered metas. The trailing slash is now stripped at every URL
  seam: inject-brand canonical/og block, prerender injectMeta, sitemap,
  404 canonical, and the usePageMeta base. No config change needed; a
  trailing-slash siteUrl is simply correct now.

### CLI refuses unknown dash-word flags (#54)

- `prestruct build --Force` (or any misspelled flag) was silently ignored:
  typo'd flags now fail with `unknown flag(s): ... - run prestruct help`,
  exit 1, naming what the command actually takes. `--help` works on every
  subcommand.

### Loud config diagnostics for unknown keys (#52)

- A misspelled config key (`ogimg:` instead of `ogImage:`) passed build
  validation while silently dropping the SEO surface it drove. Unknown
  keys now print `[prestruct] config warning: unknown config key "x"
  (typo? see the config reference)` during build/validate. Warnings are
  diagnostics, not gates: they never fail the build.

### Packs conformance + pinned surfaces

- `npm run lint:packs` runs `packstruct lint packs/ --deep` -- the shared
  `/packs` spec linter (crashtest#16 class: manifest declares an entry that
  does not ship). The crashtest CI lane runs the repo's own exact
  `crashtest` devDependency pin and never a floating `@1` fetch; harness
  upgrades are one command: `npm run crashtest:bump <version>`
  (pin install + harness run + ledger regen + pin/stamp verification).

---

## v1.1.0 (released from the v1.1.0 tag)

### Scaffold now compiles on react-router-dom v7 (and the example runs it)

- vite SSR rejects named imports from v7's CJS entry, and node's CJS-interop
  namespace only reliably carries `default` (v6 is ESM, usually with no
  default export). The scaffold's router imports are now
  `import * as rrdNS` + `const rrd = rrdNS.default ?? rrdNS` + destructure,
  which compiles identically on both majors. Files touched: engine
  usePageMeta (synced), example (App/AppLayout/usePageMeta/ToolsBlock/
  ViewSource/Proxy/Home/NotFound/About/Deploy snippets), init (App/
  AppLayout). Verified for real: example builds and renders 8/8 pages
  under react-router-dom 7.18.4 + vite 6.4.5; root battery 147/147 on v6.
- The example is now on v7 (clears its open-redirect/constructor-injection
  advisories) and the init template ships the v7-safe import form while its
  battery stays pinned on v6 -- both majors stay compiled and tested.
- The example also moved to vite 6.4.5 (plugin-react 4.x peers cover v4-v7):
  its audit is now 0 findings, and the Cloudflare build log JSX-arrow
  warnings (`>` in JSX text on Contact/ToolsBlock) are gone -- replaced with
  explicit arrow string expressions.

### Deep engine imports are now part of the exports contract

- `package.json` exports map adds `prestruct/hooks` (usePageMeta),
  `prestruct/islands` (mountIslands), and a `prestruct/engine/*` passthrough
  so every engine file is importable without re-publishing a spec entry.
  Previously only `.`/`bin`/`prerender`/`inject-brand`/`validate-config`
  exported; deep paths failed with `Missing specifier in "prestruct"
  package`. Verified against the packed tarball (still 35 files). The docs
  default stays the scaffold-relative import (`../hooks/usePageMeta.js`) --
  the deep form is for host projects that want to pin to the package.

### Crash-test pack is documented in-repo

- The root README now names `packs/public/prestruct-proxy` (v0.3.0): where
  it lives, which proxy surfaces it attacks, where the latest run results
  land (`labs/hardening.md`, `labs/crashledger.json`), and the one-line
  adoption path from another repo's `crashtest.config.js`
  (`packs: ['/abs/path/to/prestruct/packs']`). Clarification for adopters:
  the pack travels with the checkout -- the npm tarball ships only
  `bin/`, `engine/`, `init/` and never includes `packs/`.

### vitest 5 lands: root dev-tree audit down to the deliberate v6 pin

- The remaining vitest-2 finding class (UI-server critical, mocker
  moderates, vitest's private vite 5.4 copy) is GONE: root, init, and the
  release battery all run vitest ^5.0.5 with the full test battery
  passing 147/147 first run, against vite 6.4.5 (vitest 5 peers ^6.4).
  Nothing in the suite touches the flagged surfaces (no `--ui`, no
  `vi.mock`), so the earlier "accepted" verdicts were replaced by removal
  rather than papered over.
- What deliberately remains: two react-router 6.x moderates on the ROOT
  devDependency pin -- that pin is the battery's v6-compile guarantee for
  the engine's dual-major support; v7 is verified live on the example.
  Maintainers' test tree only; consumers install their own router.

### Supply-chain pass: critical tinypool pin, CI hardening, honest alert ledger

- **Consumer exposure stays zero.** Security scanners (Socket et al.) grade
  the published manifest including its devDependencies. prestruct's
  tarball has zero runtime dependencies and the consumer install tree
  audit-checks clean (`npm audit` reports 0 with and without dev on a
  fresh `prestruct@1.0.0` install) -- a package's devDeps are never
  installed for its consumers. The real exposure is this repo's own
  build/CI tree, which is what was hardened below.
- **Critical fixed: tinypool prototype-pollution RCEs (GHSA-5gmw-xhrv-c9v3,
  GHSA-85c8-ppgw-ccpr).** vitest 2.x resolves tinypool 1.x, which is
  affected up to tinypool 2.1.2. An npm `overrides` pin (`tinypool:
  "^2.2.0"`) now applies at root and init, the release workflow injects
  the same override into the zip battery, and the full vitest battery
  passes on the patched line (battery later moved to vitest 5, above).
- **CI installs skip Chromium.** All workflows that run `npm install`
  set `PUPPETEER_SKIP_DOWNLOAD=1`: no test here drives a real browser
  (the render path is asserted to fail closed), so the ~170 MB Chromium
  fetch -- which is also the vulnerable extract-zip/basic-ftp chain --
  is not executed at install time.
- **init template: `test:ui` script removed.** `@vitest/ui` is not a
  dependency and vitest 2.x's UI server carries a critical advisory while
  listening; the script could never run as-is, so the footgun is gone.
- **What remains and why it is accepted, documented per finding:** the
  remaining root audit highs/moderates live in code paths CI never
  executes (vite dev-server classes -- CI only runs `vite build`;
  vitest UI-server class -- never started; @vitest/mocker mock
  registration -- attacker-controlled input does not reach it; the
  puppeteer browser-download chain -- skipped at install). Clearing them
  from the ledger requires semver-major devDep bumps (vite 8, vitest 5,
  puppeteer 25) that belong to a tested platform-matrix pass, not a
  security patch. Clearing them in the SCANNER view only: consumers were
  never exposed.
- **Example site runtime fix:** `npm audit fix` bumped browserslist (OOM
  advisory) and @remix-run/router (protocol-relative open redirect) in
  the deployed example's dependency tree; react-router-dom stays on 6.x
  for the example (the two remaining react-router moderates are fixed in
  v7, and shipping that migration needs the scaffold import work tracked
  in a follow-up issue).

### Pack v0.3.0: cache-key variant parity now pinned at the wire

- New pack shape `cache-key-variant-parity` pins the issue-18 fix class (a
  cached route restoring another URL-variant's HTML) at the wire level, on
  both runtimes, browser-free. The scenario seeds marker cache entries --
  `{html, cachedAt}` JSON into the Worker's KV namespace, marker files into
  the express proxy's disk cache via a new `cacheDir` moduleCtx arm (set
  `PRESTRUCT_CACHE_DIR` before importing the proxy module) -- then asserts
  each variant is served only its own bytes and that no cached byte reaches
  a non-bot request. Fail-open honesty: if the seeded key is never
  consulted (key-format drift, seeding arm broken), the row reports the
  exact surfaces it could not prove instead of claiming a pass.

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

## v1.0.0

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
