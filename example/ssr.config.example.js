/**
 * ssr.config.js
 * =============
 * Copy this file to your project root as ssr.config.js, then customize.
 * 
 * The platform field determines which hosting provider generates host-specific
 * config files (_headers, _redirects for Cloudflare; vercel.json for Vercel; 
 * netlify.toml for Netlify). Default is Cloudflare.
 * 
 * IMPORTANT: This file is gitignored. It's your environment-specific config.
 * Copy ssr.config.example.js to ssr.config.js and customize for your site.
 * 
 * Platform options:
 *   - cloudflare  = default, generates _headers and _redirects
 *   - vercel      = generates vercel.json
 *   - netlify     = generates netlify.toml
 */

export default {
  // === Platform ===
  // platform: 'cloudflare',  // 'netlify' | 'vercel' | 'cloudflare' (default)

  // === Site Identity ===
  siteUrl:    'https://example.com',
  siteName:  'Your Site Name',
  author:    'Your Name',
  tagline:  'Your tagline here',
  // ogImage:   'https://example.com/og-image.png',
  // keywords:  'keyword1, keyword2',

  // === App ===
  // appLayoutPath: '/src/AppLayout.jsx',

  // === Routes ===
  // Each route gets prerendered to static HTML at build time.
  // Add your routes here. The home route (/) is required.
  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'monthly',
      meta: {
        title:        'Your Site Name',
        description:  'Your site description for search engines.',
      },
    },
    // {
    //   path:       '/about',
    //   priority:   '0.8',
    //   changefreq: 'monthly',
    //   meta: {
    //     title:        'About | Your Site Name',
    //     description: 'Learn more about what we do.',
    //   },
    // },
    // {
    //   path:       '/blog',
    //   priority:   '0.7',
    //   changefreq: 'weekly',
    //   meta: {
    //     title:        'Blog | Your Site Name',
    //     description: 'Latest updates and articles.',
    //   },
    // },
  ],

  // === JSON-LD Structured Data ===
  // Optional function returning schema.org structured data.
  // Return a single object or array of objects.
  // buildJsonLd() {
  //   return [
  //     {
  //       '@context':           'https://schema.org',
  //       '@type':              'WebSite',
  //       name:                 'Your Site Name',
  //       url:                  'https://example.com',
  //     },
  //   ]
  // },

  // === 404 Page ===
  // Custom 404 page content. Prerendered with noindex meta.
  // notFound: {
  //   heading:    'Page not found',
  //   body:      "That page doesn't exist.",
  //   primaryCta: { label: 'Go home', href: '/' },
  // },

  // === Bot Proxy (optional) ===
  // Proxy renders dynamic routes not in the prerender list.
  // Runs on: Node.js/Puppeteer (VPS) or Cloudflare Worker.
  // Set proxy.url to enable:
  // proxy: {
  //   url:      'https://your-proxy.example.com',
  //   secret:  'your-secret-from-env',
  // },
}