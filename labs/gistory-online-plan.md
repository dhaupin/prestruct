# Bring-online plan: the three struct-sibling betas (2026-10-26)

Written from the prestruct side after the pass-40/42/43 trial round. The
gistory staging trees are verified green (receipts below); the target repos
exist but are stub-level; every remaining step is a push or an npm bootstrap
that needs write auth this workspace does not have. This file is the
owner-facing runbook: what hits in beta, per repo, in dependency order.

## State as measured (2026-10-26, gistory main = 2e0d049)

| Tree | Files staged | Target repo | Live state | Own battery |
|---|---|---|---|---|
| poststruct-staging | 53 | dhaupin/poststruct (HEAD 22fc13c) | 5-file stub (README/LICENSE scaffold) | self-test PASS: good clean + bad corpus hits 8/8 expected FAIL ids |
| monoforge-staging | 63 | dhaupin/monoforge (HEAD f8e45fb) | 6-file stub | self-test PASS: bad-config refused / stray dir refused / stamp ok / unfilled doctor FAIL / refilled PASS (5 asserts) |
| eyestruct-staging | 94 | dhaupin/eyestruct (HEAD de0c79d) | 2-file stub | node:test: 23 tests, 15 pass, 0 fail, 8 skip (the browser-capture lane, expected for the 0.9.0 browserless-spine cut) |

Staging content was unchanged by the 2e0d049 ferry (the two commits past
2a92d6c are gistory labs receipts only), so the pass-40 trial receipts stand
against current trees.

## The beta cut: what hits, in order

The family PRDs sequence it explicitly (monoforge PRD section 6; eyestruct
PRD transfer notes): **poststruct first** (text is the cheaper leg to trust),
**monoforge second** (it stamps from poststruct + packstruct, the two proven
instances), **eyestruct third** (the eyes leg inherits poststruct's ledger UX
once settled). The README spec the trials verified IS the beta pitch:

1. **poststruct goes online:** audit-what-shipped CLI; the README spec
   (head/site module FAIL-WARN ladder, exit 0/1/2, fixtures corpus) is what
   beta users get. Its own `prestruct-shapes`/`freestruct-shapes` packs are
   the M1 roadmap, not the beta gate.
2. **monoforge goes online:** stamp/doctor/lock/cut; README spec already
   restricts claims to the two proven instances (poststruct + packstruct).
3. **eyestruct goes online:** browserless spine only (init/manifest/ledger/
   gate/adopt/raster/ratify); `look`/`walk` land with the pinned browser
   image per the MVP cut -- the README says so and the 8 skips prove the
   boundary honestly.

## Owner-gated steps (the last mile)

1. **Push each staging tree to its repo main.** The minority diffs checked:
   target repos carry only scaffold README/LICENSE; staging carries the real
   trees (docs, workflows, fixtures, .eyes baseline for eyestruct). Direct
   replacement push, one commit per repo, `ferry` per the tars pattern --
   or land via PR from the gistory-staged branches if review is wanted.
   This workspace has no GitHub write auth (probed pass 41: API 403,
   push refused) -- the prestruct-side paste-ready convention applies.
2. **poststruct + monoforge npm bootstrap** (their DEPLOY.md ladders):
   one-time MANUAL publish of 0.9.0 from a dev machine behind the full gate,
   then the OIDC Trusted Publisher flips on at 1.0.0 tags. THIS also fixes
   the gistory-family README+B4 finding family-wide: monoforge's README has
   no install line controversy, but any "npm i" reference must only appear
   once the bootstrap landed (the gistory-sync E404 lesson, reported in
   labs/gistory-beta-report.md).
3. **Landings + docs deploys:** each tree carries the fleet-pattern
   wrangler.toml + functions/api/health.js canary and docs.yml (Jekyll +
   Pagefind + Freestruct). Cloudflare Pages connect per repo; docs land at
   docs.creadev.org/<name>. No novel infra -- the PREPROVEN baseline.
4. **Gate wiring:** each repo's test.yml runs its battery in CI on push
   (already in the staged trees); lint:packs (packstruct --deep) + the
   crashtest lanes park behind the same exact-pin contract prestruct uses.

## Nice-to-haves before the cut (small, optional)

- The two poststruct CLI bugs reported upstream (B1 verb-swallow, B2
  --module null parse) are one-edit fixes in bin/cli.mjs; fixing BEFORE the
  bootstrap publish means 0.9.0 never ships with them.
- monoforge doctor is a likely target for a fix wave after the docs-gates
  wave settles (the walker/skip-set correctness classes); ship as the
  recorded ancestor and fire the fix wave after both source listings are
  up.

## Receipt trail

- pass 40: stage-side trial receipts (labs/beta-gistory-trial.md).
- pass 41: write-auth probe receipts (labs/TASKS.md) + paste-ready report
  (labs/gistory-beta-report.md).
- this pass: per-tree battery receipts + parity/HEAD table above.
