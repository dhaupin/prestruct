---
layout: default
title: Redirects
nav_order: 12
version: 1.0.0
permalink: /guides/redirects
---

Managing redirects and headers on Cloudflare Pages.

## Redirects file

Create `_redirects` in your project root:

```text
# Static redirects
/source  /destination  301

# Wildcard redirects
/blog/*  /articles/:splat  301
```

## Trailing slashes

Cloudflare Pages handles this automatically. Do not add rules for trailing slashes.

## Headers file

Create `_headers` to set cache and security headers:

```text
# Cache static assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# HTML pages - no cache
/*
  Cache-Control: no-cache
```

## Security headers

```text
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

## SPA fallback

Remove `/* /index.html 200` after prerendering all routes. Static HTML files handle routes directly.

## Test locally

Use wrangler to test before deploying:

```bash
wrangler pages dev dist
```

## Deploy

Deployments automatically upload `_redirects` and `_headers`:

```bash
wrangler pages deploy dist
```