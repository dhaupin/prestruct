---
version: 1.2.0
permalink: /discussions/announcing-v1.2.0/
layout: default
title: "Announcing prestruct v1.2.0"
comments: false
nav_order: 23
---
# prestruct v1.2.0

prestruct is a build-time SEO prerender tool for Vite + React apps. v1.2.0 is a verification and surface release on top of the 1.1.0 pipeline: the build now verifies its own output through the new `prestruct audit` verb, the engine adopts the family ride-along set (IndexNow, postBuild hooks, per-route JSON-LD, head discovery, generated OG images), the react-router 7 prerender seam is closed, and every URL seam honors a trailing-slash `siteUrl`. Everything below is cumulative on the four-stage pipeline (validate, vite build, inject-brand, prerender) described in the v1.0.0 and v1.1.0 announcements. It will be on npm at tag time:

```bash
npm i -D prestruct
```

No config changes are required to upgrade from v1.1.0. Rows that ask something of an upgrader are marked at the bottom, per changelog contract.

## react-router 7 renders every route again

On react-router-dom 7 (real ESM) the engine's `StaticRouter` and the host app's router could load as two module instances, each with its own React contexts. Every route then failed with `useLocation() may be used only in the context of a <Router> component` -- and, when a host set `ssr.noExternal`, with a Vite `module is not defined` / named-export error before that. The engine now loads `StaticRouter` through the same Vite SSR registry as the app and redirects an inlined react-router CJS entry to its ESM twin, so both majors render with or without `ssr.noExternal`. If you cherry-picked the `rrdom-esm-redirect.mjs` shim and the `ssr.noExternal` lines from an earlier release, remove them.

## `prestruct audit` -- the baked output verifies itself

A new engine module and CLI verb reads the baked `dist/` without touching it and grades every prerendered page:

```bash
prestruct audit            # FAIL/WARN ladder; FAIL rows exit 1
prestruct audit --json     # machine digest (fails/warns/pages/sitemapLocs)
prestruct audit --external # HEAD-check external hrefs (warn-grade)
prestruct audit --internal # unresolved internal hrefs (warn-grade)
```

FAIL rows cover the head-hygiene contract: missing title/description, non-absolute canonical, duplicate head tags, missing og/twitter core, SVG og:image, unparseable JSON-LD, a 404 without noindex, and sitemap/robots gaps. WARN rows never fail a build: length bands, companion tags, disk ranges, h1 hygiene. Both the scaffolded build pipeline and `prestruct build` itself now end in the audit, so a regression fails the build instead of shipping quietly.

## The family ride-along set

A batch of surfaces ported from the sibling structs, each with its own battery. Every one is config-gated: a host that sets nothing renders the same HTML as before.

- **`prestruct indexnow`** -- a 32-hex key (config `indexNow`, or generate-once persistence), `<key>.txt` emitted into `dist/`, and a POST of the baked sitemap URLs to `api.indexnow.org`. `--dry-run` prints the request body without touching the network; submission only counts once the output is deployed (keyLocation must resolve).
- **`hooks.postBuild`** -- the build pipeline owns the hook chain, so a direct engine/CI run can no longer skip it. `runHooks: true` is the opt-in gate (nothing executes without it); `PRESTRUCT_SITE_URL` / `PRESTRUCT_OUTPUT_DIR` ride the child env, and a nonzero hook exit fails the build.
- **Per-route JSON-LD** -- `jsonLdDefaults` emits Organization + WebSite from `siteName`/`siteUrl`/`author` when a host defines no `buildJsonLd` (`jsonLdDefaults: false` opts out); route-level `jsonLd` nodes ship on their own page, `@graph`-wrapped when multiple, rebuild-idempotent.
- **Head discovery set** -- feed autodiscovery, hreflang alternates with per-route takeover, search-console verification metas, a home-only `SearchAction`, and a generated-only `llms.txt` (`llms: false` opts out).
- **`ogImageGeneration`** -- 1200x630 SVG templates render into `dist/og/` per route through the optional `@resvg/resvg-js` rasterizer, skipped loudly when absent.

## Every URL seam honors the trailing slash

