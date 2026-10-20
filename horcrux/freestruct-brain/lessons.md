# lessons.md

Empty by design until the rehaul passes produce learnings. Seed rules from
the sibling prestruct rehaul that freestruct should NOT have to relearn:

- Never destructure a boolean return (prestruct CLI ate three silent exit-1s
  that way).
- packaging claims are fiction until proven by an installed-package run, not
  a repo run (prestruct tarball e2e discipline).
- Any behavioral fix lands with a fixture-based regression test in the same
  commit - the CHANGELOG's 0.3.1 "gap-filling" release is what refactor-driven
  regression looks like without a test suite.
- Report-only lint/check features must have a strictness profile or they
  degrade into decoration (freestruct#4).
