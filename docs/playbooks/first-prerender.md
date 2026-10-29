---
layout: default
title: First prerender
description: "From an empty Vite app to a deployed prerendered site: install, init, configure, build, audit, and ship."
nav_order: 25
version: 1.2.0
permalink: /playbooks/first-prerender/
---

# First prerender: an empty app to a baked site

Install, scaffold, configure, and bake. Every command is a CLI verb; every
check is the build's own audit.

```bash
npm i -D prestruct
npx prestruct init
cp ssr.config.example.js ssr.config.js
# edit ssr.config.js: siteUrl, siteName, appLayoutPath, and the routes array
npx prestruct build
```

`prestruct init` copies the starter files and never clobbers an existing one;
a rerun prints `skip` for each file already present. `prestruct build` runs the
whole pipeline: validate, `vite build`, inject-brand, prerender every route,
`hooks.postBuild`, then audit. A FAIL-class finding fails the build.

The structural change the build expects is one extracted file. `AppLayout.jsx`
holds the routes and imports no router; `App.jsx` wraps it in `BrowserRouter`.
The prerender loads `AppLayout` directly, so it must never reach a
`BrowserRouter` import. See [Architecture](/prestruct/guides/architecture) for
why.

Inspect the baked tree and grade it again on its own:

```bash
npx prestruct audit            # per-page head hygiene, sitemap, robots, 404
ls dist/                       # dist/index.html, dist/<route>/index.html, dist/404.html
```

Deploy the `dist/` output to any static host. On Cloudflare Pages the build
command is `npx prestruct build` and the output directory is `dist`; the
[Cloudflare Pages](/prestruct/guides/cloudflare) guide covers `_headers` and
`_redirects`.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/playbooks/' | relative_url }}">all playbooks</a></p>
</div>
