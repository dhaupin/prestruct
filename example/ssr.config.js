export default {
  siteUrl:       'https://cf-seo-ssr-example.pages.dev',
  siteName:      'cf-seo-ssr',
  author:        'dhaupin',
  tagline:       'Build-time prerender for Vite + React + Cloudflare Pages',
  ogImage:       'https://cf-seo-ssr-example.pages.dev/og-image.png',
  keywords:      'vite, react, cloudflare pages, SSR, prerender, SEO, static site',
  appLayoutPath: '/src/AppLayout.jsx',

  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'monthly',
      meta: {
        title:       'cf-seo-ssr | Build-time prerender for Vite + React + Cloudflare Pages',
        description: 'Drop-in build-time prerender layer for Vite + React apps on Cloudflare Pages. Per-route HTML, correct SEO meta, sitemap, and 404 -- no framework required.',
      },
    },
    {
      path:       '/about',
      priority:   '0.8',
      changefreq: 'monthly',
      meta: {
        title:       'About | cf-seo-ssr',
        description: "How cf-seo-ssr works under the hood. ssrLoadModule, StaticRouter, hydrateRoot, and the decisions that make it debuggable.",
      },
    },
    {
      path:       '/use',
      priority:   '0.9',
      changefreq: 'monthly',
      meta: {
        title:       'Use it | cf-seo-ssr',
        description: 'How to integrate cf-seo-ssr into your Vite + React app. Copy three files, write a config, update your build script.',
      },
    },
  ],

  buildJsonLd() {
    return [
      {
        '@context':           'https://schema.org',
        '@type':              'SoftwareApplication',
        name:                 'cf-seo-ssr',
        url:                  'https://github.com/dhaupin/cf-seo-ssr',
        description:          'Build-time prerender layer for Vite + React + Cloudflare Pages.',
        applicationCategory:  'DeveloperApplication',
        operatingSystem:      'Any',
        license:              'https://opensource.org/licenses/MIT',
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
