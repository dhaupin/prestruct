---
layout: default
title: Changelog
description: "Consumer-facing changes per release: what cherry-pickers of the init template must act on when updating."
nav_order: 17
version: 1.0.0
permalink: /guides/changelog
---

Release history for prestruct. Commit history is the detailed source
(`git log --oneline`); the npm package sits at **1.1.0** (published from
the v1.1.0 tag via the Trusted-Publisher workflow, provenance-attested),
and **main carries 1.2.0, bumped ahead of its tag**.

## 1.2.0 (version bumped; tag not yet cut -- npm stays at the v1.1.0 tag)

- **react-router 7 prerender seam fixed (#68)**: on router 7 (real ESM) the
  engine's `StaticRouter` and the app's router could load as two module
  instances with separate React contexts, failing every route with
  `useLocation() may be used only in the context of a <Router> component`
  (and, under a host `ssr.noExternal`, a Vite `module is not defined` /
  named-export error first). The engine now loads `StaticRouter` through the
  same SSR registry as the app and redirects an inlined react-router CJS
  entry to its ESM twin; both majors render with or without `ssr.noExternal`.
  Cherry-pickers: remove the `rrdom-esm-redirect.mjs` shim and the
  `ssr.noExternal` lines if you carried them.
- **Peer ranges are bounded to the proven matrix** (#58): `react >=18 <19`,
  `react-dom >=18 <19`, `react-router-dom >=6 <8`, `vite >=5 <8`. The proven
  set is vite 6.4.5, react 18.3.1, and router majors 6 and 7 (7.18.4 baked
  the example 8/8 pages in CI); an install of vite 8 or react 19 now
  refuses cleanly at ERESOLVE instead of shipping ungraded. Ceilings
  move only when the next proof lands: vite 7 cleared its lane first
  (example bake 8/8 byte-equivalent to the vite 6 output modulo asset
  hashes, audit clean, no ssrLoadModule deprecation noise), so the example
  lane itself now runs `vite ^7.3.7` while the init template stays on 6.
- **`prestruct audit`** joins the CLI (ported/remapped from the family
  audit engine): grades the BAKED `dist/` -- FAIL rows exit 1 (missing
  title/description, non-absolute canonical, duplicate head tags, missing
  og/twitter core, SVG og:image, unparseable JSON-LD, 404 without noindex,
  sitemap/robots); WARN rows report-grade. Flags: `--json`, `--external`
  (HEAD-checks external hrefs, warn-grade), `--internal` (unresolved
  internal hrefs, warn-grade). Scaffolded builds now END in the audit, so
  a regression fails the build. Cherry-pickers: drop in
  `scripts/audit.js` + add `&& node scripts/audit.js` to the build script.
- **Family ride-along set** (config-gated; a host that sets nothing renders
  the same HTML as before):
  - **`prestruct indexnow` verb + `scripts/indexnow.js` (#36)**: 32-hex key
    validation, generate-once persistence, `<key>.txt` emission into
    `dist/`, baked-sitemap submission with `--dry-run` off-network mode.
  - **`hooks.postBuild` (#41)**: the build pipeline owns the chain,
    `runHooks: true` opt-in gate, function-form placeholder substitution,
    `PRESTRUCT_*` env hand-off, nonzero hook exits fail the build.
  - **Config-driven JSON-LD defaults (#30)**: Organization + WebSite from
    `siteName`/`siteUrl`/`author` when a host defines no `buildJsonLd`;
    `jsonLdDefaults: false` opts out.
  - **Per-route `jsonLd` (#35)**: route-scoped nodes ship on their own page,
    `@graph`-wrapped when multiple, rebuild-idempotent.
  - **Head discovery set (#49)**: feed autodiscovery, hreflang alternates
    with route takeover, verification metas, home-only SearchAction, and
    generated-only `llms.txt` with an `llms: false` opt-out.
  - **`ogImageGeneration` (#43)**: 1200x630 SVG templates render into
    `dist/og/` per route through the optional `@resvg/resvg-js` rasterizer,
    skipped loudly when absent.
  - **RRD-7 named-import interop (#29)**: a pre-transform rewrites a host
    layout's named react-router imports into the dual-major namespace form
    before Vite links the externalized CJS graph.
  - **The 404 head rides `injectMeta` (#42)**: only the genuinely-404
    contracts remain (home-pointing canonical, noindex, zero-JS strip).
  - **Config dialect table (#39)**: the prestruct<->freestruct shared config
    mapping, in the config guide.
- **Honest sitemap lastmod + XML loud-fail**: per-route lastmod from the
  dist file's own preserved mtime (byte-identical rebuilds skip the
  write); sitemap values survive `assertXmlSafe` -- a control character
  fails the build instead of shipping a corrupt sitemap.
- **404 head tags rebuilt from capture groups (#33)**: the four 404-page
  OG/twitter/description/canonical tags no longer ship literal `$1`/`$2`
  garbage (function replacers use the returned string literally).
- **Trailing-slash `siteUrl` no longer doubles the canonical (#53)**:
  stripped at every URL seam (canonical/og, prerender metas, sitemap, 404,
  the usePageMeta base). No config change needed.
- **CLI refuses unknown dash-word flags (#54)** (`prestruct build --Force`
  fails loud instead of riding as an unrelated flag) and **unknown config
  keys print warnings (#52)** (diagnostics, never a gate).
- **Structured `ogImage` object form** `{ url, width, height, alt, type }`
  emits the og:image companion tags; object shape graded by
  validate-config (proposal #38).
- **Proxy pair hardening (template scripts)**: VPS eviction touches only
  cache-shaped files (an operator's mounted files survive; cap is
  `PRESTRUCT_CACHE_MAX_MB`, default 500); Worker KV keys over the
  512-byte cap fall back to `prestruct:sha256:<hex>` (a long query used
  to reject the KV put/get AFTER a successful render, turning the
  response path into a 500). The in-repo crashtest pack (v0.4.0)
  seeds an oversized variant under both key shapes with an opposed
  marker, so a fallback regression fails CI. The Worker's single-flight
  map now records the render before awaiting it (a same-isolate burst
  joins one render, matching the VPS `renderOnce`) and a `MAX_CONCURRENT`
  limiter bounds concurrent Browser Rendering sessions; both runtimes
  origin-check the resolved target URL.
- **Audit-walk escaping + matcher fixes**: the grouped head additions
  (feed/hreflang/verification) keep a literal `$` instead of shipping
  `$$` (they ride a function replacer); `generate404` escapes `siteName`
  once (no `&amp;amp;`) and no longer `$`-doubles the canonical; a
  per-route `ogImage` object carries its own companions and drops the
  stale site-wide ones; `replaceRootDiv` tolerates minifier/prettier
  attribute reflow instead of failing the build hard; `result.cached`
  reports real cache hits.
- **`prestruct build` ends in the audit** (FAIL-class findings fail the
  build; warnings never do) -- the CLI path now matches the documented
  pipeline. The RRD named-import rewrite also handles the default+named
  form (`import rrd, { x } from 'react-router-dom'`).
- **Config + docs truth**: the root `eslint.config.js` is valid and
  dependency-free; `init/package-lock.json` peer ranges match
  `init/package.json`; the CLI guide lists `indexnow` and the real build
  pipeline; the Worker header no longer documents a phantom default.
- **`prestruct build` forwards `--force`/`--clean`** to the engine and
  **fails the build on a prerender failure** (a route that errored used to
  exit 0); build telemetry moved to project-root `.prestruct/status.json`.
- **Version truth (#70)**: `tests/census.test.mjs` derives the version from
  the root `package.json` and refuses a side package.json, `init/VERSION`,
  a committed lockfile, or the README status line that drifted from it.
- **`npm run gate`**: one pre-push command over every CI lane (sync, packs,
  docs, claims, init lint, battery).

## 1.1.0 (released from the v1.1.0 tag)

- Deep engine imports join the package contract: `prestruct/hooks`,
  `prestruct/islands`, and a `prestruct/engine/*` passthrough (previously
  `Missing specifier` for any non-mapped path). Docs still recommend the
  scaffold-relative import for template users.
- `status.json` moves out of `dist/`: build telemetry now lands in
  PROJECT-ROOT `.prestruct/status.json` beside the route cache, and the
  wall-clock `generatedAt` field is dropped. Anything inside `dist/` deploys
  to a public URL (issue 23) and a timestamp inside it broke byte-identical
  build parity. Action for upgraders: re-point any CI step reading
  `dist/.prestruct/status.json` at the project root.
- Release archive (GitHub zip) now ships a working test battery: imports
  remapped to the template layout, test-only devDependencies declared, and
  the battery runs inside `init/` BEFORE the zip is built (136/136).
- Release notes list the real archive contents (the v1.0.0 body named
  `ssr.config.js`, which the zip does not contain).

## 1.0.0 (published)

- npm package shape: `bin/cli.mjs` (`init` / `build` / `validate` / `clean`),
  `engine/` single-source scripts synced into `init/` + `example/`
- CLI realizes `--force` / `--clean` pass-through (engine already accepted
  them; the CLI previously dropped both silently)
- Incremental prerender cache (`.prestruct/cache/`) + opt-in `config.robots`
  generation
- Bot proxy pair (VPS + Worker) with constant-time cache-refresh secret
  compare and a bounded render-concurrency queue
- 23 guides under `docs/` with Pagefind search

## v0.2.4 (May 2026)

Changes since v0.2.2:

### Core Features
- Islands architecture for dynamic client-only content
- Proxy support for bot rendering (VPS and Worker)
- BrowserRouter isolation pattern
- Prerender pipeline improvements
- ssrLoadModule over vite build --ssr (required for proper StaticRouter context)
- Dynamic islands with client-only rendering
- Proxy cache key using SHA-256 hash
- Fix: 404 pages get noindex meta to prevent crawling
- Fix: usePageMeta adds useLocation to deps for query param navigation
- Fix: inject-brand title falls back to siteName, only injects description if truthy

### Docs: Guides
- Docs: prestruct guide set covering getting started to advanced

### Docs: UI/UX
- Docs: Pagefind search integration with Cmd+K shortcut
- Docs: Theme - menu system, light/dark mode, mobile improvements
- Docs: PrismJS syntax highlighting with copy buttons

### Docs: Infrastructure
- Docs: Jekyll layout fixes
- Docs: GitHub Pages baseurl config
- Docs: Artifact deploy instead of branch deploy (peaceiris bug)

## v0.2.2 (Stable)

Initial stable release:

### Core
- Vite integration for React SSR
- Prerender pipeline for build-time static generation
- Cloudflare Pages deployment

### Architecture
- ssrLoadModule for SSR rendering
- Component islands with lazy mounting
- Build-time prerendering

### Guides
- Getting Started, Configuration, Vite Integration
- SEO, Performance, Routing, Architecture
- Troubleshooting, Migration, Advanced Islands

See git log for detailed history:

```bash
git log --oneline
```

Full release notes: https://github.com/dhaupin/prestruct/releases

## Next steps

- [Roadmap](/prestruct/guides/roadmap) - what is planned next
- [Contributing](/prestruct/guides/contributing) - how to get a change in
- [Announcement: v1.0.0](/prestruct/discussions/announcing-v1.0.0/) - first stable release notes
- [Announcement: v1.1.0](/prestruct/discussions/announcing-v1.1.0/) - release notes for the previous tagged version
- [Announcement: v1.2.0](/prestruct/discussions/announcing-v1.2.0/) - release notes for the current version
