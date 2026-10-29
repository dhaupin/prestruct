---
layout: default
title: CI guide
description: "What runs on prestruct's own CI - the test battery, the engine-sync leg, the crashtest pack campaign, the docs deploy, and the tag-driven release lane. Where to look when a run goes red."
nav_order: 24
version: 1.2.0
permalink: /ci
---

# CI guide

prestruct's CI is a set of independent legs. Each one is honest alone and
deterministic: no leg needs another leg's output to judge its own result, and
a red docs deploy never holds the test battery. This page maps every leg to
its workflow file and names where to look first when a run goes red.

The receipts below are the workflow files under `.github/workflows/`, the
scripts under `scripts/`, and the source under `engine/`. When this prose and
a workflow disagree, the workflow wins - fix the prose.

## The battery (test.yml)

Runs on every pull request and every push to `main`. It is the leg that proves
the engine, the template, and the configured example.

| step | leg | what it proves |
|------|-----|----------------|
| `npm install` | root install | the dev tree resolves |
| `cd init && npm install` | template install | the shipped scaffold resolves |
| `npm run test:run` | vitest spine | engine, template, proxy, and CLI-refusal tests pass |
| `npm run lint:docs && npm run lint:claims` | docs audit | the five docs gates plus the fiction-signature scan |
| `cd init && npm run lint` | template eslint | the shipped scaffold lints clean |
| `cd init && npm run build` | template build | the scaffold builds without a config (named skip) |
| `cd example && npm install && npm run build` | example build + audit | the tracked configured project builds and ends in a real audit |

Two behaviors are worth naming because they are contract, not convenience:

- The unconfigured scaffold build is expected to pass. `init/scripts/audit-if-configured.cjs`
  refuses with a named skip when `ssr.config.js` is absent, so `prestruct init`
  then `npm run build` is green before any configuration exists.
- The example build ends in `prestruct audit`, so a regression in the baked
  head fails CI, not only a local build.

The battery also uploads `init/dist/` and `coverage/` as artifacts on every
run, pass or fail.

## The engine-sync leg (engine-sync-check.yml)

Runs on every pull request and push to `main`. It byte-compares the synced
engine files between `init/` and `example/`:

```text
scripts/inject-brand.js
scripts/prerender.js
scripts/audit.js
scripts/validate-config.js
src/hooks/usePageMeta.js
src/islands.js
```

A mismatch fails with the drifting file named and a `diff -u` of the two
copies. The fix is never to hand-edit `example/`: edit `engine/`, run
`node scripts/sync-engine.mjs`, and commit the regenerated copies.

## The crashtest leg (crashtest.yml)

Runs on every pull request, push to `main`, and manual dispatch. It attacks
both shipped proxy runtimes in-process through the committed
`crashtest.config.js`:

- `adapters.express` drives `init/scripts/proxy.js` through `createProxyApp(config)`
- `routes.worker` drives `init/scripts/proxy.worker.js` through `fetch(request, env)`

The run never opens a socket, and no browser is installed on purpose:
puppeteer imports fail closed, which is the contract the pack's
bot-render-fallback row pins (a render failure must fall through to the
live-site 302, not crash).

The gate rule is the same one `labs/hardening.md` documents: exit 0 unless a
new EXPLOITED finding appears or something previously REFUSED regresses.
`labs/hardening.md` is the human-first report; the ledger row names the
attack. The harness is pinned by an exact devDependency that tracks the
version the committed ledger was cut with - bump it with
`npm run crashtest:bump <version>` and commit `package.json`,
`package-lock.json`, and `labs/` together.

## The docs lane (docs.yml)

Runs on a push to `main` that touches `docs/**`, `.github/workflows/docs.yml`,
or `package-lock.json`, and on manual dispatch. The pipeline:

```text
Jekyll build (Ruby 3.4, kramdown + rouge)
  -> freestruct --strict (SEO layer over docs/_site)
  -> pinned pagefind (search index)
  -> GitHub Pages deploy
```

The site lands at `docs.creadev.org/prestruct`. `docs/_config.yml` pins
`baseurl: "/prestruct"`, and `docs/freestruct.config.yml` sets
`site.url: https://docs.creadev.org` with `basePath: /prestruct`, so every
canonical reads `https://docs.creadev.org/prestruct/<page>`. Putting the
prefix in both `site.url` and `basePath` doubles it, so keep `site.url` as
the origin.

The freestruct step runs with `linkCheck: false`. Its link checker resolves
root-absolute `/prestruct/...` hrefs against the artifact root and fails
every baseurl'd nav - tracked upstream as `dhaupin/freestruct#32`. Restore the
check when that lands.

The Jekyll stack runs locally with no root. The recipe (prebuilt Ruby, a
rootless `libyaml`, shimmed binstubs, `BUNDLE_PATH` outside the tree) is in
`labs/TASKS.md` under pass 61. `npm run lint:docs` is the node-only slice and
runs anywhere.

## The release lane (publish.yml)

A version tag drives one lane. `publish.yml` fires on `v*` and is the npm
trust ladder in three jobs:

- `publish` (OIDC trusted publishing; the `prepublishOnly` gate rides the
  publish, so a red gate cannot mint a tarball).
- `release` (mints the GitHub release from the same tag, its notes extracted
  from the matching `CHANGELOG.md` section).
- `verify` (the post-publish truth).

The `release` job cuts the GitHub release with `gh release create`, its body
the changelog section for the version. It is idempotent: an existing release
object carries on to verify. There is no separate release workflow and no
release archive -- the tag, the npm tarball, and the GitHub release are the
same version, matching the family shape (eyestruct).

The `verify` job is the part that makes a green publish mean something. It
runs `scripts/verify-release.cjs` twice:

```bash
node scripts/verify-release.cjs --npm --version "$V" --exports "$KEYS" --probe "$PROBE"
node scripts/verify-release.cjs --gh --tag "v$V"
```

The `--npm` half checks that the registry's latest equals this tree's
version, that the served tarball's sha512 matches the registry integrity
metadata, that provenance attestations exist, and then runs the full pack
ladder on the served tarball. The `--gh` half checks that the release object
exists for the tag, that its target commit equals `git rev-parse tag^{commit}`,
and that the source tarball's file list diffs byte-identical against
`git archive` of that commit.

A manual dispatch of `publish.yml` with mode `verify-only` runs the verify
job alone against what is already published and released.

## The gate aggregate (npm run gate)

`npm run gate` is the single pre-push loop. It runs every leg the split
workflows run, in one command:

```bash
npm run gate
```

`prepublishOnly` is set to `npm run gate`, so the release lane cannot mint a
tarball from a tree with a red gate. Use it locally before every push; the
split workflows exist so CI can attribute a failure to one leg, not because
the aggregate is weaker.

## When a run is red, look here first

| failing leg | first place to look |
|-------------|---------------------|
| `npm run test:run` | run the suite locally; failures are named and temp-dir isolated |
| `npm run lint:docs` | the gate line names the file and the field |
| `npm run lint:claims` | the fiction-signature hit names the line and the stale pattern |
| `cd init && npm run lint` | the eslint rule and line are named |
| engine-sync-check | the drifting file is named with a `diff -u`; edit `engine/` and re-sync |
| crashtest | `labs/hardening.md` is the report; the ledger row names the attack |
| docs deploy | the strict run names the page; check the baseurl shape first |
| publish verify | the disconnect is named: wrong dist-tag, drifted tarball, missing provenance, wrong release commit |

Every leg is independent by design. A red pixel-free docs deploy does not hold
the battery, and a red crashtest row does not hold the docs lane.
