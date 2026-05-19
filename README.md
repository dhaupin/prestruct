# Prestruct

**AI-first SEO prerender for Vite + React apps.** Drop in, config, build.

---

## Quick Start

```bash
# Copy the init template
cp -r init/* your-project/

# Customize config
cp init/ssr.config.example.js ssr.config.js
```

Edit `ssr.config.js`:
```js
export default {
  siteUrl: 'https://yoursite.com',
  siteName: 'Your Site',
  routes: [
    { path: '/', priority: '1.0', meta: { title: 'Home' } },
    { path: '/about', priority: '0.8', meta: { title: 'About' } },
  ],
}
```

Run `npm run build`. That's it.

---

## Config API

```js
// ssr.config.js - full reference
export default {
  // === Required ===
  siteUrl: 'https://example.com',
  routes: [
    {
      path: '/',           // required - must start with /
      priority: '1.0',    // sitemap priority
      changefreq: 'monthly', // daily|weekly|monthly|yearly
      meta: {                      // SEO meta tags
        title: 'Page Title',
        description: 'Page description',
        ogImage: 'https://...',
      },
    },
  ],

  // === Optional ===
  platform: 'cloudflare',   // cloudflare|vercel|netlify (default: cloudflare)
  siteName: 'Site Name',
  author: 'Author Name',
  tagline: 'Short tagline',
  ogImage: 'https://example.com/og.png',
  keywords: 'key, words',

  appLayoutPath: '/src/AppLayout.jsx',  // your component (no BrowserRouter)

  // Dynamic routes from CMS
  async fetchRoutes() {
    const posts = await fetch('https://cms.io/api/routes').then(r => r.json())
    return posts.map(p => ({
      path: `/blog/${p.slug}`,
      priority: '0.6',
      meta: { title: p.title, description: p.excerpt },
    }))
  },

  // JSON-LD structured data
  buildJsonLd() {
    return { '@type': 'WebSite', name: this.siteName }
  },

  // 404 page
  notFound: {
    heading: 'Page not found',
    body: 'That page does not exist.',
    primaryCta: { label: 'Go home', href: '/' },
  },
}
```

---

## CLI

```bash
npm run build           # vite build + prerender
npm run build --force  # rebuild all (skip cache)
```

Incremental: `.prestruct/cache/routes.json` stores rendered HTML. Skip unchanged routes on rebuild.

---

## Scripts (for extension)

- `scripts/inject-brand.js` - writes meta tags, platform config (_headers, vercel.json, etc.)
- `scripts/prerender.js` - renders routes to static HTML
- `scripts/islands.js` - mounts client-only islands

AI agents: extend via config hooks or import scripts.

---

## Architecture

```
vite build → inject-brand.js → prerender.js → dist/
                    ↓
            ssr.config.js (your config)
                    ↓
            .prestruct/cache/ (incremental build)
```

- Build runs once at deploy time
- Static HTML served directly (no runtime SSR)
- CF Pages handles routing

**Read first:** `AGENTS.md` - engineering history, gotchas, decisions.

---

## Stack

- Vite 5+
- React 18+
- React Router v6
- Cloudflare Pages (default)
- Node 18+

---

_No deps added. No bloat. Config is the API._