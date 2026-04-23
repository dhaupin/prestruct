---
layout: default
title: Cloudflare Pages
nav_order: 8
---


Deploying prestruct sites to Cloudflare Pages.

## Why Cloudflare Pages?

- **Free tier**: Unlimited requests, sites, and bandwidth
- **Edge network**: 300+ data centers globally
- **Zero config**: Git push to deploy
- **Security**: Automatic HSTS, CSP, and DDoS protection

## Quick Deploy

1. Push your code to GitHub
2. Go to [Cloudflare Dashboard → Pages](https://dash.cloudflare.com/pages)
3. Click "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `18`
6. Click "Save and Deploy"

## Configuration

### Environment Variables

In Cloudflare Pages settings, add:

| Variable | Value |
|----------|-------|
| `PRODUCTION` | `true` |
| `NODE_VERSION` | `18` |

### For Proxy Support

If using the proxy feature, add these in Cloudflare:

1. **PRESTRUCT_TARGET_URL**: Your origin URL (e.g., `https://api.example.com`)
2. **PRESTRUCT_SECRET**: Your auth secret (add as a secret, not variable)

## Security Headers

Prestruct includes `public/_headers` with these security policies:

```
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

```
/old-page/ /new-page/ 301

/beta / 302
```

**Important:** Don't include `/* /index.html 200` - this causes infinite redirect loops with prerendered sites.

## Pretty URLs

Cloudflare Pages Pretty URLs automatically handles trailing slashes:
- `/about` → serves `/about/index.html`
- `/about/` → serves `/about/index.html`

No redirect rules needed - just be consistent in your `ssr.config.js` route paths.

## Custom Domains

1. Go to Cloudflare Dashboard → Pages → Your project → Custom domains
2. Click "Set up a custom domain"
3. Enter your domain
4. Create a CNAME record pointing to yourPages subdomain

Cloudflare handles SSL automatically.

## Cache Invalidation

### Automatic

Cloudflare automatically purges cache when you redeploy.

### Manual

Send a cache-busting request:

```bash
curl -H "x-prestruct-refresh: your-secret" https://your-domain.com/path
```

Requires `PRESTRUCT_SECRET` to be set.

## Troubleshooting

### Build fails

- Check Node.js version is set to 18+
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

Dashboard → Analytics → Pages

### Cloudflare Speed

Check Core Web Vitals at:
https://dash.cloudflare.com/{zone}/speed

### Error Logs

Dashboard → Cloudflare Pages → Your project → Deployment logs

## Limits

- **Build timeout**: 30 minutes (free), 60 minutes (paid)
- **Build memory**: 512MB (free), 8GB (paid)
- **File size**: 100MB per file
- **Deployments**: Unlimited

## Best Practices

1. **Use a monorepo?** Set the root directory in Pages settings
2. **Environment-specific config:** Use different `ssr.config.js` via environment
3. **Preview deployments:** Cloudflare creates preview URLs for PRs
4. **Branch protection:** Configure in GitHub, not Cloudflare