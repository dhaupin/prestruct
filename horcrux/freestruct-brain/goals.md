# goals.md

Ordered by PRD phase. Source of truth: horcrux/prd-freestruct.md (planned to
become the repo-local prd.md in the freestruct repo once the rehaul starts).

## Phase 0 - safety net + packaging truth (next)
- Real test battery around docs/lib/inject.js (feature-by-feature assertions on
  a fixture site; exit codes verified). Current npm test asserts nothing.
- Packaging fix tracked by freestruct#2/#6: publishable path (npm or
  GitHub-install), shebang on the bin shim, honest docs/lib layout story.
- Version truth: tag v0.3.2 (or bump), README aligned, release artifacts
  (freestruct#7).

## Phase 1 - module decomposition
- Split inject.js (577 LOC monolith) into focused modules with an export
  surface: config-schema, seo-inject, sitemap, robots, rss, notfound,
  linkcheck, search-index, hooks. Single-file shape is the root cause of the
  churn the CHANGELOG records (0.3.1 "gap-filling" release exists BECAUSE
  refactor 0.3.0 regressed metadata).
- Kill cwd-relative path assumptions: configPath/outputDir/template dir
  resolved from explicit roots, not process.cwd(). Config search walks up
  like prestruct's findWorkdir.
- Fix the XML correctness class of bugs (escaping, sitemap lastmod, RSS).

## Phase 2 - config contract
- Config schema + structured diagnostics + FAST_FAIL exit on bad config
  (freestruct#4 pattern generalized: report-only behaviors become
  --strict-gated failures).
- Document every supported flag; flags the code supports but the checked-in
  ssr-config.yml does not mention (hashInCanonicalUrl, purge, runHooks,
  minify, assetQueryParam) get documented or removed.
- noindex honored by sitemap/search/feed + 404 pipeline unified
  (freestruct#5, the 404 noindex gap).

## Phase 3 - docs frame + release story
- Docs site upgraded to the prestruct/vant patterns: custom layout, freestruct
  menu layer in _data/nav.yml, docs-audit suite (frontmatter/links/style/
  truthfulness/fiction/language gates) wired into CI.
- README rewritten around a WORKING quick start; releases + tags + published
  package aligned; stale claims (v0.2.0 badge in home.html layout) removed.

## Guardrails
- Existing consumers never broken by default: every behavior change stays
  behind defaults that reproduce the current output; new strictness is opt-in.
- Every fix gets a fixture-based regression test before the fix lands.
- SSR-of-truth order: issues ledger (#2-#8) for defects, prd for direction,
  CHANGELOG for consumer-facing actions only.
