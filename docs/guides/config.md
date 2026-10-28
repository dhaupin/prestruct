---
layout: default
title: Configuration
description: "Full ssr.config.js reference: siteUrl, siteName, routes and per-route meta, robots, proxy, and fetchRoutes."
nav_order: 3
version: 1.2.0
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
    ogImage: '/about-og.jpg',         // Optional: override config.ogImage for this route (string or object, same shapes as config.ogImage)
  }
}
```

`meta.title` and `meta.description` land in every route's baked HTML (title,
description, OG, and Twitter tags) and are re-applied on SPA navigation by
`usePageMeta`. There are no per-route `noindex` or `canonical` overrides:
404 pages carry noindex automatically, and canonical URLs are derived from
`siteUrl` + the route path.

### ogImage: string or object

`ogImage` (global or per-route) takes two shapes. The string is the bare URL:

```js
ogImage: 'https://example.com/og.png',
```

The object form adds the companion properties social crawlers use to size
previews. Width/height should match the actual raster (1200x630 is the
card standard); `alt` describes the image for screen readers and fallback
renderers:

```js
ogImage: {
  url: 'https://example.com/og.png',
  width: 1200,
  height: 630,
  alt: 'Example wordmark over a dark gradient',
  type: 'image/png',
},
```

Companion fields are optional and independent -- only the ones present are
emitted (`og:image:width`, `og:image:height`, `og:image:alt`,
`og:image:type`). The full-URL string form stays valid; it just ships
without companions. Validation rejects wrong shapes at build time: the
object must carry a string `url`, width/height must be numeric, and alt/
type must be strings.

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
// robots: { aeo: true },            // AI-crawler preset (see below)
```

When enabled, prerender writes `dist/robots.txt` after `sitemap.xml` so the
`Sitemap:` pointer always references a fresh file.

### AEO preset (`robots: { aeo: true }`)

`robots: true` emits one catch-all group. The `aeo` preset instead writes a
per-bot policy using the token each vendor documents for its own product:
search-visibility crawlers get `Allow: /`, and training/data-use crawlers get
`Disallow: /` by default:

- Allowed by default: `OAI-SearchBot` (ChatGPT search), `PerplexityBot`,
  `Claude-SearchBot`, `Applebot` (Siri/Spotlight), `Googlebot`, `Bingbot`
- Blocked by default: `GPTBot` (OpenAI training), `ClaudeBot` (Anthropic
  training), `Google-Extended` (Gemini/Vertex grounding),
  `Applebot-Extended` (Apple training), `CCBot` (Common Crawl)

Search eligibility and training/data-use preference are separate decisions;
`aeo: { aiBots: 'allow' }` flips the training group to `Allow`. The Sitemap
pointer is appended as usual. This preset only writes crawler instructions:
it cannot guarantee any answer engine will cite your pages, and it is not
access control. See the [SEO guide](/prestruct/guides/seo) for what these
tokens do and do not affect.

## Cache stats (build telemetry)

Every successful `prestruct build` writes a JSON snapshot to
`.prestruct/status.json` in the PROJECT ROOT (not dist -- build telemetry
must not deploy; see the issue-23 note below):

```json
{
  "routeCount": 1,
  "succeeded": 1,
  "cached": 1,
  "force": false,
  "routes": [{ "path": "/", "cached": true }]
}
```

Useful in CI or a local health-check step: `cat .prestruct/status.json | jq .succeeded`. The file is intentionally static (no runtime endpoint) and
intentionally OUTSIDE `dist/` -- anything in `dist/` ships to the public
artifact surface on every static host, and a wall-clock timestamp inside it
made byte-identical builds differ for parity-gating consumers (issue 23,
fixed in v1.1.0). `dist/` is byte-stable across identical input builds.

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
## Family ride-alongs (2026-10 issue walk)

Every option below is optional, missing-only, and config-gated: a host that
sets none of them ships byte-identical HTML to a host on an older version.
`init/ssr.config.example.js` carries the commented forms.

