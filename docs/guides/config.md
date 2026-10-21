---
layout: default
title: Configuration
description: Full ssr.config.js reference: siteUrl, siteName, routes and per-route meta, robots, proxy, and fetchRoutes.
nav_order: 3
version: 1.0.0
permalink: /guides/config
---


Complete reference for `ssr.config.js` and environment variables.

## ssr.config.js

The config file controls routing, SEO metadata, and build behavior.

```js
// ssr.config.js
export default {
  // === Site Identity ===
  siteUrl: 'https://example.com',        // Required. No trailing slash
  siteName: 'Example',                   // Site name for OG tags
  author: 'Your Name',                   // Author for meta tags
  tagline: 'Your site tagline',          // Short description
  ogImage: 'https://example.com/og.png', // Default OG image
  keywords: 'keyword1, keyword2',        // Comma-separated
  
  // === App Configuration ===
  appLayoutPath: '/src/AppLayout.jsx',   // Path to your AppLayout component
  
  // === Routes ===
  routes: [
    {
      path: '/',                         // Route path (required)
      priority: '1.0',                   // Sitemap priority (0.0-1.0)
      changefreq: 'weekly',              // Sitemap change frequency
      meta: {                            // Page-specific meta
        title: 'Home | Example',
        description: 'Homepage description',
      }
    }
  ],
  
  // === Structured Data ===
  buildJsonLd() {
    // Return array of JSON-LD objects
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Example',
        url: 'https://example.com',
      }
    ]
  },
  
  // === Optional: Proxy Configuration ===
  proxy: {
    url: 'https://proxy.example.com',    // Proxy server URL (gates the CSP update)
    targetUrl: 'https://target.com',     // Origin to render (optional)
    botList: ['googlebot', 'bingbot'],   // User-agents to proxy
    // Auth secret is an ENV VAR, not config: PRESTRUCT_SECRET.
    // Unset secret = cache-refresh disabled entirely (feature off, not open).
  }
}
```

The proxy pipeline reads two more values from the environment...
see [Bot-Render Proxy](/prestruct/guides/proxy) for the full deployment story.

## fetchRoutes() hook (build-time CMS routes)

Add an async `fetchRoutes()` to `ssr.config.js` and the prerender merges its
result with your static routes at build time -- never in the browser:

```js
async fetchRoutes() {
  const posts = await fetch('https://your-cms.com/api/routes').then(r => r.json())
  return posts.map(post => ({
    path: `/blog/${post.slug}`,
    priority: '0.6',
    meta: { title: post.title, description: post.excerpt },
  }))
}
```

Merge contract: static and fetched routes are deduped by `path`, with the
**static entry winning collisions**; fetched routes are appended after the
static ones. Returning nothing (or an empty list) leaves the static routes
unchanged. Runs once per build; a hook that throws fails the prerender like
any other render input.

## Route Configuration

Each route in the `routes` array supports:

```js
{
  path: '/about/',                    // Route path (required, must start with /; unique)
  priority: '0.8',                    // Sitemap priority, number or string, 0-1 (default 0.5)
  changefreq: 'monthly',              // Options: daily, weekly, monthly, yearly (default monthly)
  meta: {
    title: 'About | Example',         // Page title
    description: 'About page desc',   // Meta description
    ogImage: '/about-og.jpg',         // Optional: override config.ogImage for this route
  }
}
```

`meta.title` and `meta.description` land in every route's baked HTML (title,
description, OG, and Twitter tags) and are re-applied on SPA navigation by
`usePageMeta`. There are no per-route `noindex` or `canonical` overrides:
404 pages carry noindex automatically, and canonical URLs are derived from
`siteUrl` + the route path.

## Environment Variables

### Build time

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SITE_URL` | Base URL read by `usePageMeta` when no explicit siteUrl is passed | `https://staging.example.com` |
| `PRESTRUCT_STRICT=1` | Fail (exit 1) on config-validation diagnostics; off by default, where diagnostics only print and the build continues | - |

### Proxy runtime (set where the proxy runs, not in the Pages app)

| Variable | Description | Example |
|----------|-------------|---------|
| `PRESTRUCT_SECRET` | Shared secret for the x-prestruct-refresh cache bust | (wrangler secret) |
| `PRESTRUCT_TARGET_URL` | Worker-only: origin to render (replaces config) | `https://origin.example.com` |

## Platform

`platform` selects host behavior. One value is fully supported today:

| Value | Status |
|-------|--------|
| `cloudflare` (default) | Template ships `public/_headers` + `public/_redirects`; inject-brand appends the proxy origin to the CSP allow-list when `config.proxy.url` is set. |
| `vercel` / `netlify` | Accepted by config validation, but no host-config generation is implemented yet. `vercel.json` / `netlify.toml` are NOT emitted -- do not configure these platforms expecting generated files. |

## File: public/_headers

Security and caching headers for Cloudflare Pages:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com

