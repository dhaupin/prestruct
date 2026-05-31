export default {
  siteUrl:       'https://prestruct.creadev.org',
  siteName:      'prestruct',
  author:        'dhaupin',
  tagline:       'SEO Prerendering for Vite + React on Cloudflare',
  ogImage:       'https://prestruct.creadev.org/og-image.svg',
  keywords:      'vite prerender, react SEO, cloudflare pages SEO, static site generation, react SSR, vite SSR, schema.org, open graph, sitemap generator',
  appLayoutPath: '/src/AppLayout.jsx',

  faqs: [
    {
      q: 'How do I add this to my existing Vite + React app?',
      a: 'Copy init/ scripts to your project. Add prerender to your build script. Edit ssr.config.js with your routes. That is it.',
    },
    {
      q: 'Does it work with any hosting?',
      a: 'Yes. Auto-detects Cloudflare Pages, Vercel, or Netlify. Injects correct platform config. Any static host works - just copy dist/ output.',
    },
    {
      q: 'How do I add a new route?',
      a: 'Add it to the routes array in ssr.config.js. Prerender picks it up on next build. No code changes needed.',
    },
    {
      q: 'What about dynamic content (cart, user state)?',
      a: 'Use pre-island elements. They mount client-only React after hydration. Crawlers see fallback content.',
    },
    {
      q: 'Why not use edge SSR instead?',
      a: 'Prestruct is static HTML - faster, cheaper, simpler. No edge runtime needed. Build once, deploy everywhere. Good for SEO. Edge SSR is for dynamic per-request content.',
    },
  ],

  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'monthly',
      meta: {
        title:       'Prestruct | SEO Prerendering for Vite + React on Cloudflare',
        description: 'Make your Vite + React app SEO-friendly. Prestruct prerenders static HTML with correct meta, Open Graph, schema.org, and cache headers.',
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
      {
        '@context':    'https://schema.org',
        '@type':       'FAQPage',
        mainEntity:    this.faqs.map((f) => ({
          '@type':          'Question',
          name:             f.q,
          acceptedAnswer: {
            '@type':    'Answer',
            text:      f.a,
          },
        })),
      },
      {
        '@context':        'https://schema.org',
        '@type':           'BreadcrumbList',
        itemListElement: [
          {
            '@type':     'ListItem',
            position:   1,
            name:      'Home',
            item:      'https://prestruct.creadev.org',
          },
          {
            '@type':     'ListItem',
            position:   2,
            name:      'How it works',
            item:      'https://prestruct.creadev.org/about',
          },
          {
            '@type':     'ListItem',
            position:   3,
            name:      'Deploy',
            item:      'https://prestruct.creadev.org/deploy',
          },
          {
            '@type':     'ListItem',
            position:   4,
            name:      'Islands',
            item:      'https://prestruct.creadev.org/islands',
          },
          {
            '@type':     'ListItem',
            position:   5,
            name:      'Bot proxy',
            item:      'https://prestruct.creadev.org/proxy',
          },
          {
            '@type':     'ListItem',
            position:   6,
            name:      'Get Help',
            item:      'https://prestruct.creadev.org/contact',
          },
        ],
      },
    ]
  },

  notFound: {
    heading:    'Route not found.',
    body:       "That path doesn't exist. Head back home.",
    primaryCta: { label: 'Back to home', href: '/' },
  },
}
