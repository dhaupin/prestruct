---
layout: default
title: Routing & Trailing Slashes
---


Understanding how prestruct handles URL paths and route definitions.

## Route Configuration

Define all prerenderable routes in `ssr.config.js`:

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

## Trailing Slashes

**You control trailing slashes** - prestruct passes through whatever you define:

| Route path | Canonical URL |
|------------|---------------|
| `/` | `https://example.com/` |
| `/about/` | `https://example.com/about/` |
| `/contact/` | `https://example.com/contact/` |
| `/blog/post` | `https://example.com/blog/post` |

### Recommended Pattern

Most sites use one of these conventions:

1. **Trailing slash (recommended)**: `/about/`, `/projects/`
2. **No trailing slash**: `/about`, `/projects`
3. **Root only**: `/` (homepage), others with trailing slash

### SEO Note

Google treats `/about/` and `/about` as the same URL if one redirects to the other. Pick one style and stay consistent.

## Dynamic Routes

For dynamic content (blog posts, products), prerender at build time:

```js
// ssr.config.js
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

## Catch-All Routes

For dynamic routes that can't be prerendered, use Cloudflare Pages functions:

```js
// functions/[[path]].js
export async function onRequestGet({ params }) {
  const slug = params.path?.[0]
  // Fetch from CMS, database, etc.
  return new Response(`Dynamic content for: ${slug}`)
}
```

## 404 Handling

Prestruct prerenders a 404 page to `dist/404.html`. Cloudflare Pages serves this for unmatched routes with HTTP 404.

### Custom 404 Content

Modify in `prerender.js`:

```js
function generate404(html, config) {
  html = html.replace(
    /<title>.*?<\/title>/,
    '<title>Page Not Found | Your Site'
  )
  // Add custom content to the 404 body
  return html
}
```

## Redirects

For redirects, configure in `cloudflare-pages.json`:

```json
{
  "routes": [
    { "pattern": "/old-page/", "redirect": "/new-page/" },
    { "pattern": "/legacy/*", "redirect": "/" }
  ]
}
```

Or use Cloudflare dashboard/Pages redirects.

## Best Practices

1. **Use descriptive paths**: `/projects/creadev-site/` not `/p/cs/`
2. **Lowercase**: Always use lowercase URLs
3. **No spaces**: Use hyphens `-` not underscores `_`
4. **Consistent slashes**: Pick trailing slash or not, stay consistent
5. **Short paths**: Keep URLs readable and memorable

## Gotchas

### Route Order Matters

Prerender processes routes in order defined in your config. If you have similar paths, define more specific routes first:

```js
// Correct order
routes: [
  { path: '/blog/my-post/' },  // Specific first
  { path: '/blog/' },          // General after
]
```

### Missing Routes = 404

Any path not in your route config will serve the 404 page. Make sure to include all pages you want prerendered.

### Dynamic Data at Build Time

Prestruct is SSG - it prerenders at build time. For truly dynamic content (user-specific data, real-time stock prices), use Cloudflare Pages Functions as a fallback.

### ssg.config.js vs ssr.config.js

- `ssr.config.js` - Prerender at build time (SSG), serve static HTML
- Use whichever matches your build setup (prestruct supports both naming conventions)