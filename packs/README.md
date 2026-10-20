# Packs

Adversarial attack packs for prestruct. A pack is a self-contained probe
module the [crashtest](https://github.com/dhaupin/crashtest) harness loads
against a live target: route names, method matrices, and env wiring come
from the host config (`moduleCtx`), never hardcoded in the pack.

**This repo's own pack:** [`packs/public/prestruct-proxy`](public/prestruct-proxy)
- the four-shape contract suite for the render-proxy pair
(`scripts/proxy.js` express + `scripts/proxy.worker.js` Cloudflare Worker),
crosslinked to [`crashtest.config.js`](../crashtest.config.js), which arms it
against this repo's own deployed copies.

| Shape | Contract |
|---|---|
| `method-contract-walk` | every non-GET method is a clean 405 on both runtimes |
| `malformed-target-fuzz` | hostile paths/queries fail 4xx, never 5xx or a throw |
| `bot-render-fallback` | a bot whose render is impossible still exits via the live-site 302 |
| `refresh-strict-parity` | `x-prestruct-refresh` probes never crash the surface; an unset secret means the feature is off |

## Arms (moduleCtx keys)

| Key | Value the host supplies | Example |
|---|---|---|
| `vps` | express adapter route name | `'app'` |
| `worker` | worker surface route name | `'worker'` |
| `botList` | UA tokens the target classifies as bots | `['Googlebot', 'Bingbot']` |
| `hostilePath` | optional path the target is expected to refuse | `'/as;df'` |

Operations missing a required arm degrade to a `REFUSED` skip row - the pack
never guesses or fakes coverage. Missing arms are always visible.

## Runbook

`labs/hardening.md` holds the latest results (seed, REFUSED ledger). CI rule:
fail on a NEW EXPLOITED finding, or a regression of anything previously
`REFUSED`.

See also: `README-proxy.md` for the runtime behavior these contracts pin.
