---
version: 1.4.0
permalink: /discussions/announcing-v1.4.0/
layout: default
title: "Announcing prestruct v1.4.0"
comments: false
nav_order: 25
---
# prestruct v1.4.0

prestruct is a build-time SEO prerender tool for Vite + React apps. v1.4.0 is a minor on the 1.3.0 line: the engine can now emit a schema.org `BreadcrumbList` per route, so the structured-data guide no longer tells hosts to hand-roll the trail. Everything is cumulative on the four-stage pipeline (validate, vite build, inject-brand, prerender). It will be on npm at tag time:

```bash
npm i -D prestruct
```

## What landed

**Engine-level auto breadcrumbs (`breadcrumb: true`).** The engine can now emit a schema.org `BreadcrumbList` per route, built from the route's own path at injection time - the one thing `buildJsonLd()` structurally cannot do (it is called site-wide, with no route argument, which is why the structured-data guide used to tell hosts to hand-roll the trail in a prerender extension). Set `breadcrumb: true` and each non-home route ships site-root -> segments -> the page's own title; the home route ships none (a one-item trail is not a breadcrumb), and a route already carrying its own `BreadcrumbList` in `route.jsonLd` is left alone (missing-only). This is the prestruct counterpart to freestruct's `breadcrumb: true`, so the family's two engines now speak the same discovery dialect. The flag and `siteName` ride `buildHeadExtras`, so flipping it on between builds re-renders instead of riding a valid-cache hit. Battery-pinned both ways: emission, the home-route skip, the exactly-true gate, the missing-only suppression, coexistence with a non-breadcrumb route node, the trailing-slash `siteUrl`, and the cache-signature change.

## Also in this round

The family prestruct floor moves to `^1.3.0`: `scripts/check-prestruct-pins.cjs` refuses any declaration below 1.3.0, because 1.3.0 is the security round (the opt-in external audit lane gained the SSRF guard - private-host refusal before any socket, re-checked on every redirect hop). Every consumer declaration moved with the floor, and every web lockfile re-resolved to 1.3.0; the guard's own battery gains the inverse case, so the move is pinned both ways. The family devDependency pins advance to the current cuts (`crashtest` `1.2.0 -> 1.3.0`, `freestruct` `^1.2.0 -> ^1.3.0`, `packstruct` `1.0.0 -> 1.1.0`), the docs-lane caller SHA moves to freestruct v1.3.0, and the `.gitignore` docs block carries the in-tree Jekyll and pagefind products.

## Links

- Repo and docs: https://github.com/dhaupin/prestruct / https://docs.creadev.org/prestruct
- Release posts: https://docs.creadev.org/prestruct/discussions
- Changelog: https://github.com/dhaupin/prestruct/blob/main/CHANGELOG.md
- Issues: https://github.com/dhaupin/prestruct/issues
