---
layout: default
title: Hardening & Packs
description: "The adversarial crashtest pack for the proxy pair: what it probes, how to read the report, and CI rules."
nav_order: 24
version: 1.0.0
permalink: /guides/hardening
---

An adversarial test harness attacks the only HTTP surface prestruct ships --
the render-proxy pair -- plus the repo's own catalog of attack packs.

## Crashtest targets

`crashtest.config.js` (repo root) attacks both deployed runtimes in-process:

- **VPS express:** `scripts/proxy.js` via `createProxyApp(config)` (`.handle`)
- **Worker:** `scripts/proxy.worker.js` via its default `{ fetch(request, env) }` export

The deployed copies (`init/scripts/*`) are the ones attacked, because that is
what a scaffolded project actually ships; CI keeps them byte-identical to the
engine sources via the sync checker.

The config deliberately runs two failure conditions as contracts, not accidents:

- `PRESTRUCT_SECRET` unset (script cwd and fake worker env) - cache-refresh
  must mean "feature off", never "allow all"
- no puppeteer installed - an unrenderable bot must fall through to the
  live-site 302 rather than 5xx

## Attack packs

Attack packs live in [`packs/`](https://github.com/dhaupin/prestruct/tree/main/packs)
- self-contained probe modules the crashtest harness loads against a live
target (see `packs/README.md`). Since crashtest v0.3 packs are the one
extension surface: a pack directory is self-contained, an adopting repo
points its config's `packs:` knob at it - one line, and rows still label
the source pack. The repo's own pack, `packs/public/prestruct-proxy`, pins
four contracts on the proxy pair:

| Shape | Contract |
|---|---|
| `method-contract-walk` | every non-GET method is a clean 405 on both runtimes |
| `malformed-target-fuzz` | hostile paths/queries fail 4xx, never 5xx or a throw |
| `bot-render-fallback` | an unrenderable bot still exits via the live-site 302 |
| `refresh-strict-parity` | `x-prestruct-refresh` probes never crash the surface; an unset secret means the feature is off |

Packs are vocabulary-driven: route names, method matrices, and env wiring come
from the host config's `moduleCtx`, so a pack runs against any wiring. A
missing arm becomes a `REFUSED` skip row - always visible, never a false pass.
Adoption into another repo is one config line
(`packs: ['/abs/path/to/prestruct/packs']`) plus the `moduleCtx` vocabulary;
see `packs/README.md` for the exact block.

## Reading a hardening report

`labs/hardening.md` is the latest report (crashtest version, seed, ledger).
CI rule: fail on a NEW EXPLOITED finding, or a REGRESSION of anything
previously `REFUSED`. `REFUSED` means the attack was both attempted and
cleanly survived; `SKIP` means the target does not declare that surface
(declare the route in `moduleCtx` to arm it).

## Limits of current coverage

- The pack exercises the HTTP contract layer only; Chromium's own render path
  is not exercised in CI (no browser in CI).
- Auth, rate-limit, and input probes are skipped until the harness target
  declares matching routes - prestruct ships no authenticated surfaces.

## Next steps

- [Bot-Render Proxy](/prestruct/guides/proxy) - the runtime under attack
- [Getting Started](/prestruct/guides/getting-started) - build pipeline that produces the static surface
