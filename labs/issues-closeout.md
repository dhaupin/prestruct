# Issue close-out ledger (2026-10-26)

No GitHub write auth in this workspace (same handoff model as the flowforge
draft), so closable issues ship here as paste-ready close comments with the
evidence pointer for each. Commit history is the source; this file only says
what to act on.

## Ready to close (evidence landed)

| Issue | Title | State | Close comment pointer |
|---|---|---|---|
| #34 | `prestruct audit` proposal | Shipped pass 33 (`937f08c`..`c21c2e6`) | see draft below |
| #37 | Shared audit core | Shipped pass 33 (same family shape) | see draft below |
| #38 | Structured ogImage config | Shipped pass 32 (`937f08c`) | see draft below |
| #40 | Linkcheck from freestruct | Shipped pass 33 (`prestruct audit --internal`) | see draft below |
| #31 | SVG og:image trap | Shipped pass 32 (raster + FAIL-grade traps) | see draft below |
| #51 | Port the audit surface back from freestruct | Shipped pass 33 (the verb + flags) | see draft below |
| #29 | rr v7 hosts: CJS named exports in the SSR graph | Shipped earlier (dual-major interop + battery pin) | see draft below |
| #42 | Fix #33 at the root via the injection pipeline | #33 fixed at the root (group-aware replacers); the injectPage-pattern ask is superseded by AGENTS' no-JS 404 contract | close-as-designed note |

## Stays open (roadmap/cross-repo, not bugs)

- #35 per-route JSON-LD, #36 IndexNow, #39 shared config dialect,
  #41 postBuild hooks, #43 og-image generation, #49 SEO-gap ride-along:
  feature rows; #39/#41/#36 got concrete reference pointers from the twin
  pack (freestruct's shipped implementations are in the vendored 1.1.0 and
  drafted in labs/freestruct-upstream/).
- #28 CI stack upgrades, #50 release-post bytes: CI/docs-site items.
- #44/#47/#55 cross-repo digests/evidence: keep as ledger, comment when
  the twin pack PR lands.

## Paste-ready close comments

### #34 `prestruct audit`
Shipped in the audit adoption pass: `prestruct audit [--json] [--
external] [--internal] [dist]` -- FAIL-class rows exit 1 (missing title/
description, non-absolute canonical, duplicate head tags, missing og/
twitter core, SVG og:image, unparseable JSON-LD, 404 noindex contract,
sitemap/robots), WARN rows report-grade (length bands, companions, disk
ranges, h1). The template/example builds now END in the audit, so a
regression fails the build; the example grades 9 pages at 0 failures /
0 warnings on every build. engine/scripts/audit.js, CLI verb, docs in
guides/cli.md, battery 190/190. Closing with the implementation as
evidence.

### #37 Shared audit core
Same contract as freestruct's audit by construction: shared result shape
(fails/warns/pages/sitemapLocs), `--json` digest, capture mode, and the
FAIL/WARN ladder both engines -- keeps shared family tooling working
against either engine. Ports ran in both directions (34->51->33).

### #38 Structured ogImage config
`ogImage` accepts the string shorthand AND the object form
`{ url, width, height, alt, type }`. Companions emit only when they
validate at the injection seam (digits-only sizes, string alt/type);
`secure_url` only upgrades an http source; `injectMeta` resolves objects
through `.url` on global AND route values (no "[object Object]" heads).
Object shape graded by validate-config. Field name is `url` (freestruct's
is `src`) -- the remap is documented in both configs' guides.

### #40 Linkcheck from freestruct
`prestruct audit --internal`: internal hrefs resolved against the output
root (pretty-URL directory-index first, then .html/.htm sibling), schemes
and asset-like targets excluded, and script/style/pre/code payloads
stripped before the scan (26.14 lesson -- code samples are not routes).
Warn-grade by design: a link to a never-prerendered dynamic route is a
gap, not a failure.

### #31 SVG og:image
og-image.svg stays the design source of truth; the committed
og-image.png (1200x630) is its raster (tools/render-og.mjs, resvg +
explicit Geist TTF buffers). Config accepts the object form, the audit
FAILs any surviving SVG og:url, and validation rejects wrong shapes at
build time.

### #51 Port the audit surface back
The verb + flags are ours now (see #34); duplicate-tag FAIL probes came
back with it (title/canonical/description/og:title), plus `--internal`
which freestruct's audit does not have yet (drafted upstream in
labs/freestruct-upstream/).

### #29 rr v7 hosts
Shipped: the SSR graph interops with both majors (`rrd.default ??
rrdNS` destructure from whichever carries exports), `loadStaticRouter`
tries `react-router-dom/server.js` (v6) then the package root (v7) with a
loud both-fail error, and the battery pins v6 while the example runs v7
live (7.18.4, prerendered 8/8 every build). CLOSING on that evidence.

### #42 Fix #33 at the root through the injection pipeline
#33's class ($1/$2 literal garbage in 404 head tags) is fixed at the root:
group-aware function replacers rebuild all four tags from capture args.
The second half -- running the 404 THROUGH injectPage like freestruct --
is superseded by a real design decision, not forgotten: prestruct's 404
is deliberately pure-static (`root-404`, React bundle + modulepreload
stripped, its own noindex head contract). A meta-pipeline pass would
re-introduce per-route OG/JSON-LD blocks a crawler should not see on a
noindex page and would fight the hydration-free contract. Closing as
designed-out; if the no-JS 404 posture ever changes, the pipeline route
is the right shape.
