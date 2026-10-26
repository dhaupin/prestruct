export default {
  siteUrl:       'https://prestruct.creadev.org',
  siteName:      'prestruct',
  author:        'Creadev.org',
  tagline:       'SEO Prerendering for Vite + React on Cloudflare',
  ogImage:       'https://prestruct.creadev.org/og-image.svg',
  keywords:      'vite prerender, react SEO, cloudflare pages SEO, static site generation, react SSR, vite SSR, schema.org, open graph, sitemap generator',
  appLayoutPath: '/src/AppLayout.jsx',

  // Deploy ID settings
  // Enable/disable deploy ID (meta tag). Footer display is opt-in.
  deployId: true,
  // Show deploy ID in footer (requires deployId: true)
  deployIdFooter: false,

  // AEO preset: search crawlers allowed, training/data-use crawlers blocked.
  // The site documents this preset, so it runs it. Prerender writes
  // dist/robots.txt itself -- there is no public/robots.txt to drift from it.
  robots: { aeo: true },

  faqs: [
    {
      q: 'How do I add this to my existing Vite + React app?',
      a: 'Run npx prestruct init (or copy the scripts out of the repo if you want the dep-free route). Then edit ssr.config.js with your routes and run prestruct build. That is it.',
    },
    {
      q: 'Does it work with any hosting?',
      a: 'Cloudflare Pages is the first-class host - the build ships headers, redirects, and immutable asset caching for it. Any static host works too: dist/ is a plain folder of static HTML files.',
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
          'noindexed 404 pages',
          'Opt-in robots.txt generation',
          'Incremental prerender cache with --force / --clean',
        ],
        author: {
          '@type': 'Person',
          name:    'dhaupin',
          url:     'https://github.com/dhaupin',
        },
      },
      // FAQPage would need per-route JSON-LD: the accordion shows on Home
      // only, and buildJsonLd has no path argument to scope it. FAQ schema
      // claims from pages that don't show FAQs would be fiction, so only
      // the product-level SoftwareApplication ships site-wide.
    ]
  },

  notFound: {
    heading:    'Route not found.',
    body:       "That path doesn't exist. Head back home.",
    primaryCta: { label: 'Back to home', href: '/' },
  },
}
