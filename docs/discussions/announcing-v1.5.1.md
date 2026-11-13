---
version: 1.5.1
permalink: /discussions/announcing-v1.5.1/
layout: default
title: "Announcing prestruct v1.5.1"
comments: false
nav_order: 26
---
# prestruct v1.5.1

prestruct is a build-time SEO prerender tool for Vite + React apps. v1.5.1 is a distribution fix with no engine-surface change: the `prestruct-proxy` crashtest pack now rides the published tarball, so a consumer who arms it by an exact npm pin actually receives it. It will be on npm at tag time:

```bash
npm i -D prestruct
```

## What landed

**The pack rides the published tarball (poststruct#79).** `package.json` `files` listed `bin/`, `engine/`, and `init/` (plus the `!init` negations), but not `packs/`. npm honours `files`, so `npm pack` shipped zero pack bytes and `npm i prestruct` installed a tree with no `node_modules/prestruct/packs/`. The `prestruct-proxy` pack - the five wire-level contracts for the bot-proxy pair (method matrix, hostile-path fuzz, bot-render 302 fallback, refresh-secret parity, cache-key variant parity) - was committed and linted yet undeliverable, because the family arms every verdict by an EXACT npm pin.

`packs/` joins the whitelist, so a consumer arms `node_modules/prestruct/packs/public/prestruct-proxy` from the pin. The publish lane's verify job and `tests/release-verify.test.js` pass `--allowed "packs/"` - the family-default forbidden scan refuses `packs/` by prefix, so the flag de-asserts exactly that drift. `tests/distribution.test.mjs` pins the two halves of the contract, so a refactor that drops the whitelist fails CI instead of a consumer's install. The README's "the pack travels with the checkout, not the npm tarball" line is retired: a cherry-picker can now point `crashtest.config.js` at `node_modules/prestruct/packs`.

## Quality layer

The four-stage pipeline (validate, vite build, inject-brand, prerender) is unchanged. The battery, the docs audit, the engine sync check, the pack lint, and the claims scan all run on every push and pull request; this round changed distribution, not the engine, so no new pins were needed and none regressed.

## Links

- Repo and docs: https://github.com/dhaupin/prestruct / https://prestruct.creadev.org
- npm: https://www.npmjs.com/package/prestruct
- Changelog: https://github.com/dhaupin/prestruct/blob/main/CHANGELOG.md
- Issues: https://github.com/dhaupin/prestruct/issues
