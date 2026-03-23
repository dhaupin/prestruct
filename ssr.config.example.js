/**
 * ssr.config.js — example / target interface
 * ===========================================
 * This file shows what the consuming app would provide
 * once the config extraction TODO in SCOPE.md is complete.
 *
 * Currently (POC state), prerender.js and inject-brand.js import
 * directly from the app's brand.js. This file documents what the
 * clean config interface should look like once that coupling is removed.
 *
 * The prerender script would read this as:
 *   const config = await import('./ssr.config.js')
 */

export default {

  // ── Site identity ──────────────────────────────────────────────────────────

  siteUrl:   'https://yoursite.com',      // no trailing slash
  siteName:  'Your Site Name',
  author:    'Your Org Name',
  tagline:   'Your tagline.',
  ogImage:   '/og-image.jpg',             // path relative to public/
  keywords:  'keyword one, keyword two',

  // ── App entry ──────────────────────────────────────────────────────────────

  // Path to AppLayout — the component that wraps Routes but NOT BrowserRouter.
  // ssrLoadModule will import this file. It must not import BrowserRouter
  // anywhere in its module graph.
  appLayoutPath: '/src/AppLayout.jsx',

  // ── Routes ─────────────────────────────────────────────────────────────────
  // One entry per prerendered route.
  // The prerender engine iterates these and renders + writes each one.

  routes: [
    {
      path:        '/',
      priority:    '1.0',
      changefreq:  'weekly',
      meta: {
        title:       'Your Site: Your tagline.',
        description: 'Homepage description, 50-160 chars.',
        // ogImage:  '/custom-home-og.jpg',  // optional, overrides global ogImage
      },
    },
    {
      path:        '/about',
      priority:    '0.9',
      changefreq:  'monthly',
      meta: {
        title:       'About — Your Site',
        description: 'About page description.',
      },
    },
    {
      path:        '/contact',
      priority:    '0.6',
      changefreq:  'yearly',
      meta: {
        title:       'Contact — Your Site',
        description: 'Contact page description.',
      },
    },
    // Add one object per route. Unlisted routes won't be prerendered
    // and won't appear in sitemap.xml.
  ],

  // ── Dynamic routes (not yet implemented — see SCOPE.md P1) ────────────────
  // Uncomment and implement fetchRoutes() to pull routes from a CMS or API.
  // Return the same shape as the static routes array above.
  //
  // async fetchRoutes() {
  //   const posts = await fetch('https://your-cms.com/api/posts').then(r => r.json())
  //   return posts.map(post => ({
  //     path:       `/blog/${post.slug}`,
  //     priority:   '0.7',
  //     changefreq: 'monthly',
  //     meta: {
  //       title:       `${post.title} — Your Site`,
  //       description: post.excerpt,
  //       ogImage:     post.heroImage,
  //     },
  //   }))
  // },

  // ── JSON-LD structured data ────────────────────────────────────────────────
  // Return an array of schema.org objects to inject into every page's <head>.
  // Return [] to skip JSON-LD injection.

  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type':    'Organization',
        name:        'Your Org Name',
        url:         'https://yoursite.com',
      },
      // Add Event, Product, Article, etc. as needed
    ]
  },

  // ── 404 page content (not yet implemented — see SCOPE.md P2) ──────────────
  // Customize the 404 page content without editing prerender.js directly.
  //
  // notFound: {
  //   heading:    'Page not found.',
  //   body:       'The page you were looking for does not exist.',
  //   primaryCta: { label: 'Go home', href: '/' },
  //   secondaryCta: { label: 'Contact us', href: '/contact' },
  // },

}
