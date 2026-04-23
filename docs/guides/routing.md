---
layout: default
title: Routing & Trailing Slashes
nav_order: 6
---

How prestruct handles URL paths and route definitions.

## Route configuration

Define all prerenderable routes in ssr.config.js:

```js
module.exports = {
  siteUrl: 'https://example.com',
  routes: [
    { path: '/', meta: {...} },
    { path: '/about/', meta: {...} },
    { path: '/blog/my-post/', meta: {...} },
  ]
}
```

## Trailing slashes

You control trailing slashes - prestruct passes through whatever you define:

| Route path | Canonical URL |
|------------|---------------|
| `/` | `https://example.com/` |
| `/about/` | `https://example.com/about/` |
| `/contact/` | `https://example.com/contact/` |

Pick one style and stay consistent. Google treats `/about/` and `/about` as the same URL if one redirects to the other.

## Dynamic routes

For dynamic content (blog posts, products), prerender at build time:

```js
const posts = ['hello-world', 'another-post', 'third-post']

routes: [
  { path: '/blog/', meta: {...} },
  ...posts.map(slug => ({
    path: `/blog/${slug}/`,
    meta: {
      title: `${slug.replace(/-/g, ' ')} | Blog`,
      description: `Read about ${slug}`,
    }
  }))
]
```

## Catch-all routes

For truly dynamic routes that can't be prerendered, use Cloudflare Pages Functions:

```js
// functions/[[path]].js
export async function onRequestGet({ params }) {
  const slug = params.path?.[0]
  return new Response(`Dynamic content for: ${slug}`)
}
```

## 404 handling

Prestruct prerenders a 404 page to dist/404.html. Cloudflare Pages serves this for unmatched routes.

Customize in prerender.js:

```js
function generate404(html, config) {
  html = html.replace(
    /<title>.*?<\/title>/,
    '<title>Page Not Found | Your Site'
  )
  return html
}
```

## Best practices

- Use descriptive paths: `/projects/prestruct-site/` not `/p/cs/`
- Lowercase, no spaces
- Hyphens `-` not underscores `_`
- Consistent trailing slashes

## Gotchas

### Route order matters

Prerender processes routes in order defined in config. Define more specific routes first:

```js
routes: [
  { path: '/blog/my-post/' },  // Specific first
  { path: '/blog/' },          // General after
]
```

### Missing routes = 404

Any path not in your route config will serve the 404 page. Include all pages you want prerendered.
