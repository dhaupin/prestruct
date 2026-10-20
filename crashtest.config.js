// crashtest.config.js — prestruct's own crash-test target.
//
// The proxy pair IS prestruct's whole HTTP surface (everything else is
// build-time/CLI code), so the harness attacks both runtimes in-process:
//
//   adapters.express -> scripts/proxy.js    createProxyApp(config) (.handle)
//   routes.worker    -> scripts/proxy.worker.js  default export {fetch(request, env)}
//
// Deliberately NOT armed in this run:
//   - PRESTRUCT_SECRET is unset (script cwd env) and absent for the fake
//     worker env — cache-refresh is OFF on both runtimes, which is exactly
//     the behavior `refresh-strict-parity` pins (an unset secret must mean
//     "feature off", never "allow all").
//   - puppeteer/@cloudflare/puppeteer are not installed — the render paths
//     MUST fail and fall through to the live-site 302; `bot-render-fallback`
//     turns that into a contract instead of an accident.
//
// The deployed copies (init/scripts/*) are attacked, not the engine/ ones:
// they are what a scaffolded project actually ships. CI keeps them
// byte-identical to the engine sources via tests/qc.test.mjs.
import { createProxyApp } from './init/scripts/proxy.js'
import workerProxy from './init/scripts/proxy.worker.js'

const VPS_CONFIG = {
  siteUrl: 'https://prestruct-site.local',
  proxy: { botList: ['Googlebot', 'Bingbot'] },
}

export default {
  baseUrl: 'https://prestruct-crash.local',
  adapters: { express: createProxyApp(VPS_CONFIG) },
  routes: {
    worker: ({ request, env }) => workerProxy.fetch(request, env),
  },
  env: {
    var: { PRESTRUCT_TARGET_URL: 'https://prestruct-target.local' },
    kv: { CACHE: {} }, // the Worker's real KV binding, as a deterministic fake
  },
  moduleCtx: {
    'prestruct-proxy': {
      vps: 'app',
      worker: 'worker',
      botList: ['Googlebot', 'Bingbot'],
    },
  },
  // Crashtest v0.3+ pack model: the run root's own packs/public/ and
  // packs/local/ are discovered automatically — `packs: true` is that
  // default spelled out. An ADOPTING repo (any other repo running crashtest
  // against prestruct as a target) needs exactly one line instead:
  //   packs: ['/abs/path/to/prestruct/packs']   // whole checkout
  // or, once the pack ships as an npm package, its installed dir. Labels
  // still carry the source: rows read pack:public/prestruct-proxy.
  packs: ['./packs'],
  seed: 0xC0FFEE,
}
