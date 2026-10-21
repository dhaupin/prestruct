---
layout: default
title: Redirects
description: Which _redirects rules to keep and remove on Cloudflare Pages when prerendering, and why the SPA fallback loops.
nav_order: 12
version: 1.0.0
permalink: /guides/redirects
---

Managing redirects and headers on Cloudflare Pages.

Both files live in `public/` (Cloudflare Pages copies them into `dist/` at
upload time). The template ships both: `public/_redirects` (commented-only,
ready for your app rules) and `public/_headers` (a full security-header set).

## Redirects file

Add rules to `public/_redirects`:

```text
# Static redirect
/source  /destination  301

# Wildcard redirect
/blog/*  /articles/:splat  301
```

Only add rules for paths that have no prerendered `dist/path/index.html`.
Nothing else in prestruct relies on `_redirects`.

## Trailing slashes

Cloudflare Pages handles this automatically (Pretty URLs). Do not add rules
for trailing slashes -- they collide with CF's own redirect and loop infinitely.

## Headers file

`public/_headers` ships with the security set (CSP, HSTS, COOP/COEP) plus
cache rules:

```text
/*
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

Only `_assets/*`-style prefix matchers are supported -- Cloudflare Pages does
not support globs (`*.js`) in `_headers`.

## SPA fallback

Remove `/* /index.html 200` after prerendering all routes. Static HTML files
handle routes directly; keeping the fallback re-creates the infinite-redirect
loop with Pretty URLs.

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

## Next steps

- [Routing](/prestruct/guides/routing) - route paths and trailing-slash behavior
- [Cloudflare Pages](/prestruct/guides/cloudflare) - full deployment walkthrough