### Structured-data defaults and per-route nodes

- `jsonLdDefaults` (default on) - without `buildJsonLd`, the engine emits
  Organization + WebSite built from `siteName`/`siteUrl`/`author`. Set
  `jsonLdDefaults: false` to skip.
- `route.jsonLd` (object or array) - per-route schema nodes shipped only on
  that page (a FAQPage belongs on the FAQ page, not site-wide). Rebuild-safe:
  the block is replaced, never stacked.
- `searchUrl` - a search endpoint carrying a `{query}` slot; the home route
  gains a WebSite node wrapping its SearchAction.

### Head discovery and verification

- `feed: { url, title?, type? }` - RSS/Atom autodiscovery link in every head.
- `alternates` (site-wide) / `route.alternates` (per-route override, full
  takeover) - `hreflang` alternates; values ride the same escape pipeline as
  the primary metas, malformed entries drop silently.
- `verification: { 'google-site-verification': '...', ... }` - verification
  metas; keys must be plain `A-Za-z0-9._-` shapes.

### llms.txt

`llms: false` opts out; the engine otherwise writes `llms.txt` after the
sitemap (one H1, a blockquote tagline, one Docs entry per route with
description). Generated-only: a hand-rolled file is never overwritten.

### IndexNow

- `indexNow: { key: '<32-hex>' } | true | false` - the key file is written
  into `dist/` on every build (`true` persists an auto-generated key in
  `.prestruct/indexnow-key.txt`, generate-once so keyLocation stays stable).
- `prestruct indexnow [--dry-run] [dist]` - POSTs the baked sitemap's URLs
  to api.indexnow.org; `--dry-run` prints the payload off-network. Run it
  against a DEPLOYED output only (`keyLocation` must resolve).

### postBuild hooks

```js
// ssr.config.js
runHooks: true,                                  // execution opt-in gate
hooks: { postBuild: ['node scripts/inject-faq-schema.mjs'] },
```

The build pipeline owns the chain (the npm-script chain retired), so direct
engine/CI invocations no longer silently skip custom post-build steps.
Commands receive `PRESTRUCT_SITE_URL` / `PRESTRUCT_OUTPUT_DIR` in env plus
`${SITE_URL}` / `${OUTPUT_DIR}` placeholder substitution (function replacers,
never string form). Nothing executes without `runHooks: true` - logged
loudly either way - and any nonzero hook exit fails the build.

### Branded per-route OG images

```js
// ssr.config.js
ogImageGeneration: { template: 'og-template.svg', font: './brand/bold.ttf' },
```

A 1200x630 SVG template with `{{ogTitle}}` / `{{ogDescription}}` / `{{ogUrl}}`
slots renders into `dist/og/<route-slug>.png` per route; routes with their own
`og:image` keep theirs (missing-only). Rasterization is the optional dev
dependency `@resvg/resvg-js` - absent, generation skips loudly (the build
stays green; the audit still grades the head) and templates should load the
font via `ogImageGeneration.font` because system fonts are unreliable in
build sandboxes.

## Shared config dialect (prestruct <-> freestruct)

A team running both engines writes site identity once; the documented
subset maps across:

| Field            | prestruct (`ssr.config.js`) | freestruct (`freestruct.config`) |
|------------------|------------------------------|----------------------------------|
| origin           | `siteUrl`                    | `site.url`                       |
| display name     | `siteName`                   | `site.name`                      |
| author           | `author`                     | `author`                         |
| og image         | `ogImage` (string or `{url,width,height,alt,type}`) | `og.image` |
| structured data  | `buildJsonLd()` + `jsonLdDefaults` + `route.jsonLd` | `jsonLd` (+ route nodes) |
| sub-path installs| `platform`                   | `basePath`                       |
| output dir       | `dist/` convention           | `outputDir`                      |

Same posture both sides: values escape through one pipeline, malformed
entries warn loudly, and `validate`/'audit' grade the same head vocabulary.
