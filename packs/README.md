# Packs

Adversarial attack packs for prestruct. A pack is a self-contained probe
module the [crashtest](https://github.com/dhaupin/crashtest) harness loads
against a live target: route names, method matrices, and env wiring come
from the host config (`moduleCtx`), never hardcoded in the pack.

**This repo's own pack:** [`packs/public/prestruct-proxy`](public/prestruct-proxy)
(v0.3.0) - the five-shape contract suite for the render-proxy pair
(`scripts/proxy.js` express + `scripts/proxy.worker.js` Cloudflare Worker),
crosslinked to [`crashtest.config.js`](../crashtest.config.js), which arms it
against this repo's own deployed copies.

## Adopting this pack in another repo (crashtest v0.3+)

Packs are the one extension surface: a pack directory is self-contained
(manifest + entry scenario module; optional bundled `plugins` imports live
in the pack manifest). An adopting repo needs exactly one line - no shims,
no per-scenario config; loaded rows still label their source:

```js
// crashtest.config.js in the adopting run root
export default {
  routes: buildRoutes(),
  packs: ['/abs/path/to/prestruct/packs'],   // whole checkout, or one pack dir
  moduleCtx: {
    'prestruct-proxy': {                     // vocabulary: route surface names
      vps: 'app',
      worker: 'worker',
      botList: ['Googlebot', 'Bingbot'],
    },
  },
}
```

`packs/public/` + `packs/local/` under the run root are also discovered
automatically (`packs: true`); the `packs:` knob accepts absolute paths and
npm-installed pack dirs. Inventory from a run root with `npx crashtest packs`
(or `--json` for the machine blob); un-armed vocabulary degrades to
`REFUSED`-skip rows that name the missing `moduleCtx` key - never a false
positive.

| Shape | Contract |
|---|---|
| `method-contract-walk` | every non-GET method is a clean 405 on both runtimes |
| `malformed-target-fuzz` | hostile paths/queries fail 4xx, never 5xx or a throw |
| `bot-render-fallback` | a bot whose render is impossible still exits via the live-site 302 |
| `refresh-strict-parity` | `x-prestruct-refresh` probes never crash the surface; an unset secret means the feature is off |
| `cache-key-variant-parity` | two URL variants of one route (same path, different query), seeded into the render cache, are each served only their own bytes; cached bytes never leak to non-bot requests |

## Arms (moduleCtx keys)

| Key | Value the host supplies | Example |
|---|---|---|
| `vps` | express adapter route name | `'app'` |
| `worker` | worker surface route name | `'worker'` |
| `botList` | UA tokens the target classifies as bots | `['Googlebot', 'Bingbot']` |
| `hostilePath` | optional path the target is expected to refuse | `'/as;df'` |
| `cacheDir` | the express proxy's disk-cache dir (set `PRESTRUCT_CACHE_DIR` BEFORE importing `scripts/proxy.js`; also export it into `moduleCtx`) -- arms cache seeding on the VPS arm | `'.prestruct_cache'` |

Operations missing a required arm degrade to a `REFUSED` skip row - the pack
never guesses or fakes coverage. Missing arms are always visible.

## Runbook

`labs/hardening.md` holds the latest results (seed, REFUSED ledger). CI rule:
fail on a NEW EXPLOITED finding, or a regression of anything previously
`REFUSED`.

See also: `README-proxy.md` for the runtime behavior these contracts pin.
