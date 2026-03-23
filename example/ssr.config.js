export default {
  siteUrl:       'https://prestruct.creadev.org',
  siteName:      'prestruct',
  author:        'dhaupin',
  tagline:       'SEO prerendering for Vite + React on Cloudflare Pages',
  ogImage:       'https://prestruct.creadev.org/og-image.png',
  keywords:      'vite prerender, react SEO, cloudflare pages SEO, static site generation, react SSR, vite SSR, schema.org, open graph, sitemap generator',
  appLayoutPath: '/src/AppLayout.jsx',

  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'monthly',
      meta: {
        title:       'prestruct | SEO prerendering for Vite + React on Cloudflare Pages',
        description: 'Make your Vite + React app visible to search engines. prestruct prerenders each route to static HTML with correct title, description, Open Graph, schema.org, and cache headers.',
      },
    },
    {
      path:       '/about',
      priority:   '0.8',
      changefreq: 'monthly',
      meta: {
        title:       'How it works | prestruct',
        description: 'How prestruct prerenders Vite + React routes to static HTML. The build pipeline, caching strategy, and key architectural decisions explained.',
      },
    },
    {
      path:       '/use',
      priority:   '0.9',
      changefreq: 'monthly',
      meta: {
        title:       'Use it | prestruct',
        description: 'Add SEO prerendering to your Vite + React app in minutes. Copy three files, write ssr.config.js, update your build script.',
      },
    },
  ],

  buildJsonLd() {
    return [
      {
        '@context':           'https://schema.org',
        '@type':              'SoftwareApplication',
        name:                 'prestruct',
        url:                  'https://github.com/dhaupin/prestruct',
        description:          'Build-time SEO prerender layer for Vite + React apps on Cloudflare Pages. Per-route HTML, correct meta, schema.org, sitemap, and cache headers.',
        applicationCategory:  'DeveloperApplication',
        operatingSystem:      'Any',
        license:              'https://opensource.org/licenses/MIT',
        featureList: [
          'Per-route static HTML prerendering',
          'Title, description, Open Graph, Twitter Card injection',
          'schema.org JSON-LD structured data',
          'Automatic sitemap.xml generation',
          'Correct HTTP 404 status for unmatched routes',
          'Immutable asset caching with Cloudflare Pages',
        ],
        author: {
          '@type': 'Person',
          name:    'dhaupin',
          url:     'https://github.com/dhaupin',
        },
      },
    ]
  },

  notFound: {
    heading:    'Route not found.',
    body:       "That path doesn't exist. Head back home.",
    primaryCta: { label: 'Back to home', href: '/' },
  },
}
