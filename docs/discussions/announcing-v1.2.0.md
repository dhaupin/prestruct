---
version: 1.2.0
permalink: /discussions/announcing-v1.2.0
layout: none
title: "Announcing prestruct v1.2.0"
comments: false
nav_order: 23
---
<!-- Draft until the v1.2.0 tag ships. Mirrors the v1.1.0 + v1.0.0
     announcement format. Owner call: trim rows when the ladder cuts. -->
# prestruct v1.2.0 (draft)

prestruct is a build-time SEO prerender tool for Vite + React apps. v1.2.0 is a verification release on top of the 1.1.0 pipeline: the build now verifies its own output through the new `prestruct audit` verb, every URL seam honors a trailing-slash `siteUrl`, and the optional render proxy pair ships hardened against the two failure classes its first lives found. Everything below is cumulative on the four-stage pipeline (validate, vite build, inject-brand, prerender) described in the v1.0.0 and v1.1.0 announcements. It will be on npm at tag time:

```bash
npm i -D prestruct
```

No config changes are required to upgrade from v1.1.0. Rows that ask something of an upgrader are marked at the bottom, per changelog contract.

## `prestruct audit` -- the baked output verifies itself

A new engine module and CLI verb reads the baked `dist/` without touching it and grades every prerendered page:

```bash
prestruct audit            # FAIL/WARN ladder; FAIL rows exit 1
prestruct audit --json     # machine digest (fails/warns/pages/sitemapLocs)
prestruct audit --external # HEAD-check external hrefs (warn-grade)
prestruct audit --internal # unresolved internal hrefs (warn-grade)
```

FAIL rows cover the head-hygiene contract: missing title/description, non-absolute canonical, duplicate head tags, missing og/twitter core, SVG og:image, unparseable JSON-LD, a 404 without noindex, and sitemap/robots gaps. WARN rows never fail a build: length bands, companion tags, disk ranges, h1 hygiene. The scaffolded build pipeline now ends in the audit, so a regression fails the build instead of shipping quietly.

## Every URL seam honors the trailing slash

`siteUrl: 'https://example.com/'` produced `https://example.com//` interpretations in canonical tags, sitemap locs, prerendered metas, and the `usePageMeta` base. The slash is now stripped at every seam; a trailing-slash siteUrl is simply correct. No config change needed.

## The proxy pair points hardening

The template's two proxy runtimes stay separate files, but this pass hardened both the same way their first production lives pointed at:

- **VPS eviction only touches the proxy's own cache files.** The old eviction walked the whole `PRESTRUCT_CACHE_DIR` and removed the oldest files whatever they were -- an operator mounting a shared or data disk there could lose their own files. The size cap is env-tunable (`PRESTRUCT_CACHE_MAX_MB`, default 500) and the cleanup log reports what it actually removed.
- **Worker KV keys can no longer blow their 512-byte cap.** A long query string used to reject the KV put/get after a successful render, turning the response path into a raw 500. Normal URLs keep the byte-identical legacy key (existing cache entries stay valid); only oversized keys fall back to the collision-proof `prestruct:sha256:<hex>` shape. The repository's crashtest pack (v0.4.0) seeds an oversized variant under BOTH shapes with an opposed marker: a proxy that still consults the oversized legacy key fails loudly in CI.

The hardening is adversarially covered by the pack that ships in the repo, not narrated by it: 54-row ledger, 0 exploited at harness 1.1.0.

## Smaller, honest fixes

- Sitemap `lastmod` is now per-route from the dist file's own mtime  (byte-identical rebuilds skip the write entirely) instead of a build-wall clock that churned every route; sitemap values fail the build on control characters instead of shipping a corrupt sitemap that reads green.
- The 404 page's OG/twitter/description/canonical tags are rebuilt from capture groups -- they no longer ship literal `$1`/`$2` garbage when the values were assembled by function replacers.
- `prestruct build --Force` (any typo'd flag) fails with the flags the command actually takes (#54); unknown config keys print a naming-and-pointer warning at build/validate (#52) -- warnings are diagnostics, not gates.
- `ogImage` accepts the object form `{ url, width, height, alt, type }`, emitting the og:image companion tags social crawlers size images with (#38); validate-config grades the shape, and the audit FAILs any SVG `og:url`.

## Upgrader actions (v1.1.0 -> v1.2.0)

- Scaffolded projects: drop in `scripts/audit.js` and append `&& node scripts/audit.js` to your build script (the template example carries the wiring).
- Template copy of the proxy pair: update `init/scripts/proxy.js` and `init/scripts/proxy.worker.js` from this release -- both are drop-in, no new required env beyond what was already documented (`PRESTRUCT_CACHE_MAX_MB` is optional).
- Otherwise: no config changes required to keep v1.1.0 behavior.

Unchanged by design from earlier releases: build-time prerender only (no runtime, edge, or streaming SSR), Cloudflare Pages first-class with Vercel/Netlify config validation only, react-router-dom v6 and v7 both supported.
