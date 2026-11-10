---
layout: default
title: Structured Data
description: "How JSON-LD structured data is generated from config.buildJsonLd and how script-tag breakout protection works."
nav_order: 13
version: 1.0.0
permalink: /guides/structured-data
---

JSON-LD structured data for rich search results.

## How It Works

Prestruct injects JSON-LD into every prerendered page via the `buildJsonLd()` function in `ssr.config.js`.

```js
// ssr.config.js
export default {
  // ...other config
  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'My Site',
        url: 'https://example.com',
      }
    ]
  }
}
```

This generates:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "My Site",
  "url": "https://example.com"
}
</script>
```

## Common Schema Types

### Organization

```js
buildJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Acme Corp',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
      description: 'We make great products',
      sameAs: [
        'https://twitter.com/acme',
        'https://facebook.com/acme',
        'https://linkedin.com/company/acme'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-555-123-4567',
        contactType: 'customer service',
        availableLanguage: 'English'
      }
    }
  ]
}
```

### WebSite + SearchAction

```js
buildJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Acme Site',
      url: 'https://example.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://example.com/search?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    }
  ]
}
```

### LocalBusiness

```js
buildJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Acme Coffee Shop',
      image: 'https://example.com/store.jpg',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        postalCode: '94102',
        addressCountry: 'US'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 37.7749,
        longitude: -122.4194
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '07:00',
          closes: '19:00'
        }
      ],
      telephone: '+1-555-123-4567',
      priceRange: '$$'
    }
  ]
}
```

### Product

```js
buildJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Amazing Widget',
      image: 'https://example.com/widget.jpg',
      description: 'The best widget for your needs',
      sku: 'WIDGET-001',
      brand: {
        '@type': 'Brand',
        name: 'Acme'
      },
      offers: {
        '@type': 'Offer',
        url: 'https://example.com/products/widget',
        priceCurrency: 'USD',
        price: '29.99',
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'Acme Corp'
        }
      }
    }
  ]
}
```

### FAQPage

```js
buildJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is prestruct?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Prestruct is a build-time prerenderer for React/Vite apps.'
          }
        },
        {
          '@type': 'Question',
          name: 'Does it work with Cloudflare Pages?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, it is designed for Cloudflare Pages.'
          }
        }
      ]
    }
  ]
}
```

### Article/BlogPosting

Blog postings usually need per-route fields (headline, datePublished, `@id`) -- and prestruct calls `buildJsonLd()` with **no arguments**, so it cannot vary by route. Two honest options:

1. **Site-wide blog metadata only:** omit `BlogPosting` from `ssr.config.js` and extend the prerender script (see [Advanced](#advanced-conditional-schema) below) to inject per-post JSON-LD with real post fields.
2. **Static placeholder:** a `BlogPosting` list inside `buildJsonLd()` would render the same object on every page -- wrong for Google's article markup, which must describe only the page it appears on. Do not ship per-route schema as site-wide JSON-LD.

### Person

```js
buildJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'John Doe',
      jobTitle: 'Software Engineer',
      image: 'https://example.com/john.jpg',
      url: 'https://example.com/about/john',
      sameAs: [
        'https://twitter.com/johndoe',
        'https://github.com/johndoe',
        'https://linkedin.com/in/johndoe'
      ],
      worksFor: {
        '@type': 'Organization',
        name: 'Acme Corp',
        url: 'https://example.com'
      }
    }
  ]
}
```

## Multiple Schema Types

You can return an array with multiple objects:

```js
buildJsonLd() {
  return [
    // Organization (site-wide)
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Acme Corp',
      url: 'https://example.com',
    },
    // WebSite (for search)
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Acme Corp',
      url: 'https://example.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://example.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    }
  ]
}
```

## BreadcrumbList

Breadcrumb entries are per-route, so `buildJsonLd()`'s no-argument contract cannot produce them -- it is called once, site-wide, with no route path. The engine injects each route's head itself, though, so it *can* build the trail: set `breadcrumb: true` and prestruct emits a `BreadcrumbList` per route from that route's own path.

```js
// ssr.config.js
export default {
  // ...other config
  breadcrumb: true,
}
```

The trail leads with the site root (`siteName`), then one `ListItem` per path segment, with the page's own title on the tail item:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "My Site", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://example.com/guides" },
    { "@type": "ListItem", "position": 3, "name": "Getting Started | My Site", "item": "https://example.com/guides/getting-started" }
  ]
}
</script>
```

Two rules keep it honest:

- The home route ships none -- a one-item trail is not a breadcrumb.
- Missing-only: a route that already carries its own `BreadcrumbList` in `route.jsonLd` is left untouched, so a hand-authored trail is never doubled.

For a trail that does not mirror the URL structure (Google recommends a *typical user path*), skip the flag and author the node yourself per route with `route.jsonLd` -- the mapping below is the reference for that case:

```js
// A custom per-route trail: build it where the route is defined and hand it
// to that route as route.jsonLd (the engine ships it as-is).
function breadcrumbLd(routePath, siteUrl) {
  const parts = routePath.split('/').filter(Boolean)
  let url = ''
  const crumbs = parts.map((part, index) => {
    url += '/' + part
    return {
      '@type': 'ListItem',
      position: index + 1,
      name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      item: `${siteUrl}${url}/`
    }
  })
  return crumbs.length
    ? [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs }]
    : []
}
```

## Validation

### Google Rich Results Test

Use the [Google Rich Results Test](https://search.google.com/test/rich-results) to validate your structured data.

### Schema Markup Validator

Use the [Schema Markup Validator](https://validator.schema.org) for comprehensive validation.

## Debugging

### View Generated JSON-LD

```bash
grep -A 20 'application/ld+json' dist/index.html
```

### Common Issues

**Missing @context:** Every schema MUST have `@context` and `@type`.

**Invalid @type:** Use valid Schema.org types: https://schema.org/docs/full.html

**Duplicate schemas:** Only return one of each type per page.

**URL mismatch:** Canonical URLs in schema should match page URLs.

## Advanced: Conditional Schema

Ground truth first: `config.buildJsonLd()` receives **no arguments** -- inject-brand calls it once per build and injects the result into every prerendered page. It cannot vary per route by itself.

For per-route schemas, extend the prerender script (site-wide types still come from `buildJsonLd`; the per-route map is your own addition):

```js
// In prerender.js - inside the per-route render loop, after injectMeta
const routeSchemas = {
  '/':      ['Organization', 'WebSite'],
  '/about': ['Organization'],
  '/blog':  ['BlogPosting'],
}

const types = routeSchemas[route.path] || []
if (types.length > 0) {
  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': types.map(t => ({ '@type': t }))
    })}</script></head>`
  )
}
```

Same caveat as the BlogPosting section above: per-route JSON-LD must describe only the page it appears on, or Google may reject it.

## Next steps

- [SEO Guide](/prestruct/guides/seo) - meta tags, canonicals, sitemap behavior
- [Config Reference](/prestruct/guides/config) - `buildJsonLd` in context of the whole config