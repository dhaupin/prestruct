---
layout: default
title: Roadmap
description: "What is planned next for prestruct, crosslinked to the repository roadmap and issue tracker."
nav_order: 18
version: 1.0.0
permalink: /guides/roadmap
---

Planned features and ideas for prestruct. The package is live on npm at
1.1.0 (published from the `v1.1.0` tag with provenance); main carries the
next planned release (1.2.x) until it is tagged.

## Shipped (1.1.0 state)

- CLI (`init` / `build` / `validate` / `clean`) with incremental prerender
- Incremental route cache (`.prestruct/cache/`) + per-build status snapshot
- Sitemap + opt-in robots.txt generation, including the AEO preset (`robots:
  { aeo: true }` per-vendor AI-crawler policy)
- `fetchRoutes()` build-time CMS hook
- Islands architecture and the optional bot proxy pair (VPS + Worker)
- In-repo crashtest pack (v0.4.0: five wire-level shapes; the cache-key
  variant shape seeds an oversized-query variant under the hashed key with
  the oversized legacy entry POISONED) + 54-row ledger at harness 1.1.0
  (upgrades are one command: `npm run crashtest:bump <version>`)

Shipped in 1.2.0 (version bumped on main, tag not yet cut):

- `prestruct audit [dist]` (--json / --external / --internal): the built-in
  post-build verifier; scaffolded builds end in it
- Honest per-route sitemap lastmod + XML loud-fail, 404 replacer rebuild(#33),
  trailing-slash siteUrl fixed at every URL seam (#53), CLI unknown-flag
  refusal (#54), unknown-config-key warnings (#52)
- react-router 7 prerender seam closed (#68); peer ranges bounded to the
  proven matrix (#58: react/react-dom `>=18 <19`, router `>=6 <8`,
  vite `>=5 <8`)
- Family ride-along set: `prestruct indexnow` (#36), `hooks.postBuild` (#41),
  `jsonLdDefaults` (#30), per-route `jsonLd` (#35), head discovery
  (feed/alternates/verification/SearchAction/llms.txt, #49),
  `ogImageGeneration` (#43), RRD-7 named-import interop (#29), 404 head on
  `injectMeta` (#42)
- Structured ogImage object form { url, width, height, alt, type } (#38)
- Proxy pair hardening: name-filtered VPS eviction + PRESTRUCT_CACHE_MAX_MB
  env cap; Worker hashed KV keys over the 512-byte cap
- Version truth (#70): `tests/census.test.mjs` refuses a living surface that
  drifted from the root `package.json` version; `npm run gate` runs every CI
  lane in one command
- Audit walk: Worker single-flight + concurrency limiter (parity with VPS),
  origin-checked proxy target URLs (SSRF guard), `prestruct build` ends in
  the audit, grouped-head `$$` leak fixed, 404 single-escape, per-route
  `ogImage` companions, attribute-tolerant root-div matcher, real cache-hit
  telemetry, default+named RRD rewrite, root eslint config made valid

## Planned

### Streaming SSR
Progressive streaming instead of blocking `renderToString`. Only matters once
per-request rendering exists -- build-time prerender does not need it.

### Vercel / Netlify platform support
`platform: 'vercel' | 'netlify'` currently validates but generates no
`vercel.json` / `netlify.toml` (cloudflare is the only fully supported
platform).

### Platform-matrix ceiling proof (1.3.0)
The 1.2.0 ladder bounded the peer ranges to the proven matrix (#58): react/react-dom
`>=18 <19`, router `>=6 <8`, vite `>=5 <8` (7 already graded: the example bake
under vite 7.3.7 is byte-equivalent to the vite 6 output modulo asset hashes,
audit clean, no deprecation noise; the example lane runs 7.3.7 while init
stays on 6). The 1.3.0 move is the same
proof-first shape the router 7 bump used: a matrix run in the example lane
(vite 8 -- the likely break is the `ssrLoadModule` port to the
ModuleRunner API, with AGENTS.md's bundled-render rejection rule staying the
boundary; react 19 -- interop and the island surface are the unproven parts;
vite 7 is already graded and bakes clean), graded by the 8/8 bake plus the
real audit. Both majors keep compiling after the proof, so adopters move on
their own schedule; the ceilings move when the proof lands, not before.

## P2 - Future

- Image optimization pipeline
- Smarter incremental invalidation (file-level route dependencies)
- Plugin system

## P3 - Ideas

- Component library starter
- Theme templates
- More example projects

## Propose Features

Open an issue: https://github.com/dhaupin/prestruct/issues

## Next steps

- [Changelog](/prestruct/guides/changelog) - what each release landed
- [Contributing](/prestruct/guides/contributing) - PR setup and gates
