/**
 * ssr.config.js -- example app config
 *
 * The engine scripts (inject-brand.js, prerender.js) live one level up
 * at ../scripts/. The example's package.json build script calls them
 * with node ../scripts/inject-brand.js etc.
 *
 * This config is intentionally minimal -- just enough to prove
 * multi-route prerendering, meta injection, and sitemap generation.
 */

export default {
  siteUrl:       'https://cf-seo-ssr-example.pages.dev',
  siteName:      'cf-seo-ssr example',
  author:        'cf-seo-ssr',
  tagline:       'Vite + React + Cloudflare Pages prerender demo',
  ogImage:       'https://cf-seo-ssr-example.pages.dev/og-image.png',
  keywords:      'vite, react, cloudflare pages, SSR, prerender, SEO',
  appLayoutPath: '/src/AppLayout.jsx',

  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'monthly',
      meta: {
        title:       'cf-seo-ssr example | Vite + React + CF Pages prerender',
        description: 'A minimal example app showing build-time prerendering for Vite + React on Cloudflare Pages. View source to see baked-in SEO meta.',
      },
    },
    {
      path:       '/about',
      priority:   '0.8',
      changefreq: 'monthly',
      meta: {
        title:       'About | cf-seo-ssr example',
        description: "About the cf-seo-ssr prerender layer. What it does, what it doesn't do, and how it works.",
      },
    },
    {
      path:       '/contact',
      priority:   '0.6',
      changefreq: 'yearly',
      meta: {
        title:       'Contact | cf-seo-ssr example',
        description: 'Contact page for the cf-seo-ssr example app. Demonstrates per-route meta injection on a simple contact page.',
      },
    },
  ],

  buildJsonLd() {
    return [
      {
        '@context': 'https://schema.org',
        '@type':    'SoftwareApplication',
        name:       'cf-seo-ssr',
        url:        'https://github.com/your-org/cf-seo-ssr',
        description: 'Build-time prerender layer for Vite + React + Cloudflare Pages.',
        applicationCategory: 'DeveloperApplication',
      },
    ]
  },

  notFound: {
    heading:    'Page not found.',
    body:       "That route doesn't exist in this example app.",
    primaryCta: { label: 'Go home', href: '/' },
  },
}
