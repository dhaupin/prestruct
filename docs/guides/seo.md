---
layout: default
title: SEO Guide
nav_order: 4
version: 1.0.0
permalink: /guides/seo
---


Prestruct handles technical SEO at build time. This guide covers best practices.

## How Prestruct Works

Prestruct prerenders each route to static HTML with:

- `<title>` tags
- `<meta name="description">`
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card meta tags
- Canonical URLs
- JSON-LD structured data

## Configuration

Define routes in `ssr.config.js`:

```js
export default {
  siteUrl: 'https://example.com',
  siteName: 'Example',
  ogImage: 'https://example.com/og-image.png',
  routes: [
    {
      path: '/',
      priority: '1.0',
      changefreq: 'weekly',
      meta: {
        title: 'Home | Example',
        description: 'Your homepage description (150-160 chars)',
      }
    },
    {
      path: '/about/',
      priority: '0.8',
      changefreq: 'monthly',
      meta: {
        title: 'About Us | Example',
        description: 'Learn more about our company...',
      }
    }
  ]
}
```

## Meta Best Practices

### Title Tags

- Keep under 60 characters
- Include primary keyword near the start
- Unique for every page

### Descriptions

- 150-160 characters optimal
- Include primary and secondary keywords
- Unique for every page

### Canonical URLs

Canonical is `siteUrl` + the route path, minus the trailing slash on `/`:

```js
// Route path written with a trailing slash
{ path: '/about/' }
// Generates: <link rel="canonical" href="https://example.com/about/" />

// Root is the bare site origin (no trailing slash)
{ path: '/' }
// Generates: <link rel="canonical" href="https://example.com" />
```

`usePageMeta` computes the same value client-side on SPA navigation, so the
canonical never flips between SSR and client.

## Structured Data (JSON-LD)

Add schema.org data in `ssr.config.js`:

```js
export default {
  // ...other config
  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Example Inc',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+1-555-1234',
          contactType: 'customer service'
        }
      }
    ]
  }
}
```

The returned object(s) are injected as `<script type="application/ld+json">
into every page. `buildJsonLd` is called with no arguments and cannot vary by
route -- see [Structured Data](/guides/structured-data) for the full set of
types and the per-route limitation.

## Sitemap

Prestruct auto-generates `sitemap.xml` with:

- All routes from config
- `<lastmod>` with build date
- `<changefreq>` from config
- `<priority>` from config

## 404 Pages

Prestruct generates a 404 page with `noindex` robots directive:

```html
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
```

This prevents 404 pages from appearing in search results.

## Robots.txt

Add your own in `public/robots.txt`:

```txt
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

## Security Headers

Prestruct sites on Cloudflare Pages get security headers automatically:

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`

## Validation

Use these tools to verify SEO:

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org)
- [Google PageSpeed Insights](https://pagespeed.web.dev)
- [Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)

## Gotchas & Troubleshooting

### Duplicate Meta Tags

If you see duplicate `<title>` or `<meta name="robots">` tags, check your `public/index.html` for pre-existing meta tags. Prestruct's `inject-brand.js` adds meta tags dynamically - remove duplicate meta from your base HTML.

### 404 Pages Not Indexed

Prestruct automatically adds `noindex` directives to 404 pages to prevent them from appearing in search results:

```html
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
```

This is correct behavior - don't remove it unless you want 404s indexed.

### Trailing Slash Mismatch

If your canonical URL has a trailing slash but users access without (or vice versa), you may see duplicate content warnings. Choose one style in your route definitions and stay consistent.

## Next steps

- [Structured Data](/guides/structured-data) - JSON-LD patterns and validation
- [Redirects](/guides/redirects) - `_redirects`/`_headers` on Cloudflare Pages
- [Routing](/guides/routing) - route paths, trailing slashes, 404s