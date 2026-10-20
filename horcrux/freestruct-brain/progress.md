# progress.md

## 2026-10-20 - brain minted (pre-rehaul state)
- Brain created from a deep code-level read of freestruct main
  (7bc7736-era snapshot; raw files fetched). No code touched yet.
- Known-defect ledger = open issues #2-#8 (packaging x2, sitemap basepath,
  link-check-non-fatal, noindex leakage, README version drift, README YAML
  example). Five new findings reported this session (see prd-freestruct.md
  wart table): XML escaping class, config/template contract gaps, 404
  pipeline inconsistencies, own-site http canonical, search.json/Pagefind
  duplication.
- Ground truth captured in identity.md: 577-LOC single-file inject.js,
  zero-assertion test story, cwd-relative path assumptions, config flags
  the checked-in config does not mention.
- Next: owner moves the freestruct-brain/+prd into the vant install + repo,
  then the rehaul starts at PRD Phase 0 (safety net + packaging truth).