/*
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

## File: public/_redirects

Cloudflare Pages redirect rules:

```text
/old-page/ /new-page/ 301
/legacy/* / 301

```

## Complete Example

```js
// ssr.config.js
export default {
  siteUrl: 'https://mysite.com',
  siteName: 'My Awesome Site',
  author: 'Jane Doe',
  tagline: 'Building awesome things',
  ogImage: 'https://mysite.com/og-default.png',
  keywords: 'react, cloudflare, static site',
  
  appLayoutPath: '/src/AppLayout.jsx',
  
  routes: [
    {
      path: '/',
      priority: '1.0',
      changefreq: 'daily',
      meta: {
        title: 'My Awesome Site',
        description: 'Welcome to my awesome site!',
      }
    },
    {
      path: '/about/',
      priority: '0.8',
      changefreq: 'monthly',
      meta: {
        title: 'About | My Awesome Site',
        description: 'Learn more about what we do',
      }
    },
    {
      path: '/blog/',
      priority: '0.7',
      changefreq: 'weekly',
      meta: {
        title: 'Blog | My Awesome Site',
        description: 'Latest news and updates',
      }
    },
    {
      path: '/contact/',
      priority: '0.6',
      changefreq: 'monthly',
      meta: {
        title: 'Contact | My Awesome Site',
        description: 'Get in touch with us',
      }
    }
  ],
  
  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'My Awesome Site',
        url: 'https://mysite.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://mysite.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'My Awesome Site',
        url: 'https://mysite.com',
        logo: 'https://mysite.com/logo.png',
        sameAs: [
          'https://twitter.com/mysite',
          'https://github.com/mysite'
        ]
      }
    ]
  }
}
```

## robots.txt (opt-in)

Prestruct never touches `dist/robots.txt` unless you opt in: an existing
`public/robots.txt` (CF Pages copies it through) stays authorable. Enable
generation in `ssr.config.js`:

```js
// ssr.config.js
robots: true,                       // minimal block + Sitemap pointer
// robots: false,                   // (default) leave dist/robots.txt alone
// robots: {
//   body:   'User-agent: GPTBot\nDisallow: /private\n',
//   sitemap: true,                  // default true; append Sitemap: line
// }
```

When enabled, prerender writes `dist/robots.txt` after `sitemap.xml` so the
`Sitemap:` pointer always references a fresh file.

## Cache stats (static monitor)

Every successful `prestruct build` writes a JSON snapshot to
`dist/.prestruct/status.json`:

```json
{
  "generatedAt": "2026-10-20T15:36:30.400Z",
  "routeCount": 1,
  "succeeded": 1,
  "cached": 1,
  "force": false,
  "routes": [{ "path": "/", "cached": true }]
}
```

Useful in CI or a deploy health-check step: `cat dist/.prestruct/status.json | jq .succeeded`. The file is intentionally static (no runtime endpoint), so it
is safe on static hosts per the PRD note "static-sites-safe option preferred".

Field note: `cached` is the TOTAL number of entries in the incremental cache
file, and each route's `cached: true` means "a cache entry exists for this
route" -- not that the current run served it from cache. Under `--force`
everything is rerendered regardless.

`--force` rerenders all routes; `--clean` clears the incremental cache first.
The snapshot always reflects the latest run, not an accumulation.

## Deploy ID

Every build stamps a deploy identifier into the HTML:

| Config key | Default | Effect |
|------------|---------|--------|
| `deployId` | `true` | Injects `<meta name="deploy-id" content="<short-hash>-<ts>">` into `dist/index.html`. Set `false` to disable. |
| `deployIdFooter` | `false` (opt-in) | Adds `data-deploy-id-footer` to the root div so client-side JS can render the deploy ID in your footer. Requires client-side code that reads the attribute (see the example `AppLayout.jsx`). The attribute survives prerendering -- footer display and prerendering do not conflict. |

Minimal footer implementation:

```js
// In AppLayout.jsx (client-side)
const root = document.getElementById('root')
const deployId = root?.hasAttribute('data-deploy-id-footer')
  ? document.querySelector('meta[name="deploy-id"]')?.content
  : null
```

## Environment variables

| Variable | Effect |
|----------|--------|
| `PRESTRUCT_STRICT=1` | Build fails (exit 1) on config-validation diagnostics. Off by default -- diagnostics only print and a Cloudflare Pages build continues with the valid routes -- intended for local/CI runs where you want to catch mistakes. |

Diagnostics are always printed line-by-line as `[prestruct] config: <message>`, so a bad config is never invisible even in non-strict mode. Validate outside a build with the CLI:

```bash
npx prestruct validate
```

## TypeScript Support

If using TypeScript, create a `ssr.config.ts`:

```ts
import { defineConfig } from 'prestruct'

export default defineConfig({
  siteUrl: 'https://example.com',
  siteName: 'Example',
  routes: [
    {
      path: '/',
      priority: '1.0',
      changefreq: 'weekly',
      meta: {
        title: 'Home | Example',
        description: 'My site',
      }
    }
  ]
})
```