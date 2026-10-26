# Stabilization issues (paste-ready, 2026-10-26)

Written with no GitHub write auth (probed pass 41): bodies below ride as
paste-ready for the named repo. In-repo work that did not need an issue is
landed with receipts in labs/TASKS.md (pass 47).

---

## Issue 1 -> dhaupin/prestruct: CI gates the real audit (example lane + config-aware template build)

**Body:**

Landed on main this pass; tracking issue so the walkthrough survives with
the run numbers:

- `init/package.json` build ends in `scripts/audit-if-configured.cjs` (an
  init-owned guard, NOT engine-synced): when `ssr.config.js` exists the
  audit runs and its exit carries straight through; on the bare scaffold
  it refuses with a named skip ("ssr.config.js absent (unconfigured
  scaffold)"), exit 0. The unconfigured tree's shell legitimately grades
  red under the full audit (placeholder meta after inject-brand skips:
  6 fails / 9 warns measured) -- that red belongs to a configured site,
  not to a template self-build.
- `.github/workflows/test.yml` gains the audited gate: `example` (the
  tracked configured project) is installed and built in CI, and its build
  ends in the real `prestruct audit` -- measured locally in this pass:
  **0 failures / 0 warnings, exit 0**. Head regressions now fail CI, not
  only a local build.
- The artifact upload pointed at a root `dist/` that does not exist in
  this layout; corrected to `init/dist/` (name: init-dist).

**Acceptance:** CI test tree on the next push shows both lanes green --
`Build the template shell` (named audit skip) and `Build + audit the
example` (audit clean line). Any future head regression turns the
example lane red before users see it.

---

## Issue 2 -> dhaupin/gistory (poststruct staging): apply the two CLI fixes (B1/B2), battery-proven in-house

**Body:**

Both bin/cli.mjs findings from the beta report are FIXED in-house on the
trial clone (prestruct pass 47), receipts ready to ride the next ferry/PR:

- **B1 (verb swallowed as directory):** `bin/cli.mjs audit [dir]` now
  strips the leading verb (`VERBS = new Set(['audit'])` -- grammar, not
  a path). The documented `poststruct audit dist` form works: measured
  same-tree runs before/after -- before: "No audit/ directory", exit 2;
  after: `{schema:1, counts:{fail:1,warn:4}}`, exit 1 (compliant exit for
  that tree's content).
- **B2 (--module permanently null):** parsed position-independently
  (indexOf + next-arg guard), and the filter is CLI-side (findings carry
  ids; engine opts only feed the site module). Measured:
  `--module head --json` -> `{fail:0,warn:4}`, all ids in the head
  namespace; counts recomputed so --json stays schema-honest. Unknown
  modules yield empty findings + counts {0,0} (honest empty, not a crash).
- **Battery:** poststruct self-test still PASS -- good corpora clean,
  bad corpus 8/8 expected FAIL ids.

Patch content is one file (`bin/cli.mjs`); happy to open the PR the day
the staging push lands (the online-plan runbook is owner-gated the same
way).

---

## Issue 3 -> dhaupin/prestruct: crashtest 1.2.0 bump tracking

**Body:**

crashtest 1.2.0 is expected "soon" (owner's earlier heads-up). The upgrade
path is already mechanized: `npm run crashtest:bump 1.2.0` (exact-pin
install + harness run + ledger regen + pin/stamp verification in one
commit; CI runs the read-only --expect-baseline lane since pass 42, so the
committed ledger stays canonical). This issue is the reminder to run the
bump on the day 1.2.0 hits the registry -- nothing else blocks on it. New
harness module families get vocabulary audits same-lane; the poisoned
oversized-legacy probe (packs v0.4.0) is the tripwire to watch when the
KV-key contract changes shape upstream.
