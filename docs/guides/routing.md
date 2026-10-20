---
layout: default
title: Routing and Trailing Slashes
nav_order: 6
version: 1.0.0
permalink: /guides/routing
---

How prestruct handles URL paths and route definitions.

## Route configuration

Define all prerenderable routes in ssr.config.js:

```js
export default {
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
| `/` | `https://example.com` |
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

Prestruct prerenders a 404 page to dist/404.html with a `noindex` robots
directive. Cloudflare Pages serves it for unmatched routes.

Customize via `ssr.config.js` -- no code edits required:

```js
notFound: {
  heading: 'Page not found',
  body: "That page doesn't exist.",
  primaryCta: { label: 'Go home', href: '/' },
}
```

## Best practices

- Use descriptive paths: `/projects/prestruct-site/` not `/p/cs/`
- Lowercase, no spaces
- Hyphens `-` not underscores `_`
- Consistent trailing slashes

## Gotchas

### Config order does not affect matching

Each configured route renders independently, and React Router v6 ranks
candidates by specificity score, not array order. Order only affects
sitemap and build log ordering. Route specificity lives in your
`src/AppLayout.jsx` `<Routes>` tree, not in `ssr.config.js`.

### Missing routes = 404

Any path not in your route config will serve the 404 page. Include all pages you want prerendered.

## Next steps

- [Redirects](/prestruct/guides/redirects) - `_redirects` and the SPA-fallback loop
- [Config Reference](/prestruct/guides/config) - `routes`, `notFound`, per-route meta
