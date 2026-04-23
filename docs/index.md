---
title: Documentation
layout: default
nav_order: 1
---

# prestruct Docs

> Static site generation for Cloudflare Pages with prerendered React apps

## Overview

**prestruct** is a minimal build tool that turns your React app into pre-rendered static HTML files perfect for Cloudflare Pages. It handles SEO meta tags, sitemap generation, security headers, and edge performance.

## Getting Started

```bash
npx degit dhaupin/prestruct/example my-site
cd my-site && npm install
npm run build
npm run preview
```

## Guides

<div class="guide-cards">

### [Performance →](guides/performance)
Core Web Vitals optimization, bundle sizing, image best practices.

### [SEO →](guides/seo)
Meta tags, structured data, sitemap, 404 handling, robots directives.

### [Routing →](guides/routing)
Trailing slashes, dynamic routes, redirects, route configuration.

</div>

## Why Cloudflare Pages?

- **Free** - Unlimited requests, sites, and bandwidth
- **Edge** - 300+ global data centers  
- **Zero config** - Git push to deploy
- **Security** - Automatic HSTS, CSP, and more

## Project Structure

```
my-site/
├── ssr.config.js      # Route config, meta, schema
├── public/            # Static assets
├── src/               # React source
├── scripts/           # Prerender logic
└── dist/              # Build output
```

## Resources

- [GitHub](https://github.com/dhaupin/prestruct)
- [Issues](https://github.com/dhaupin/prestruct/issues)