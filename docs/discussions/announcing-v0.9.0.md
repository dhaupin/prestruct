---
version: 0.9.0
permalink: /discussions/announcing-v0.9.0/
layout: default
title: "Announcing prestruct v0.9.0"
comments: false
nav_order: 22
---

# prestruct v0.9.0

prestruct is a build-time SEO prerender tool for Vite + React apps. v0.9.0 is the first npm publish, the manual bootstrap release that put the package on the registry. It is on npm now:

```bash
npm i -D prestruct
```

## What 0.9.0 is

0.9.0 is the internal v1.0.0 lock renamed down for the bootstrap ladder. Behavior is identical to that lock: the point of this release is to land the package on npm by hand, because OIDC Trusted Publishing cannot create a brand-new package name - the first publish has to come from a manual dispatch. After it lands, the version returns to 1.0.0 and the `v1.0.0` tag drives the first tag-based publish with provenance.

The pipeline this release ships is the one described in full in the [v1.0.0 announcement](/prestruct/discussions/announcing-v1.0.0/): validate, `vite build`, inject-brand, and prerender, run from one `prestruct build` command.

## What ships in the package

The npm tarball is 35 files (~68 KB packed), in three directories:

| Directory | Purpose |
| --- | --- |
| `bin/` | The `prestruct` CLI: `init`, `build`, `validate`, `clean` |
| `engine/` | Build pipeline: prerender, inject-brand, validate-config, islands runtime, usePageMeta hook |
| `init/` | Project scaffold: AppLayout, usePageMeta, islands registration, ssr.config.example.js, vite/vitest configs, proxy scripts |

`init` copies files into your project only if they do not already exist. It never clobbers. Peer dependencies (react, react-dom, react-router-dom, vite) resolve from your project, not the package. Node >= 18 required.

## The release ladder

0.9.x is the manual bootstrap ladder, landed by hand. The governed ladder begins at 1.0.0: tag v1.x.0 and `publish.yml` runs over npm Trusted Publishing with provenance attestations tied to the repo and workflow. The full runbook lives in `.github/workflows/publish.yml` in the repository.

## Getting started

In an existing Vite + React project:

```bash
npm i -D prestruct
npx prestruct init
cp ssr.config.example.js ssr.config.js   # edit siteUrl + routes
npx prestruct build
```

`init` scaffolds the layout, hook, islands registration, example config, and proxy scripts. `build` produces `dist/`. Deploy `dist/` to Cloudflare Pages or any static host, and every route is real HTML before any JavaScript executes.

## Links

- npm: <https://www.npmjs.com/package/prestruct>
- Live demo (built with prestruct, source in `example/`): <https://prestruct.creadev.org>
- Docs: <https://docs.creadev.org/prestruct>
- GitHub: <https://github.com/dhaupin/prestruct>
- Issues: <https://github.com/dhaupin/prestruct/issues>
- Full changelog: <https://github.com/dhaupin/prestruct/blob/main/CHANGELOG.md>
