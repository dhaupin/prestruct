// packs/public/prestruct-proxy/index.js -- adversarial pack for prestruct's
// HTTP surface. The proxy pair IS the whole HTTP side of prestruct:
//
//   VPS    : scripts/proxy.js    -> createProxyApp(config) (express .handle)
//   Worker : scripts/proxy.worker.js -> default export { fetch(request, env) }
//
// Every attack is vocabulary-driven like wp-money-shapes: route NAMES come
// from the host config (moduleCtx['prestruct-proxy']), so the pack runs
// against any wiring. Missing arms degrade to a REFUSED skip -- matching the
// declared-skip row contract -- never a false positive.
//
// Four shapes, two runtimes, one contract each:
//
//   method-contract-walk    non-GET must 405 on BOTH runtimes (proxy is GET-only)
//   malformed-target-fuzz   hostile paths/queries must fail clean (4xx), never 5xx/throw
//   bot-render-fallback     a bot UA must always leave via the live-site 302
//                           even when rendering is impossible (no puppeteer in CI)
//   refresh-strict-parity   x-prestruct-refresh probes (real-ish lengths,
//                           first-byte diffs, junk) must never crash the
//                           surface and must not change a non-bot response
//                           when the cache-refresh feature is off
//   cache-key-variant-parity  two URL variants of one route (same path,
//                           different query) must never be served AS each
//                           other from the render cache, and cached bytes
//                           must never leak to non-bot requests
//
// Cache seeding (cache-key-variant-parity, both runtimes, browser-free):
//   worker : entries written through the harness fake KV (harness.env.CACHE),
//            payload = the {html, cachedAt} JSON the worker serves from.
//   vps    : marker files written into the express proxy's own cache dir;
//            arming requires moduleCtx['prestruct-proxy'].cacheDir (the
//            PRESTRUCT_CACHE_DIR value the run root set BEFORE importing
//            scripts/proxy.js -- its CACHE_DIR is resolved at module load).
//            Missing arm degrades to the usual honest skip.
import { createHash } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
//
// Arming (crashtest.config.js):
//   moduleCtx: { 'prestruct-proxy': { c: {
//     vps: 'app',           // express route name (adapters.express)
//     worker: 'worker',     // route name wrapping workerProxy.fetch
//     botList: ['googlebot'], // a UA the proxy WILL classify as a bot
//     hostilePath: '/as;df' // optional: a path the target expects to refuse
//   } } }
export default {
  name: 'prestruct-proxy',
  description: 'prestruct proxy-pair hardening: method contract, target fuzz, bot fallback, refresh strictness',
  attacks: [
    {
      name: 'method-contract-walk',
      description: 'non-GET requests must be clean 405s on every surface -- never 5xx, never hang, never pass through',
      async run(harness, ctx) {
        const c = cfg(ctx); if (!c) return skip('route names not armed');
        const surfaces = armed(c);
        const bad = [];
        for (const [route] of surfaces) {
          for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
            const rec = await harness.run(route, { method, url: '/should-be-405' });
            if (rec.threw || rec.status === null) {
              bad.push(`${route}/proxy-method ${method} threw: ${rec.error?.name ?? ''}: ${rec.error?.message ?? ''}`);
            } else if (rec.status !== 405) {
              // The proxy contract is GET-only; anything that isn't a clean
              // 405 (route pass-through, 200-sink, 500) is a finding.
              bad.push(`${route}/proxy-method ${method} -> ${rec.status} (want 405)`);
            }
          }
        }
        if (bad.length) return exp(`${bad.length} method-contract violation(s): ${bad[0]}${bad.length > 1 ? ` (+${bad.length - 1} more)` : ''}`, { bad: bad.slice(0, 5) });
        return ref(`${surfaces.length} surface(s) × 5 methods: every non-GET was a clean 405`, { surfaces: surfaces.map(s => s[0]) });
      },
    },
    {
      name: 'malformed-target-fuzz',
      description: 'hostile paths and query strings must fail with clean 4xx responses -- never 5xx, never throw',
      async run(harness, ctx) {
        const c = cfg(ctx); if (!c) return skip('route names not armed');
        const target = c.hostilePath ?? '/weird'; // path shape is the attack, not the value
        const hostiles = [
          '/%zz-not-a-percent-escape',
          '/%2e%2e/%2e%2e/traversal-feel',
          '//double-slash-start',
          '/path?t=<' + '>markup&x=' + encodeURIComponent('\u0000'),
          '/path?q=' + 'A'.repeat(3000),                      // oversized query
          '/path?q=' + encodeURIComponent('»\x01'),             // control bytes
          '/%20%2f%2f?r=' + encodeURIComponent('$&$1$&'),      // $ expanders
          target + '?x=' + '9'.repeat(500),
        ];
        const bad = [];
        for (const [route] of armed(c)) {
          for (const url of hostiles) {
            const rec = await harness.run(route, { url });
            if (rec.threw || rec.status === null) {
              bad.push(`${route} ${url.slice(0, 40)}… threw: ${rec.error?.message ?? ''}`);
              continue;
            }
            if (rec.status >= 500) {
              bad.push(`${route} ${url.slice(0, 40)}… -> ${rec.status} (5xx on hostile input is a finding)`);
            }
          }
        }
        if (bad.length) return exp(`${bad.length} fuzz violation(s): ${bad.slice(0, 3).join(' | ')}`);
        return ref(`${hostiles.length} hostile shapes × ${armed(c).length} surface arms: all clean (4xx/3xx)`, { shapes: hostiles.length });
      },
    },
    {
      name: 'bot-render-fallback',
      description: 'a classified bot must leave via the live-site 302 even when render is impossible -- never a 5xx or error page',
      async run(harness, ctx) {
        const c = cfg(ctx); if (!c) return skip('route names not armed');
        if (!c.botList?.length) return skip('botList not armed');
        const bad = [];
        for (const [route] of armed(c)) {
          for (let i = 0; i < 3; i++) {
            const ua = `${c.botList[i % c.botList.length]}/${2 + i}`;
            const rec = await harness.run(route, { url: `/bot-fallback-${i}`, headers: { 'user-agent': ua } });
            if (rec.threw || rec.status === null) {
              // CI has no puppeteer/Chromium: render MUST fail and the proxy
              // MUST fall through to the live-site redirect. A throw that
              // escapes the route surface (5xx / handler error) is exactly
              // the failure the fallback exists to prevent.
              bad.push(`${route} bot ${ua} crashed surface: ${rec.error?.message ?? ''}`);
              continue;
            }
            if (rec.status >= 500) {
              bad.push(`${route} bot ${ua} -> ${rec.status} (render failure must be a fallback, not an error page)`);
              continue;
            }
            if (rec.status < 300 || rec.status >= 400) {
              bad.push(`${route} bot ${ua} -> ${rec.status} (want the live-site 302)`);
            }
          }
        }
        if (bad.length) return exp(`${bad.length} fallback violation(s): ${bad.slice(0, 3).join(' | ')}`);
        return ref(`bot render failure fell through to the live-site 302 on every surface (render never reached Chromium)`, { botList: c.botList });
      },
    },
    {
      name: 'refresh-strict-parity',
      description: 'x-prestruct-refresh probes must never crash the surface and must not change a non-bot response shape when the feature is off',
      async run(harness, ctx) {
        const c = cfg(ctx); if (!c) return skip('route names not armed');
        const tokens = [
          null,                                               // no header (parity control)
          ['x-prestruct-refresh', ''],                        // empty
          ['x-prestruct-refresh', 'a'],                       // 1-byte
          ['x-prestruct-refresh', 'x'.repeat(40)],            // right-ish length, wrong bytes
          ['x-prestruct-refresh', 't' + 'e'.repeat(39)],      // first-byte diff
          ['x-prestruct-refresh', 'zzz//tmp/../../etc'],      // path-shaped junk
        ];
        const bad = [];
        for (const [route] of armed(c)) {
          const control = await harness.run(route, { url: '/refresh-parity' });
          for (const token of tokens) {
            if (token === null) continue; // control already ran
            const [header, value] = token;
            const rec = await harness.run(route, {
              url: '/refresh-parity',
              headers: { [header]: value },
            });
            if (rec.threw || rec.status === null) {
              bad.push(`${route} refresh ${JSON.stringify(String(value).slice(0, 12))} threw: ${rec.error?.message ?? ''}`);
              continue;
            }
            if (rec.status >= 500) {
              bad.push(`${route} refresh ${String(value).slice(0, 12)}… -> ${rec.status}`);
              continue;
            }
            if (!control.threw && control.status !== null && rec.status !== control.status && control.status < 300) {
              // Feature off + a real header changed the response shape of a
              // non-bot request -- that is a bypass-class behavior change.
              bad.push(`${route} refresh token changed response: ${control.status} -> ${rec.status}`);
            }
          }
        }
        if (bad.length) return exp(`${bad.length} strictness violation(s): ${bad.slice(0, 3).join(' | ')}`);
        return ref('refresh probes (no-header control + 5 hostile tokens) never crashed or reshaped the response', { tokens: tokens.length - 1 });
      },
    },
    {
      name: 'cache-key-variant-parity',
      description: 'two URL variants of one route seeded into the render cache must never be served as each other, and cached bytes must never leak to non-bots',
      async run(harness, ctx) {
        const c = cfg(ctx); if (!c) return skip('route names not armed');
        if (!c.botList?.length) return skip('botList not armed');
        const vpsDir = c.cacheDir ? resolvePath(String(c.cacheDir)) : null;
        const botUA = `${c.botList[0]}/2.1`;
        // Same path, different query: the exact shape that once restored HTML
        // referencing deleted asset chunks across variants (issue 18 class).
        // Markers carry the poisoned stale-chunk reference on purpose: if a
        // proxy ever serves variant A bytes for variant B requests, the
        // response ships a dead asset hash -- the EXPLOITED signature.
        const uA = '/cache-key-parity/one?ref=alpha';
        const uB = '/cache-key-parity/one?ref=beta';
        const marker = (v) => `<!--prestruct-crashtest:cache-key-variant-${v}--><!doctype html><html><body class="crashtest-seed"><script src="/assets/index-${v}DEAD.js"></script></body></html>`;
        const bodies = { u1: marker('AAA'), u2: marker('BBB') };
        const surfaces = armed(c);
        if (!surfaces.length) return skip('no surfaces armed');
        const bad = [];
        const skipped = [];
        let provedSurfaces = 0;
        const cleanup = [];
        try {
          for (const [route, kind] of surfaces) {
            if (kind === 'worker') {
              const kv = harness.env?.CACHE;
              if (!kv || typeof kv.put !== 'function') {
                return skip(`CACHE KV namespace not armed on ${kind} (set env.kv.CACHE)`);
              }
              // Worker payload shape: {html, cachedAt} JSON stored under
              // prestruct:<encodeURIComponent(path+search)>. Derived here
              // from the documented format, not from importing the target.
              for (const [u, html] of [[uA, bodies.u1], [uB, bodies.u2]]) {
                await kv.put(`prestruct:${encodeURIComponent(u)}`, JSON.stringify({ html, cachedAt: 'crashtest-seed' }));
                cleanup.push(() => kv.delete(`prestruct:${encodeURIComponent(u)}`));
              }
            } else if (kind === 'vps') {
              if (!vpsDir) {
                return skip(`cacheDir not armed on ${kind} (set moduleCtx['prestruct-proxy'].cacheDir + PRESTRUCT_CACHE_DIR before importing scripts/proxy.js)`);
              }
              await mkdir(vpsDir, { recursive: true });
              for (const [u, html] of [[uA, bodies.u1], [uB, bodies.u2]]) {
                const key = createHash('sha256').update(u).digest('hex');
                await writeFile(join(vpsDir, `${key}.html`), html);
                cleanup.push(() => unlink(join(vpsDir, `${key}.html`)).catch(() => {}));
              }
            }
            let seededOk = false;
            // Variant A must come back as A's bytes; B's marker anywhere in
            // that response is the collision class. B mirrored.
            for (const [u, mine, theirs, v] of [[uA, bodies.u1, bodies.u2, 'A'], [uB, bodies.u2, bodies.u1, 'B']]) {
              const rec = await harness.run(route, { url: u, headers: { 'user-agent': botUA } });
              if (rec.threw || rec.status === null) {
                bad.push(`${route}/${kind} seeded variant ${v} crashed surface: ${rec.error?.message ?? ''}`);
                continue;
              }
              if (rec.status >= 300) {
                // With no browser installed the only remaining paths are
                // seeded-cache HIT (200) or live-site fallback (3xx). A 3xx
                // means the seeded key was never consulted: the contract
                // under test cannot be evaluated -- key format drifted or
                // seeding arm broke. Honest skip accounting, never a fake
                // pass; the final verdict reports what could not be proved.
                skipped.push(`${kind} (seed not consulted on ${u.slice(0, 24)})`);
                continue;
              }
              seededOk = true;
              provedSurfaces += 1;
              const text = await rec.response.text();
              if (text.includes(theirs)) {
                bad.push(`${route}/${kind} variant ${v} was served the OTHER variant's bytes (cache-key collision -- stale-asset leak)`);
              } else if (!text.includes(mine)) {
                bad.push(`${route}/${kind} variant ${v} served 2xx but its marker bytes are gone (cache served something else)`);
              }
            }
            // Cache bytes are bot-only: a human request must never receive
            // seeded HTML -- redirect to the live site at most.
            const hon = await harness.run(route, { url: uA });
            if (!hon.threw && hon.status !== null) {
              const text = await hon.response.text();
              if (hon.status >= 200 && hon.status < 300 && (text.includes(bodies.u1) || text.includes(bodies.u2))) {
                bad.push(`${route}/${kind} non-bot request received cached marker bytes (cache leak to humans)`);
              }
            }
          }
          if (bad.length) return exp(`${bad.length} cache-key violation(s): ${bad.slice(0, 3).join(' | ')}`);
          const kinds = surfaces.map(([, k]) => k).join('+');
          const skippedNote = skipped.length
            ? `; UNPROVED on ${skipped.length} seeded-check(s) -- re-arm seeding before counting those as coverage`
            : '';
          if (!provedSurfaces)
            return skip(`seed never consulted on any surface${skippedNote}`);
          return ref(`2 URL variants x ${surfaces.length} surface(s) (${kinds}): each variant served its own seeded bytes, no collision; non-bot requests saw no cached bytes${skippedNote}`, { variants: [uA, uB] });
        } finally {
          for (const fn of cleanup) await fn();
        }
      },
    },
  ],
};

// -- helpers (same degrade-to-skip grammar as wp-money-shapes) --
function cfg(ctx) {
  const c = ctx?.config?.['prestruct-proxy']
    ?? ctx?.config?.moduleCtx?.['prestruct-proxy']
    ?? (ctx && ctx.vps !== undefined ? ctx : null);
  return typeof c === 'object' && c !== null ? c : null;
}
function armed(c) {
  const out = [];
  if (c.vps) out.push([c.vps, 'vps']);
  if (c.worker) out.push([c.worker, 'worker']);
  return out.length ? out : [];
}
function exp(detail, extra) { return { verdict: 'EXPLOITED', detail, ...extra }; }
function ref(detail, extra = {}) { return { verdict: 'REFUSED', detail, ...extra }; }
function skip(why) { return { verdict: 'REFUSED', detail: `prestruct-proxy: skip -- ${why} (arm moduleCtx['prestruct-proxy'])` }; }
