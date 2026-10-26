---
version: 1.1.0
permalink: /discussions/announcing-v1.1.0
layout: none
title: "Announcing prestruct v1.1.0"
comments: false
nav_order: 22
---
# prestruct v1.1.0


prestruct is a build-time SEO prerender tool for Vite + React apps. v1.1.0 is a compatibility and hardening release on top of the 1.0.0 pipeline: the scaffold compiles on react-router-dom 7 as well as 6, engine files gained deep-import exports, the test battery moved to vitest 5, and the release archive now proves itself from the downloaded artifact. It is on npm now:

```bash
npm i -D prestruct
```

No config changes are required to stay on 1.0.0 behavior. Everything below is cumulative on the four-stage build pipeline (validate, vite build, inject-brand, prerender) described in the v1.0.0 announcement.

## react-router-dom 7 scaffolding

Vite's SSR loader rejects named imports from v7's CJS entry, and node's CJS interop namespace only reliably carries `default` (v7 is not an ESM package, unlike v6). The scaffold's router imports are now namespace-form:

```js
import * as rrdNS from 'react-router-dom'
const rrd = rrdNS.default ?? rrdNS
const { BrowserRouter } = rrd
```

This compiles identically on both majors. Touched files: the engine `usePageMeta` hook (shipped synced), `init/` App and AppLayout, and the example app. Both majors stay tested: the init template battery stays pinned on v6 while the shipping example now runs v7 (which also clears the open redirect and constructor injection advisories on the 6.x line) and builds 8/8 pages under react-router-dom 7.18.4 + vite 6.4.5.

Projects that cherry-picked `init/` files should put the same import form in their own `src/App.jsx` and `src/AppLayout.jsx` before adopting v7. Doing nothing on v6 is fine; the change is backward-compatible.

## Deep engine imports are part of the exports contract

1.0.0 exported only the spec entries (`prestruct`, `prestruct/bin`, `prestruct/engine/scripts/prerender.js`, etc). Deep paths like `prestruct/hooks` failed with `Missing specifier in "prestruct" package`. The exports map now includes:

```js
import { usePageMetaWithRouter } from 'prestruct/hooks'
import { mountIslands } from 'prestruct/islands'
// prestruct/engine/* passthrough: every engine file is importable
```

The documented default is still the scaffold-relative import (`../hooks/usePageMeta.js` from `src/`). The deep form is for host projects that want to pin to the npm package instead of owning copied files.

## Test battery on vitest 5, tinypool pinned

- Root, init, and the release battery all run vitest ^5.0.5 against vite
6.4.5. The remaining vitest 2.x audit finding class (UI-server critical, mocker pickle, vitest's private vite 5.4 copy) is removed rather than accepted: nothing in the suite touches those surfaces. Root battery: 147/147. Template battery: 141/141.
- The critical tinypool prototype-pollution RCEs (GHSA-5gmw-xhrv-c9v3,
GHSA-85c8-ppgw-ccpr; affected through 2.1.2) are pinned off with an `overrides` entry (`tinypool: "^2.2.0"`) at root and init, and the release workflow injects the same override into the zip battery.
- Every workflow that installs sets `PUPPETEER_SKIP_DOWNLOAD=1`: no test
drives a real browser (the render path is asserted to fail closed), so the ~170 MB Chromium fetch and its extract-zip/basic-ftp chain never executes at install time.
- The init template's `test:ui` script is gone. `@vitest/ui` was never a
dependency and vitest 2.x's UI server carries a critical advisory while listening; the script could not run as-is.

Consumer exposure was already zero on 1.0.0: the published manifest has no runtime dependencies, and a package's devDependencies are never installed for its consumers. This pass hardened the repo's own build and CI trees.

## Crash-test pack, documented

The repo carries `packs/public/prestruct-proxy` (v0.3.0), an attack pack for [dhaupin/crashtest](https://github.com/dhaupin/crashtest) that hits the bot proxy surfaces: method contract walks, malformed target fuzzing, bot-render fallback behavior, refresh-secret strict parity, and cache-key variant parity. Latest results live in the repo as `labs/hardening.md` and `labs/crashledger.json` (35 REFUSED, 0 EXPLOITED on the current pass).

The README documents adoption in one line from another repo's `crashtest.config.js`:

```js
packs: ['/abs/path/to/checked-out/prestruct/packs']
```

Note: the pack travels with the checkout only. The npm tarball ships `bin/`, `engine/`, and `init/` and never includes `packs/`.

The pack's v0.3.0 addition, `cache-key-variant-parity`, pins the issue-18 fix class at the wire level on both proxy runtimes: it seeds marker cache entries (KV for the Worker variant, disk files via `PRESTRUCT_CACHE_DIR` for the express variant), then asserts each URL variant serves only its own bytes and no cached byte reaches a non-bot request. If the seeded key is never consulted, the row reports exactly which surfaces it could not prove instead of claiming a pass.

## The release archive tests itself, from the artifact

1.0.0's GitHub zip shipped a test battery that could not run: repo tests import `../engine/...`, which does not exist inside the template. v1.1.0's pipeline remaps those imports to the template layout, injects the full test devDependency set, and runs the battery inside `init/` before zipping.

That gate then caught its own sequel within the same release: a `cp dir/. dest/` shell line needs `-r` on GNU cp, the error was swallowed behind `2>/dev/null || true`, and the first v1.1.0 zip went out shipping the raw engine-relative imports again. The in-`init/` battery passed anyway, because inside `init/` the remapped paths do resolve. The fixed workflow no longer re-copies raw repo tests over the remapped ones, and before publishing the release it unzips its own archive and runs the battery from the artifact tree as a hard gate. The shipped zip is verified standalone at 141/141; the npm tarball stays at its 35-file whitelist shape.

## Provenance

Releases publish from the tag pipeline (`.github/workflows/publish.yml`) via GitHub Actions with npm provenance attestations. The publish job is idempotent: re-firing a tag that is already live skips the publish instead of failing. Also on npm:

```bash
npm view prestruct version   # 1.1.0
```

## Upgrading

For a project scaffolded by 1.0.0:

1. `npx prestruct init` re-copies nothing you did not remove; diff your
`src/App.jsx`, `src/AppLayout.jsx`, and `src/hooks/usePageMeta.js` against the new `init/` if you want the dual-major import form now.
2. Optional: move the battery to vitest 5 and add
`overrides: { tinypool: "^2.2.0" }` (see the changelog for the full devDep set the release battery proves).
3. Nothing config-facing changed. `ssr.config.js` shape, route schema,
islands, proxy contract, and CLI are all unchanged from 1.0.0.

Between 1.0.0 and 1.1.0 the example also picked up `npm audit fix` bumps (browserslist, @remix-run/router) for its own runtime tree; that configuration does not carry into your project.

## Known limits

Unchanged from 1.0.0 by design: build-time prerender only (no runtime, edge, or streaming SSR), Vercel/Netlify config validates but does not generate host files, react-router-dom v6 and v7 both supported with the prerender loader falling back across majors.

## Links

- npm: <https://www.npmjs.com/package/prestruct>
- Live demo (built with prestruct, source in `example/`):
<https://prestruct.creadev.org>
- Docs: <https://docs.creadev.org/prestruct>
- GitHub: <https://github.com/dhaupin/prestruct>
- Changelog: <https://github.com/dhaupin/prestruct/blob/main/CHANGELOG.md>
