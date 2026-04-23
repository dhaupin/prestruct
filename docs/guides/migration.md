---
layout: default
title: Migration Guide
nav_order: 10
---


Moving to prestruct from other solutions.

## From Create React App (CRA)

### What Changes

| CRA | Prestruct |
|-----|-----------|
| `react-scripts build` | `npm run build` (3-step) |
| Client-only | Prerendered static HTML |
| No SEO meta handling | Automatic meta injection |
| SPA fallback needed | Per-route HTML files |

### Steps

1. **Add Vite**
   ```bash
   npm install vite @vitejs/plugin-react
   ```

2. **Create vite.config.js**
   ```js
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     build: { outDir: 'dist' }
   })
   ```

3. **Add prestruct files**
   - Copy `scripts/inject-brand.js` and `scripts/prerender.js`
   - Create `ssr.config.js`
   - Create `AppLayout.jsx` (no BrowserRouter!)

4. **Update package.json**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build && node scripts/inject-brand.js && node scripts/prerender.js",
       "preview": "vite preview"
     }
   }
   ```

5. **Deploy to Cloudflare Pages** instead of static hosting

---

## From Next.js Static Export

### What Changes

| Next.js | Prestruct |
|---------|-----------|
| `next build && next export` | `npm run build` |
| `_next/` folder | `assets/` (hashed) |
| `getStaticProps` | Build-time data in ssr.config.js |
| Image Optimization API | Use `<img srcset>` |
| API Routes | Cloudflare Pages Functions |

### Steps

1. **Remove Next.js**
   ```bash
   npm uninstall next react
   ```

2. **Add Vite + React**
   ```bash
   npm install react react-dom react-router-dom
   npm install -D vite @vitejs/plugin-react
   ```

3. **Adapt Pages**

   ```jsx
   // Next.js page
   export async function getStaticProps() {
     const data = await fetchData()
     return { props: { data } }
   }

   // Prestruct - move to ssr.config.js or build script
   const routes = [
     { path: '/', meta: {...} },
     // ... dynamic routes generated at build time
   ]
   ```

4. **Update Image Usage**

   ```jsx
   // Next.js
   <Image src="/img.png" width={800} height={600} />

   // Prestruct
   <img 
     src="/img.png" 
     srcset="/img-400.png 400w, /img-800.png 800w"
     sizes="(max-width: 600px) 400px, 800px"
     width={800}
     height={600}
     loading="lazy"
   />
   ```

5. **Remove Next.js config**, add Vite config

---

## From Gatsby

### What Changes

| Gatsby | Prestruct |
|--------|-----------|
| GraphQL data layer | Static config / build scripts |
| gatsby-node.js | ssr.config.js routes |
| Head API | usePageMeta hook |
| Image Plugin | Manual srcset |

### Steps

1. **Remove Gatsby**
   ```bash
   npm uninstall gatsby react gatsby-plugin-*
   ```

2. **Install Vite + React**
   ```bash
   npm install react react-dom react-router-dom
   npm install -D vite @vitejs/plugin-react
   ```

3. **Migrate data**

   ```js
   // gatsby-node.js
   exports.createPages = async ({ actions }) => {
     const posts = await getPosts()
     posts.forEach(post => {
       actions.createPage({
         path: `/blog/${post.slug}`,
         component: './src/templates/post.jsx',
         context: { post }
       })
     })
   }

   // ssr.config.js
   const posts = await getPosts() // Call at build time
   routes: [
     ...posts.map(post => ({
       path: `/blog/${post.slug}/`,
       meta: { title: post.title }
     }))
   ]
   ```

4. **Update image handling**

   Gatsby's image processing is removed. Use standard `<img>` with srcset or a Vite plugin.

---

## From React Static (Babel)

### What Changes

| React Static | Prestruct |
|--------------|-----------|
| `react-static build` | `npm run build` |
| `getRoutes` | ssr.config.js routes |
| `getSiteData` | Build-time fetch in ssr.config.js |

### Steps

1. **Remove React Static**
   ```bash
   npm uninstall react-static
   ```

2. **Migrate routes**

   ```js
   // react-static.config.js
   export default {
     getRoutes: async () => {
       const posts = await fetch('/api/posts').then(r => r.json())
       return [
         { path: '/', component: 'src/pages/Home.jsx' },
         ...posts.map(post => ({
           path: `/blog/${post.slug}`,
           component: 'src/pages/BlogPost.jsx',
           getData: () => ({ post })
         }))
       ]
     }
   }

   // ssr.config.js
   const posts = await fetch('/api/posts').then(r => r.json())
   export default {
     routes: [
       { path: '/', meta: {...} },
       ...posts.map(post => ({
         path: `/blog/${post.slug}/`,
         meta: { title: post.title }
       }))
     ]
   }
   ```

---

## From Astro

### What Changes

| Astro | Prestruct |
|-------|-----------|
| `.astro` files | `.jsx` React components |
| Frontmatter | React hooks |
| Collection API | Build-time fetch |
| Islands (Astro) | Islands (prestruct) |

### Steps

1. **Add React to Astro** (or convert to full React)

   If keeping Astro with React:
   - Add `prestruct` as prerendering layer
   
   If converting to pure React:
   ```bash
   npm uninstall astro @astrojs/react
   npm install react react-dom react-router-dom
   npm install -D vite @vitejs/plugin-react
   ```

2. **Migrate Components**

   ```astro
   ---
   // Astro component
   const { title } = Astro.props
   ---
   <h1>{title}</h1>
   
   <!-- React component -->
   export default function Heading({ title }) {
     return <h1>{title}</h1>
   }
   ```

3. **Migrate Data Fetching**

   ```astro
   ---
   // In Astro frontmatter
   const data = await fetch('https://api.example.com').then(r => r.json())
   ---
   
   <!-- In React - do this in ssr.config.js or build script -->
   ```

---

## Common Migration Patterns

### Dynamic Data at Build Time

```js
// ssr.config.js - fetch once at build time
const posts = await fetch('https://api.example.com/posts')
  .then(r => r.json())

export default {
  routes: [
    { path: '/blog/', meta: {...} },
    ...posts.map(post => ({
      path: `/blog/${post.slug}/`,
      meta: {
        title: post.title,
        description: post.excerpt
      }
    }))
  ]
}
```

### Environment-Based Config

```js
// ssr.config.js
const isProd = process.env.NODE_ENV === 'production'

export default {
  siteUrl: isProd 
    ? 'https://example.com'
    : 'http://localhost:5173',
  // ...
}
```

### Shared Components

Most UI libraries work with prestruct. Test for:
- SSR compatibility (no window/document at render time)
- No inline styles causing hydration mismatch

---

## After Migration

1. **Test locally**: `npm run preview`
2. **Check SEO**: Verify meta tags, sitemap, canonical URLs
3. **Lighthouse audit**: Should score 90+ on all metrics
4. **Deploy**: Push to Cloudflare Pages