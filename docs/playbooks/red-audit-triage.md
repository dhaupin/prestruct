---
layout: default
title: Triaging a red audit
description: "A FAIL row from prestruct audit, its class, and the move that clears it."
nav_order: 25
version: 1.2.0
permalink: /playbooks/red-audit-triage/
---

# Triaging a red audit

`prestruct build` ends in an audit, and the audit is the last thing that can
turn a build red. FAIL rows exit 1; WARN rows never fail a build. Read the
named row, find its class, make the move.

```bash
npx prestruct audit            # FAIL/WARN ladder; FAIL rows exit 1
npx prestruct audit --json     # machine digest: fails / warns / pages / sitemapLocs
```

The FAIL class is the set of tags prestruct's own contract writes into every
prerendered head. A row from it means a tag the build should have written is
missing or wrong.

| FAIL row | the move |
|----------|----------|
| `missing <title>` | add `meta.title` to the route in `ssr.config.js` |
| `missing meta description` | add `meta.description` to the route |
| `missing canonical link` / `canonical not absolute` | set `siteUrl` to the full origin in `ssr.config.js` |
| duplicate-tag row | remove the hand-written tag from `index.html`; injection is missing-only |
| `missing og:title` / `og:description` / `twitter:card` / `twitter:title` | set the global `siteName` / `tagline`, or the route's `meta` |
| `og:image is SVG` | ship a raster PNG or JPG; most scrapers cannot render SVG |
| `invalid JSON-LD` | fix the JSON in the route's `jsonLd` block |
| `sitemap.xml missing` / `no <loc> entries` | a route failed to render; fix the render first |
| `robots.txt missing` / `no Sitemap: pointer` | `config.robots` is set but the pointer is absent; let the prerender write it |
| `404 page missing its noindex robots directive` | restore the 404 template's noindex tag |

WARN rows are report-grade and name an improvement, not a break: a title
outside the length band, an absent `og:image`, a page with no `<h1>`, a
missing `lastmod`. They are worth reading on a first deploy and ignoring once
the site is settled.

The `--internal` flag lists unresolved internal hrefs, and `--external`
HEAD-checks up to 50 unique external hrefs. Both are warn-grade: they name
what to look at without failing the build.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/playbooks/' | relative_url }}">all playbooks</a></p>
</div>
