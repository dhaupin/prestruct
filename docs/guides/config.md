---
layout: default
title: Configuration
nav_order: 3
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
    url: 'https://proxy.example.com',    // Proxy server URL
    targetUrl: 'https://target.com',     // Origin to render
    secret: 'your-secret-token',         // Auth secret
    botList: ['googlebot', 'bingbot'],   // User-agents to proxy
  }
}
```

## Route Configuration

Each route in the `routes` array supports:

```js
{
  path: '/about/',                    // Route path (required)
  priority: '0.8',                    // Sitemap priority (string!)
  changefreq: 'monthly',              // Options: always, hourly, daily, weekly, monthly, never
  meta: {
    title: 'About | Example',         // Page title
    description: 'About page desc',   // Meta description
    ogImage: '/about-og.jpg',         // Optional: override default ogImage
    noindex: false,                   // Optional: add noindex meta
    canonical: '/about/',             // Optional: explicit canonical URL
  }
}
```

## Environment Variables

### Build Time

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SITE_URL` | Override site URL | `https://staging.example.com` |
| `NODE_ENV` | Node environment | `production` |

### Runtime (Cloudflare Pages)

| Variable | Description | Example |
|----------|-------------|---------|
| `PRODUCTION` | Enable production mode | `true` |
| `PRESTRUCT_SECRET` | Proxy auth secret | (set in Cloudflare) |
| `PRESTRUCT_TARGET_URL` | Proxy target URL | `https://origin.example.com` |

## File: public/_headers

Security and caching headers for Cloudflare Pages:

```
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

```
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