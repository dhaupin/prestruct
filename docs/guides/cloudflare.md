---
layout: default
title: Cloudflare Pages
description: "Deploying a prerendered site on Cloudflare Pages: build command, output directory, headers, redirects, and 404 wiring."
nav_order: 8
version: 1.0.0
permalink: /guides/cloudflare
---


Deploying prestruct sites to Cloudflare Pages.

Build command is either the CLI (`npm run build` with `prestruct build` as the
script, see [CLI Reference](/prestruct/guides/cli)) or the scaffolded three-step script from the
template (`vite build && node scripts/inject-brand.js && node
scripts/prerender.js`). Both produce identical `dist/` output.

## Why Cloudflare Pages?

- **Free tier**: Unlimited requests, sites, and bandwidth
- **Edge network**: 300+ data centers globally
- **Zero config**: Git push to deploy
- **Security**: Automatic HSTS, CSP, and DDoS protection

## Quick Deploy

1. Push your code to GitHub
2. Go to [Cloudflare Dashboard -> Pages](https://dash.cloudflare.com/pages)
3. Click "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `20` (any >= 18 works; 20 is the safe default)
6. Click "Save and Deploy"

## Configuration

### Environment Variables

In Cloudflare Pages settings, add:

| Variable | Value |
|----------|-------|
| `NODE_VERSION` | `20` |

Set `PRESTRUCT_STRICT=1` if you want the Pages build to FAIL on config
diagnostics instead of degrading to an SPA deploy (default off -- Pages
deployments never break on a bad `ssr.config.js`). Config errors are printed
as `[prestruct] config: ...` lines either way.

### For Proxy Support

The bot proxy is a separate deployment (VPS or Worker), not a Pages setting --
see [README-proxy.md](https://github.com/dhaupin/prestruct/blob/main/README-proxy.md) for the full VPS / Cloudflare
Worker runbook. Pages only cares once it exists: `inject-brand.js` then adds
the proxy origin to `connect-src` in `dist/_headers` automatically, so the
only Pages-side change is nothing.

## Security Headers

Prestruct includes `public/_headers` with these security policies:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:

/*
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

Update the CSP `connect-src` to include any third-party APIs your app uses.

## Redirects

Use `public/_redirects` for redirects:

```text
/old-page/ /new-page/ 301

/beta / 302
```

**Important:** Don't include `/* /index.html 200` - this causes infinite redirect loops with prerendered sites.

## Pretty URLs

Cloudflare Pages Pretty URLs automatically handles trailing slashes:
- `/about` -> serves `/about/index.html`
- `/about/` -> serves `/about/index.html`

No redirect rules needed - just be consistent in your `ssr.config.js` route paths.

## Custom Domains

1. Go to Cloudflare Dashboard -> Pages -> Your project -> Custom domains
2. Click "Set up a custom domain"
3. Enter your domain
4. Create a CNAME record pointing to yourPages subdomain

Cloudflare handles SSL automatically.

## Cache Invalidation

Cloudflare automatically purges the Pages cache on every redeploy -- there is
nothing to configure. `dist/` HTML files carry no long-lived cache headers, so
browsers revalidate against the current deploy.

The `x-prestruct-refresh` header you may have seen in the docs is the RENDER
PROXY's cache-bust endpoint, not a Pages feature. It flushes cached bot
renders on the VPS/Worker proxy -- see
[README-proxy.md](https://github.com/dhaupin/prestruct/blob/main/README-proxy.md).

## Troubleshooting

### Build fails

- Check Node.js version is set to 20+
- Ensure all dependencies are in `package.json`
- Verify build command matches local: `npm run build`

### 404 on all routes

- Ensure `public/_redirects` exists (even if empty)
- Check build output went to `dist/`

### Assets not loading

- Verify `dist/` contains `assets/` folder
- Check asset paths in HTML match actual files

### Infinite redirect

- Remove `/* /index.html 200` from `_redirects`

## Advanced: Cloudflare Workers

For dynamic routes that can't be prerendered, use Cloudflare Pages Functions:

```js
// functions/[[path]].js
export async function onRequestGet({ params }) {
  const path = params.path?.join('/') || ''
  
  // Fetch from CMS, database, etc.
  const data = await fetch(`https://api.example.com/${path}`)
  
  return new Response(data.body, {
    headers: { 'Content-Type': 'text/html' }
  })
}
```

## Monitoring

### Cloudflare Analytics

Dashboard -> Analytics -> Pages

### Cloudflare Speed

Check Core Web Vitals at:
https://dash.cloudflare.com/{zone}/speed

### Error Logs

Dashboard -> Cloudflare Pages -> Your project -> Deployment logs

## Limits

- **Build timeout**: 30 minutes (free), 60 minutes (paid)
- **Build memory**: 512MB (free), 8GB (paid)
- **File size**: 100MB per file
- **Deployments**: Unlimited

## Next steps

- [Config reference](/prestruct/guides/config) -- routes, meta, islands, JSON-LD
- [CLI reference](/prestruct/guides/cli) -- prestruct init/build/validate/clean
- [Bot proxy](/prestruct/guides/proxy) -- dynamic-route coverage for bots