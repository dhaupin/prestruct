---
layout: default
title: What Prestruct is
description: "Two Node scripts after vite build: inject-brand stamps the shell, prerender writes each route to its own HTML with per-route head tags, plus 404 and sitemap."
nav_order: 26
version: 1.2.0
permalink: /what
---

# What Prestruct is

prestruct is a build step. It adds two Node scripts that run after
`vite build`, take about two seconds, and leave a `dist/` that crawlers can
read.

## The build step

```bash
vite build \
  && node scripts/inject-brand.js \
  && node scripts/prerender.js
```

`inject-brand.js` reads `ssr.config.js` and writes the global title,
description, Open Graph, Twitter Card, and JSON-LD into the shell.
`prerender.js` renders each route through `AppLayout` in a `StaticRouter`,
stamps per-route head tags, and writes `dist/<route>/index.html`, plus
`404.html` and a fresh `sitemap.xml`.

## What you configure

One file: `ssr.config.js`. It carries the site identity (URL, name, author,
tagline, Open Graph image) and the route list, where each route names its path
and the head tags it should bake. That list is the contract the prerender
walks.

## What it does not change

Your Vite config, your React components, and your client bundle. The one
structural change is extracting `AppLayout` from `App.jsx` so both the client
and the prerender can import it. `BrowserRouter` stays in `App.jsx` only -
anywhere the prerender loads it, every route renders as the homepage.

<div class="crosslinks">
<p><strong>Next:</strong>
<a href="{{ '/about' | relative_url }}">how it works</a> ·
<a href="{{ '/guides/architecture' | relative_url }}">architecture</a></p>
</div>
