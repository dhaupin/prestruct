# prestruct-shapes: the pack contract for poststruct M1 (draft, 2026-10-26)

Paste-ready upstream contribution, written from exercise receipts: poststruct
0.9.0's engine and prestruct's own audit were run against the SAME baked
trees (labs/beta-gistory-trial.md); the WARN ladders agreed 1:1 and the divergences are contracts, not bugs. This file specifies the pack so its first
audit-customer never false-FAILs a deliberate prestruct behavior.

 Structurally follows poststruct's PRD pack spec (packs/public/<name>/pack.json +
entry exporting [checks]); ids namespaced by pack slug. verification: pack
runs against prestruct's baked example (0 failures / 0 warnings per pass
33's own audit) and against the bare init shell (expected FAIL ids only).

## The contract the pack must encode (learned by cross-running)

1. **Robots is an OPT-IN contract (the #1 divergence).** poststruct's site
   module FAILs a missing robots.txt unconditionally; prestruct grades
   robots ONLY when config.robots is set (the author-owned copy is never
   engine-graded; pinned in prestruct's tests). Pack rule: the
   robots-related checks are gated on `ctx.robots === true`. A sitemap
   without robots.txt on an opted-out site is NOT a finding.
2. **The 404 keeps ONLY its noindex contract.** No OG/JSON-LD/canonical is
   expected on dist/404.html (a crawler should see nothing indexable).
   Pack rule: checks scoped by appliesTo(page) skip 404 pages entirely
   except `prestruct/404-noindex-solo`, which FAILs if 404.html ships ANY
   indexable signal (og:, JSON-LD, or canonical) or a missing
   `name="robots" content="noindex"`. This matches prestruct's no-JS 404
   posture (root-404 div, React bundle + modulepreload stripped).
3. **Per-route injection must have LANDED.** FAIL if a prerendered route
   page still carries the shell placeholder title/description (init shell
   ships `<title>Site</title>` + empty description meta). Cross-check
   against `ctx.routes` when armed: a page at a route that lists meta but
   ships shell defaults = FAIL (that is a build race or a failed page).
4. **`data-server-rendered` marker on hydrated routes.** Root div carries
   `data-server-rendered="1"` when the page was prerendered (main.jsx's
   hydrateRoot createRoot branch keys on it). FAIL on routes, not on 404.
5. **`deploy-id` meta freshness/idempotence.** inject-brand REPLACES
   previously injected blocks on rebuild (idempotent by design). Pack
   checks: `prestruct/deploy-id-dup` FAIL if more than one deploy-id meta
   (double-injection class); warn if absent when `ctx.deployId` is armed.
6. **og:image companions from the object form (#38).** When the page's
   og:url source is the object form, width/height/alt companions SHOULD
   be present (poststruct core grades dims as warn). Pack adds the ALT
   variant and the SVG-raster FAIL is covered by core (og:image SVG =
   FAIL, covered upstream already).
7. **Trailing-slash canonical integrity (#53 class).** FAIL if canonical
   or og:url contains a double slash at the origin seam
   (`https://site//`) -- the double-slash class can only ship if a
   consumer runs a pre-#53 engine fork.
8. **Incremental cache staleness (warn, hard to prove by file alone).**
   The cache signature includes vite asset hashes + meta; drift means a
   build raced. File-level proxy: FAIL if the page references an asset
   (/assets/index-*.js) that does NOT exist in dist/assets/. That is the
   stale-restored-HTML class from the issue-18 line.

## What the pack deliberately does NOT know

- Anything network-shaped (no external link checks; core's --external owns that lane).
- Anything renderer-shaped (no fetching, no SPA runtime; poststruct's fence).
- The AEO robots preset vendor matrices (vendor-specific crawl policy ships in
  the config; the pack only cares that an opted-out site is not graded).

## Manifest (seam)

packs/public/prestruct-shapes/pack.json:
{
  "schemaVersion": 1,
  "name": "prestruct-shapes",
  "description": "prestruct's baked-output contract: landed injection, SSR markers, noindex 404, idempotent deploy-id, robots opt-in, og companions",
  "version": "0.1.0",
  "entry": "index.js"
}

entry.mjs exports:
{
  checks: [
    { id, module: 'head'|'site'|'prestruct', level: 'fail'|'warn',
      appliesTo: (page, ctx) => boolean, run: (page, ctx) => finding|null }
  ]
}

ctx: { robots: boolean, deployId: boolean, routes: string[] } // host-armed, not guessed

## Self-audit fixture requirement (same as poststruct's own corpus)

pack ships test/fixtures/bad/ pages proving each FAIL id fires (with the
shell defaults surviving injection, a 404 with a modulepreload leak, a
double-deploy-id page, an og url with a double slash, a dead /assets ref)
and one good/ page that audits CLEAN, so a broken pack fails its own build
per the PRD's rule.