`siteUrl: 'https://example.com/'` produced `https://example.com//` interpretations in canonical tags, sitemap locs, prerendered metas, and the `usePageMeta` base. The slash is now stripped at every seam; a trailing-slash siteUrl is simply correct. No config change needed.

## The proxy pair points hardening

The template's two proxy runtimes stay separate files, but this pass hardened both the same way their first production lives pointed at:

- **VPS eviction only touches the proxy's own cache files.** The old eviction walked the whole `PRESTRUCT_CACHE_DIR` and removed the oldest files whatever they were -- an operator mounting a shared or data disk there could lose their own files. The size cap is env-tunable (`PRESTRUCT_CACHE_MAX_MB`, default 500) and the cleanup log reports what it actually removed.
- **Worker KV keys can no longer blow their 512-byte cap.** A long query string used to reject the KV put/get after a successful render, turning the response path into a raw 500. Normal URLs keep the byte-identical legacy key (existing cache entries stay valid); only oversized keys fall back to the collision-proof `prestruct:sha256:<hex>` shape. The repository's crashtest pack (v0.4.0) seeds an oversized variant under BOTH shapes with an opposed marker: a proxy that still consults the oversized legacy key fails loudly in CI.

The hardening is adversarially covered by the pack that ships in the repo, not narrated by it: 54-row ledger, 0 exploited at harness 1.1.0.

The Worker also gained the VPS proxy's render discipline: its single-flight map now records the in-flight render BEFORE awaiting it (a same-isolate burst joins one render instead of one render each -- the old order made the `FLIGHT` branch dead code), and a `MAX_CONCURRENT` limiter bounds how many Browser Rendering sessions one isolate opens at once. Both runtimes now origin-check the resolved target URL, so the SSRF guard no longer depends on Node's HTTP parser rejecting `@`-prefixed request targets.

## Smaller, honest fixes

- Sitemap `lastmod` is now per-route from the dist file's own mtime  (byte-identical rebuilds skip the write entirely) instead of a build-wall clock that churned every route; sitemap values fail the build on control characters instead of shipping a corrupt sitemap that reads green.
- The 404 page's OG/twitter/description/canonical tags are rebuilt from capture groups -- they no longer ship literal `$1`/`$2` garbage when the values were assembled by function replacers; the 404 head now rides the same `injectMeta` pipeline as every page.
- `prestruct build --Force` (any typo'd flag) fails with the flags the command actually takes (#54); unknown config keys print a naming-and-pointer warning at build/validate (#52) -- warnings are diagnostics, not gates.
- `prestruct build` forwards `--force`/`--clean` to the engine and fails the build on a prerender failure (a route that errored used to exit 0); build telemetry moved to project-root `.prestruct/status.json`, out of the deployed `dist/`.
- `ogImage` accepts the object form `{ url, width, height, alt, type }`, emitting the og:image companion tags social crawlers size images with (#38); validate-config grades the shape, and the audit FAILs any SVG `og:url`. A per-route `ogImage` object now carries its own companions and drops the stale site-wide ones (the width/height/alt that described a different raster before).
- Version truth (#70): `package.json` is the single version source, and a census test refuses a side package.json, `init/VERSION`, a committed lockfile, or the README status line that drifted from it. `npm run gate` runs every CI lane in one command.
- Head-escaped correctly in the 404 and the grouped head additions: `siteName` is escaped once (no `&amp;amp;`), and feed/hreflang/verification values keep a literal `$` instead of shipping `$$`; the root-div matcher tolerates minifier/prettier attribute reflow instead of failing the build hard.

## Upgrader actions (v1.1.0 -> v1.2.0)

- Scaffolded projects: drop in `scripts/audit.js` and append `&& node scripts/audit.js` to your build script (the template example carries the wiring).
- Template copy of the proxy pair: update `init/scripts/proxy.js` and `init/scripts/proxy.worker.js` from this release -- both are drop-in, no new required env beyond what was already documented (`PRESTRUCT_CACHE_MAX_MB` is optional).
- Otherwise: no config changes required to keep v1.1.0 behavior.

- [Changelog](/prestruct/guides/changelog) -- the consolidated consumer-facing changes
- [Architecture](/prestruct/guides/architecture) -- how the engine behind the release works
