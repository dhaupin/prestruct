---
title: prestruct Documentation
description: "Complete documentation for prestruct: build-time SEO prerender for Vite + React apps on Cloudflare Pages."
layout: default
nav_order: 0
version: 1.0.0
permalink: /
---


> Static site generation for Cloudflare Pages with prerendered React apps

## Overview

**prestruct** is a minimal build tool that turns your React app into pre-rendered static HTML files perfect for Cloudflare Pages. It handles SEO meta tags, sitemap generation, security headers, and edge performance.

## Getting Started

```bash
# In an existing Vite + React project
npm i -D prestruct
npx prestruct init          # never clobbers existing files
cp ssr.config.example.js ssr.config.js
npx prestruct build
```

## Guides

<div class="guide-cards">

<a href="guides/performance" class="guide-card">
<h4>Performance</h4>
Core Web Vitals optimization, bundle sizing, image best practices.
</a>

<a href="guides/seo" class="guide-card">
<h4>SEO</h4>
Meta tags, structured data, sitemap, 404 handling, robots directives.
</a>

<a href="guides/routing" class="guide-card">
<h4>Routing</h4>
Trailing slashes, dynamic routes, redirects, route configuration.
</a>

<a href="guides/config" class="guide-card">
<h4>Config</h4>
Full `ssr.config.js` reference: routes, meta, islands, JSON-LD, proxy.
</a>

<a href="guides/getting-started" class="guide-card">
<h4>Getting Started</h4>
From an empty Vite app to a deployed prerendered site in minutes.
</a>

<a href="guides/cli" class="guide-card">
<h4>CLI</h4>
`prestruct init / build / validate / clean` and the template npm scripts.
</a>

</div>

## Why Cloudflare Pages?

- **Free** - Unlimited requests, sites, and bandwidth
- **Edge** - 300+ global data centers
- **Zero config** - Git push to deploy
- **Security** - Automatic HSTS, CSP, and more

## Project Structure

```text
my-site/
|-- ssr.config.js      # Route config, meta, schema
|-- public/            # Static assets
|-- src/               # React source
|-- scripts/           # Prerender logic
`-- dist/              # Build output
```

## Resources

- [GitHub](https://github.com/dhaupin/prestruct)
- [Issues](https://github.com/dhaupin/prestruct/issues)