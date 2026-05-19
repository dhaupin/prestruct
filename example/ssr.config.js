export default {
  siteUrl:       'https://prestruct.creadev.org',
  siteName:      'prestruct',
  author:        'dhaupin',
  tagline:       'SEO prerendering for Vite + React on Cloudflare Pages',
  ogImage:       'https://prestruct.creadev.org/og-image.svg',
  keywords:      'vite prerender, react SEO, cloudflare pages SEO, static site generation, react SSR, vite SSR, schema.org, open graph, sitemap generator',
  appLayoutPath: '/src/AppLayout.jsx',

  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'monthly',
      meta: {
        title:       'Prestruct | SEO prerendering for Vite + React on Cloudflare Pages',
        description: 'Make your Vite + React app visible to search engines. Prestruct prerenders each route to static HTML with correct title, description, Open Graph, schema.org, and cache headers.',
      },
    },
    {
      path:       '/about',
      priority:   '0.8',
      changefreq: 'monthly',
      meta: {
        title:       'How it works | Prestruct',
        description: 'How Prestruct prerenders Vite + React routes to static HTML. The build pipeline, caching strategy, and key architectural decisions explained.',
      },
    },
    {
      path:       '/deploy',
      priority:   '0.9',
      changefreq: 'monthly',
      meta: {
        title:       'Deploy | Prestruct',
        description: 'Add SEO prerendering to your Vite + React app in minutes. Copy three files, write ssr.config.js, update your build script.',
      },
    },
    {
      path:       '/islands',
      priority:   '0.8',
      changefreq: 'monthly',
      meta: {
        title:       'Dynamic islands | Prestruct',
        description: 'Punch holes through prerendered HTML for client-only content. Cart widgets, recently viewed, personalization -- served to humans, invisible to crawlers.',
      },
    },
    {
      path:       '/proxy',
      priority:   '0.8',
      changefreq: 'daily',
      meta: {
        title:       'Bot proxy | Prestruct',
        description: 'Serve fresh content to bots without edge SSR. Prestruct proxy renders dynamic pages to static HTML for search crawlers.',
      },
    },
    {
      path:       '/terms',
      priority:   '0.5',
      changefreq: 'yearly',
      meta: {
        title:       'Terms of Service | Prestruct',
        description: 'Terms of Service for Prestruct - a lightweight build-time prerender layer for Vite + React on Cloudflare Pages.',
      },
    },
    {
      path:       '/privacy',
      priority:   '0.5',
      changefreq: 'yearly',
      meta: {
        title:       'Privacy Policy | Prestruct',
        description: 'Privacy Policy for Prestruct - learn how we handle data in our build-time prerendering tool for Vite + React.',
      },
    },
    {
      path:       '/contact',
      priority:   '0.5',
      changefreq: 'yearly',
      meta: {
        title:       'Get Help | Prestruct',
        description: 'Get help setting up Prestruct - contact the maintainer or open a GitHub issue.',
      },
    },
  ],

  buildJsonLd() {
    return [
      {
        '@context':           'https://schema.org',
        '@type':              'SoftwareApplication',
        name:                 'Prestruct',
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
