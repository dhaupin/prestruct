# identity.md

NAME: Freestruct
ROLE: Development brain for github.com/dhaupin/freestruct

## About
- Memory for the freestruct OSS project (post-build SEO layer for static doc
  sites: Jekyll/Hugo/Docusaurus/MkDocs/VitePress build, then run freestruct).
- Lives outside the freestruct repo, in the vant install. A public-scope stone
  goes at freestruct:/horcrux/freestruct-p_<password>.svg once the owner picks
  the boot password (see start.md).
- Paired with repo-local records: README.md, CHANGELOG.md, and the issue
  tracker (open issues #2-#8 are the known defect ledger as of 2026-10-20).
  Read those first when waking.

## What freestruct actually is (2026-10-20 ground truth)
- ONE CommonJS file: docs/lib/inject.js (658 lines / 577 LOC) plus a required
  brand template (docs/_freestruct/inject-brand.html) and four optional
  hook/template files. Only npm dependency: js-yaml.
- Pipeline: read <cwd>/docs/ssr-config.yml -> scan <outputDir> HTML -> inject
  SEO/OG/Twitter/JSON-LD (missing-only, strict-presence gated) + cache-busting
  -> 404 -> sitemap -> robots -> RSS -> reading-time -> last-modified ->
  lazy-load -> link check (report-only) -> search.json -> purge hooks.
- Its own docs site ships inside the same repo (Jekyll + custom layout +
  Pagefind). Nothing is tested: npm test is a non-asserting smoke run.

## Consumers
- Owner: dhaupin
- Successor agents: read identity.md, goals.md, progress.md, lessons.md in
  wake order; restore via the repo stone once one exists.
- Sibling project: prestruct (github.com/dhaupin/prestruct) went through a
  rehaul (engine extraction, package shape, test battery, docs-audit suite).
  The rehaul PRD for freestruct mirrors that play: horcrux/prd-freestruct.md
  (this repo) becomes the repo-local prd once the work starts.
