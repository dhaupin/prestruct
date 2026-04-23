---
layout: default
title: Structured Data
nav_order: 13
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

```js
// In your blog post component
usePageMeta({
  path: '/blog/my-post/',
  title: 'My Blog Post',
  description: 'A great article about something interesting',
})

// In ssr.config.js - you'll need to customize based on current route
buildJsonLd(path) {
  if (path.startsWith('/blog/')) {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: 'My Blog Post',
        image: ['https://example.com/blog/hero.jpg'],
        datePublished: '2024-01-15T10:00:00Z',
        dateModified: '2024-01-15T12:00:00Z',
        author: {
          '@type': 'Person',
          name: 'John Doe',
          url: 'https://example.com/about/john'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Acme Corp',
          logo: {
            '@type': 'ImageObject',
            url: 'https://example.com/logo.png'
          }
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': 'https://example.com/blog/my-post/'
        }
      }
    ]
  }
  // ... other types
}
```

Note: Prestruct doesn't currently support per-route JSON-LD. For this, you'd need to extend the prerender script.

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

For pages with breadcrumbs:

```js
buildJsonLd(routePath) {
  // Build breadcrumbs based on current path
  const breadcrumbs = []
  
  if (routePath === '/') {
    return []
  }
  
  const parts = routePath.split('/').filter(Boolean)
  let url = ''
  
  parts.forEach((part, index) => {
    url += '/' + part
    breadcrumbs.push({
      '@type': 'ListItem',
      position: index + 1,
      name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      item: `https://example.com${url}/`
    })
  })
  
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs
    }
  ]
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

**Missing @context:**
Every schema MUST have `@context` and `@type`.

**Invalid @type:**
Use valid Schema.org types: https://schema.org/docs/full.html

**Duplicate schemas:**
Only return one of each type per page.

**URL mismatch:**
Canonical URLs in schema should match page URLs.

## Advanced: Conditional Schema

For per-route schemas, extend the prerender script:

```js
// In prerender.js - modify the main render loop
const routeSchemas = {
  '/': ['Organization', 'WebSite'],
  '/about/': ['Organization'],
  '/blog/': ['BlogPosting'],
}

for (const route of ROUTES) {
  // ... render logic
  
  // Add route-specific JSON-LD
  const schemaTypes = routeSchemas[route.path] || []
  if (schemaTypes.length > 0) {
    const ldJson = buildJsonLd(route.path, schemaTypes)
    if (ldJson) {
      html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(ldJson)}</script></head>`)
    }
  }
}
```