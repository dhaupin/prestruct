# Handoff: issue draft for dhaupin/flowforge

Body is paste-ready for `dhaupin/flowforge` Issues (this workspace has no
write auth for the flowforge tracker). Written for the family's cross-repo
post shape: terse, evidence-first, no marketing.

Title: `repair-404.cjs can retire at the next pin bump - the upstream #33 fix is in prestruct main (1.2.0 ladder)`

---

## Summary

`scripts/repair-404.cjs` exists as a receipt for an upstream prestruct bug
(MANIFEST.md says so itself: `'UPSTREAM prestruct bug receipt ... engine
generate404() uses function replacers whose return strings carry literal
$1/$2`). That bug is fixed in dhaupin/prestruct `main`, first release that
carries it is prestruct 1.2.0 (version ladder already pinned; tagged
releases publish from `v*` tags per repo convention).

The workaround's own retirement trigger is in your table: `'RETIRE this
script at the pin bump that carries the #33/#42 fix'`. The #33 half is now
the case: once prestruct 1.2.0 is on npm and flowforge pins `prestruct@^1.2.0`,
the shim can go.

## Evidence (prestruct side)

- Fix commits landed on `main` (Pass 28, 2026-10-26):
  - group-aware replacers in `generate404()` - og:title, twitter:title,
    description, canonical rebuilt from capture groups, no `$1`/`$2` in
    returned strings ever;
  - live-verified prerendered 404 output: zero `$1`/`$2` bytes in
    `dist/404.html`, all four tags carry real values;
  - battery-pinned: `tests/engine.test.js` greps the 404 contract; 160/160
    green on the commit that carries the fix.
- prestruct#33 is CLOSED on the prestruct tracker (closed-by commit).

## What you do at the bump (your own receipt's words)

1. Bump the flowforge prestruct pin (`^1.0.0` -> `^1.2.0` once the tag ships)
   and re-verify `web/` receipts per MANIFEST's review rule.
2. Delete `scripts/repair-404.cjs` and its step in the `web` build chain
   (`prestruct build` + assert). The assert stays valuable - it can move
   into the build as a plain check if you want the tripwire to keep firing.
3. Drop the receipt row (or flip it to `retired at` with the commit that did
   it - whatever your MANIFEST house style does for retirements).

Note the one still-open half: prestruct#42 (generate the 404 through the
injection pipeline) remains OPEN upstream - your shim's engine file became
safe in Pass 28, and #42 is the root-architectural follow-up, not a
regression risk.

## Crosslink

- prestruct#33 (closed): https://github.com/dhaupin/prestruct/issues/33
- The Pass 28 entry in dhaupin/prestruct `labs/TASKS.md` carries the
  evidence trail (red->green test pair, live 404 grep, e2e).
