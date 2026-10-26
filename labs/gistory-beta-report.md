# Beta report for dhaupin/gistory (paste-ready issue body)

> Paste-ready: this workspace has no GitHub write auth (anonymous API is
> rate-limited, no credential helper in the shell) -- the fleet convention is
> paste-ready reports until write access exists. Written against
> gistory@2a92d6c as cloned 2026-10-26 by the prestruct beta trial
> (pass 40; full receipts: labs/beta-gistory-trial.md).

---

**Title:** Beta trial report from prestruct: 3 staging trees exercised, 2 CLI bugs found in poststruct, 4 monoforge doctor false-positive classes, 1 npm install-line gap

**Body:**

Ran a full beta trial of gistory's three nested staging trees from the
prestruct side (cloned to a gitignored scratch dir, outside the prod
workflow). Context: prestruct is the family's source-time prerender leg, so
we exercised your premises specifically against **prestruct's own shipped
artifacts and contracts**.

## What worked (beta feedback, positive)

1. **The refusal contracts behave exactly as your PRDs promise.**
   - eyestruct refused a PNG fed to `raster` with the named reason
     `RASTER_BAD_XML` ("does not parse as strict SVG/XML") and refused
     before the optional renderer install with `MISSING_RENDER`
     ("install the optional @resvg/resvg-js package") -- both no stack
     trace, correct exit codes. Receipt 4 ("no crash-as-error-path") and
     the exit contract held on first contact.
2. **The eyestruct raster gate passes prestruct's shipped artwork.**
   `bin/eyestruct.js raster example/public/og-image.svg` -> `raster OK
   (55,462 bytes opaque)`. That artifact was born from the same premise set
   (resvg + strict parse + byte-size sanity), so the assessor agreement
   across repos is a real receipt, not a courtesy pass.
3. **monoforge's doctor battery is genuinely useful on a non-stamped
   tree.** Scoped run against prestruct surfaced one honest, actionable
   gap we fixed on our side within the day: our `publish.yml` now refuses
   `v0.*` tags with a named error (the family ladder premise: 0.x is the
   manual-bootstrap era; the OIDC lane publishes 1.0.0+ only). Camellia's
   regexes did exactly their job; see false-positive classes below for the
   rest.
4. **The shared audit-core convergence is proving out.** poststruct's
   engine audited our baked `init/dist`: 1 FAIL (robots.txt missing) + 4
   WARN; prestruct's own audit on the same tree agreed on the entire WARN
   ladder (41-char description, og:image dims absent, no h1) and added its
   og-image-points-at-placeholder warn. One deliberate divergence, caught
   early: prestruct grades robots **only when `config.robots` is set**
   (the author-owned copy is never engine-graded; that contract is pinned
   in our tests). Recording it now so poststruct's M1 `prestruct-shapes`
   pack encodes the opt-in rather than false-FAILing every prestruct site
   that deliberately opts out of engine robots.

## Bugs / gaps found (beta feedback, actionable)

**B1 -- poststruct (staging tree): the documented CLI form cannot work.**
`bin/cli.mjs` treats the literal `audit` verb as the directory argument:

```js
const dirArg = args.find(a => !a.startsWith('-')) || 'dist'
```

With `args = ['audit', 'dist', ...]`, `dirArg` is `'audit'`, and the run
dies with `poststruct: No audit/ directory - run the build first.` (exit 2)
-- the README-documented `npx poststruct audit dist/` form never reaches
the engine. The engine itself is fine; calling via `node bin/cli.mjs dist
--json` runs clean. Fix shape: skip the leading verb
(`args.slice(1).find(...)`) or drop the verb from dispatch.

**B2 -- poststruct (staging tree): `--module` is parsed as a comma
operator and always null.**

```js
const moduleFilter = (args.find(a => args[args.indexOf(a) + 1] === '--module') , null)
```

The trailing `, null` makes the whole expression always null, so the
documented `--module x` filter is silently ignored. Looks like an editing
artifact; worth a dedicated test so it stays fixed.

**B3 -- monoforge doctor: three false-positive classes against valid
package.json semantics.** (Ran `monoforge doctor .` from prestruct's
tree, beta clone stashed.)

- The **exports-path** check doesn't exempt `*` glob patterns the way the
  files-path check does. prestruct's valid
  `./engine/*` deep-import passthrough (documented in our 1.1.0
  announcement) FAILs as "does not exist".
- The **files-path** check treats **negation patterns** (`!init/node_modules`,
  `!init/dist`, `!init/.prestruct`) as positive paths. Those are npm's
  documented exclude mechanism and deliberately birthday-proof excludes
  from our tarball lesson (whitelist is the contract, .npmignore the
  backstop). Skipped by `f.includes('*')` only -- `!` prefix needs the
  same exemption.
- The **walkFiles skip set** is `['.git', 'node_modules', 'docs/_site']` --
  it doesn't honor `.gitignore`, so untracked scratch trees land in the
  battery. The first unscoped run produced ~37 dash-law rows, ALL pointing
  into our (gitignored) clone of your repo; prestruct's own prose is
  dash-clean. A `.gitignore`-honoring skip (even the cheap
  `fs.readFileSync(dir + '/.gitignore')` prefix scan) would fix the class.

**B4 -- gistory (the repo itself): README advertises an install that
404s.** `npm i gistory-sync` yields `E404 Not Found` on the registry today
(checked 2026-10-26). The PRD's manual 0.9.0-then-OIDC ladder presumably
hasn't fired yet; until then the README's install line will send every
curious visitor to a 404. Either gate the line with "coming soon", or add
a workaround install (e.g. `npm i github:dhaupin/gistory#main`, which we
have not verified works as an npm specifier for this layout).

## Environment notes

- The three staging CLIs are zero-dep and ran with plain node (no `npm i`
  in the beta trees). Only `@resvg/resvg-js` was installed, `--no-save`,
  inside the beta tree.
- Clone target: `https://github.com/dhaupin/gistory` at `2a92d6c`
  (2026-10-26). The "monoforge ferry" commits all transmit cleanly.

Happy to keep exercising the next staging cuts; prestruct's side (publish
0.x gate + the robots-contract note for `prestruct-shapes`) already
landed on dhaupin/prestruct@856a389 with full receipts in
labs/beta-gistory-trial.md.
