# Beta trial: dhaupin/gistory + the three nested staging trees (2026-10-26)

Trial run outside the prod workflow: the gistory repo is cloned to
`beta/gistory` (gitignored; nothing in the npm payload, no dependency added).
Gistory carries three sibling beta projects as nested staging trees, all
struct-family members. This file holds the exercise receipts; the pass log
(TASKS) holds the summary.

## The three betas and their premises

- **poststruct-staging** (0.9.0): audits BAKED html output -- files on disk
  only, zero deps. Shares the prestruct/freestruct spinal contract: prestruct
  puts SEO in before the build, freestruct injects after an SSG, poststruct
  checks what shipped. `prestruct-shapes` is OUR OWN first M1 customer pack.
- **monoforge-staging** (0.9.0): the family factory (`new/doctor/lock/cut`);
  its doctor battery is the premise prestruct must satisfy as a fleet tree.
- **eyestruct-staging** (0.9.0): the visual ledger (`look/diff/gate/raster`);
  premises prestruct's shipped visual artifacts must survive: strict parse +
  render + byte-size sanity; committed `.eyes/` memory; documented refusal
  names (no crash-as-error-path).

## Exercise receipts

1. **eyestruct raster gate vs prestruct's og-image.svg: PASS** (55,462 bytes
   opaque). Command ran from the repo root against
   `example/public/og-image.svg` via the staging CLI
   (`bin/eyestruct.js raster`). The PNG sibling is refused as `RASTER_BAD_XML`
   by the strict SVG parser -- correct behavior (it is a PNG; the gate's
   refusal names the reason rather than guessing; receipt 4 of the eyestruct
   PRD working as designed). What made the SVG PASS here: the pass-32
   re-rasterization round (resvg + explicit font buffers) left a clean,
   strictly-parseable artifact. The premise holds against prestruct's shipped
   visual state.
2. **poststruct audit vs prestruct's baked `init/dist`: 1 FAIL + 4 WARN** --
   FAIL = robots.txt missing; WARNs = 41-char description, og:image dims
   absent, no JSON-LD, no h1. `init/dist` is the bare template shell (not a
   configured project), so FAILs there are EXPECTED for an unconfigured
   shell; the example build is the real audit target (0 fails / 0 warns per
   pass 33).
3. **prestruct audit on the same `init/dist`: 0 FAIL + 4 WARN** -- the WARN
   ladders line up (41-char description, og dims absent, h1); prestruct adds
   its own og-image-points-at-placeholder warn. THE DIVERGENCE: poststruct
   FAILs missing robots.txt unconditionally; prestruct grades robots ONLY
   when `config.robots` is set (documented contract: the author-owned copy is
   never engine-graded). Not a bug in either -- but it means the future
   `prestruct-shapes` pack poststruct ships (M1) must encode the robots
   opt-in contract, or it would false-FAIL every prestruct site that
   deliberately opts out of engine robots. Recording this now = the pack gets
   the contract right on day one.
4. **poststruct CLI verb bug found (beta bug, not a prestruct bug)**: the
   documented `poststruct audit dist` form cannot work -- `bin/cli.mjs`
   treats the literal `audit` verb as the directory argument
   (`args.find(a => !a.startsWith('-'))` picks `'audit'` first), producing
   "No audit/ directory" + exit 2. The engine itself runs fine when the verb
   is dropped (`bin/cli.mjs init/dist --json`). Also the `--module` filter is
   parsed as `(args.find(...), null)` -- always null (comma operator), so the
   flag is silently ignored. Both belong to poststruct upstream; paste-ready
   for a gistory/poststruct-staging comment or PR.
5. **monoforge doctor vs prestruct (scoped: beta clone stashed)**: 5 FAIL +
   1 WARN. Four are doctor false-positive classes (see below); ONE is a real
   premise gap prestruct closed in this pass:
   - **CLOSED: publish-gate** -- prestruct's `publish.yml` now carries the
     0.x-refusal step (same contract as the stamped-repo template): a
     `v0.*` tag exits the workflow with a named refusal instead of
     publishing through the OIDC lane. prestruct's ladder starts at 1.0.0;
     a 0.x tag would be a mis-tag.
   - **UPSTREAM (monoforge doctor false-positive classes):**
     a) exports-path check flags `./engine/*` -- the doctor's files check
        exempts `*` globs but the exports check does not, and
        `./engine/*` is valid exports-map semantics (deep-import
        passthrough documented in the 1.1.0 announcement).
     b) files-path check flags `!init/node_modules` / `!init/dist` /
        `!init/.prestruct` -- negation patterns are npm's documented
        exclude mechanism and the belt-and-braces excludes from the
        tarball lesson (npm pack uses DISK state; whitelist is the
        contract, .npmignore the backstop). The doctor treats them as
        positive paths.
     c) dash-law + `walkFiles` scan `beta/` -- the doctor's skip set is
        only `['.git', 'node_modules', 'docs/_site']`; it does not honor
        .gitignore, so untracked scratch trees land in the battery.
        prestruct's own prose is dash-clean (every dash row pointed at the
        beta clone).
     d) git-dirty WARN is honest (the .gitignore line adding `beta/`).
6. **eyestruct `MISSING_RENDER` receipt**: before the optional
   `@resvg/resvg-js` was installed (in the beta tree only), the raster gate
   refused with the named reason-code, never a stack trace. That is the
   eyestruct refusal contract honoring itself -- and the same shape
   prestruct's audit/gates already follow (named reasons, exit 2 for
   capability gaps).

## Verdicts

- prestruct supports the eyestruct premise on shipped raster artifacts
  (raster PASS) and matches the family refusal-name contract.
- prestruct supports the poststruct premise (shared audit core) with ONE
  documented contract divergence (robots opt-in) that the shapes pack must
  carry.
- prestruct now satisfies the monoforge doctor premise that was honestly
  actionable (0.x publish refusal); the remaining four FAILs are doctor
  false-positive classes to hand upstream, not prestruct defects.
- poststruct beta itself ships two CLI bugs (verb swallowing, dead --module
  flag) worth a paste-ready upstream note.

## Install-state notes (the honest "beta" part)

- `gistory-sync` is NOT on npm (registry 404) despite the README install
  line -- the engine must be taken from the repo tree; the npm ladder the
  PRD describes (manual 0.9.0 bootstrap then OIDC) has not fired yet.
- The staging trees carry their own batteries but `npm i` was not run in
  them (zero-dep CLIs ran with plain node; `@resvg/resvg-js` was installed
  with `--no-save` inside the beta tree only).
- Nothing from `beta/` is committed: `.gitignore` gained the `beta/` line;
  the npm payload whitelist is untouched.
