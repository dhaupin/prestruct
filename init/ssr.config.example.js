/**
 * ssr.config.js
 * =============
 * Copy this file to your project root as ssr.config.js, then customize.
 * 
 * The platform field selects host behavior. Cloudflare (default) is the only
 * fully supported platform today: the template ships public/_headers and
 * public/_redirects, and inject-brand appends the proxy origin to the CSP
 * allow-list when proxy.url is set. 'vercel' and 'netlify' pass config
 * validation but no host-specific files are generated yet.
 * 
 * IMPORTANT: This file is gitignored. It's your environment-specific config.
 * Copy ssr.config.example.js to ssr.config.js and customize for your site.
 * 
 * Platform options:
 *   - cloudflare  = default (only platform with generated/templated host files)
 *   - vercel      = accepted in config; no file generation yet
 *   - netlify     = accepted in config; no file generation yet
 */

export default {
  // === Platform ===
  // platform: 'cloudflare',  // 'netlify' | 'vercel' | 'cloudflare' (default)

  // === Site Identity ===
  siteUrl:    'https://example.com',
  siteName:   'Your Site Name',
  author:     'Your Name',
  tagline:   'Your tagline - keeps it short',
  ogImage:    'https://example.com/og-image.png',
  keywords:  'keyword1, keyword2, keyword3',

  // === App ===
  // Path to your AppLayout component (no BrowserRouter, only Routes)
  appLayoutPath: '/src/AppLayout.jsx',

  // === Deploy ID ===
  // Inject a deploy ID meta tag for debugging (visible in page source).
  // Set deployIdFooter: true to also show in the footer (requires client-side JS).
  // deployId: true,        // inject <meta name="deploy-id"> (default: true)
  // deployIdFooter: false, // show in footer (default: false)

  // === Robots.txt (opt-in) ===
  // Prestruct never touches dist/robots.txt unless you opt in -- a static
  // public/robots.txt you author yourself is copied through untouched.
  // robots: true,              // minimal block (all agents + Sitemap line)
  // robots: "User-agent: *\nDisallow: /private",  // custom body; sitemap auto-appended
  // robots: { body: "...", sitemap: false },      // custom body, no sitemap line
  //
  // AEO preset -- per-bot crawl policy from the 2026 vendor docs:
  // robots: { aeo: true },                  // search AI bots Allow, training crawls Disallow
  // robots: { aeo: { aiBots: 'allow' } },   // same, but also allow training crawls
  // Search group: OAI-SearchBot, PerplexityBot, Claude-SearchBot, Applebot,
  // Googlebot, Bingbot. Training group: GPTBot, ClaudeBot, Google-Extended,
  // Applebot-Extended, CCBot. Search access and training/data-use are separate
  // choices; the Sitemap line is appended as usual.

  // === Routes ===
  // Each route gets prerendered to static HTML at build time.
  // Add your routes here (at least one; zero routes fails validation).
  // Subroutes-only lists are fine -- vite still ships index.html.
  routes: [
    {
      path:       '/',
      priority:   '1.0',
      changefreq: 'monthly',
      meta: {
        title:       'Your Site Name',
        description: 'Your site description for search engines.',
        // ogImage:     'https://example.com/og-image.png',  // route-specific OG image
      },
    },
    // {
    //   path:       '/about',
    //   priority:   '0.8',
    //   changefreq: 'monthly',
    //   meta: {
    //     title:       'About | Your Site Name',
    //     description: 'Learn more about what we do.',
    //   },
    // },
    // {
    //   path:       '/blog',
    //   priority:   '0.7',
    //   changefreq: 'weekly',
    //   meta: {
    //     title:       'Blog | Your Site Name',
    //     description: 'Latest updates and articles.',
    //   },
    // },
  ],

  // === Dynamic Routes (CMS) ===
  // Optional async hook for routes from a headless CMS.
  // Runs at build time only - no runtime overhead.
  // fetchRoutes() merges with static routes above.
  // Static routes take precedence on duplicates.
  // async fetchRoutes() {
  //   const posts = await fetch('https://your-cms.com/api/routes')
  //     .then(r => r.json())
  //   return posts.map(post => ({
  //     path: `/blog/${post.slug}`,
  //     priority: '0.6',
  //     meta: {
  //       title: post.title,
  //       description: post.excerpt,
  //     },
  //   }))
  // },

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
  //       author: {
  //         '@type': 'Person',
  //         name:  'Your Name',
  //         url:   'https://github.com/yourname',
  //       },
  //     },
  //   ]
  // },

  // === Family ride-alongs (2026-10 issue walk) ===
  // All optional; every block is missing-only and config-gated. Full
  // semantics: docs/guides/config.md#family-ride-alongs.

  // Config-driven structured-data defaults (#30): without buildJsonLd the
  // engine emits Organization + WebSite from siteName/siteUrl/author.
  // jsonLdDefaults: false,   // skip the defaults

  // Per-route schema: route.jsonLd (object or array) ships on that page only
  // (FAQPage on the FAQ page, Article on the article). Feed discovery,
  // hreflang alternates (route.alternates overrides the site-wide set),
  // search-console verification metas, and a SearchAction on the home route:
  // feed:    { url: 'https://example.com/feed.xml', title: 'Feed' },
  // searchUrl: 'https://example.com/search?q={query}',
  // alternates: [{ hreflang: 'en', href: 'https://example.com' }],
  // verification: { 'google-site-verification': 'token-here' },

  // llms.txt (AI-consumable site summary from the baked route set),
  // generated-only (a hand-rolled file is never touched). Opt-out:
  // llms: false,

  // IndexNow (#36): 32-hex key (or true = persisted auto-key in
  // .prestruct/). build writes <key>.txt into dist/; `prestruct indexnow
  // --dry-run` prints the submission payload.
  // indexNow: 'your32hexkeyhere0000000000000000000',

  // postBuild hooks (#41): shell commands run BY the build after prerender
  // (npm-chain scripts can be retired). Opt-in execution gate:
  // runHooks: true,
  // hooks: { postBuild: ['node scripts/inject-faq-schema.mjs'] },

  // Branded per-route OG images (#43): render a 1200x630 PNG per route from
  // a 1200x630 SVG template ({{ogTitle}}/{{ogDescription}}/{{ogUrl}} slots).
  // Rasterizer is the optional dev dep @resvg/resvg-js - without it the
  // generation skips loudly (build stays green, audit flags the head).
  // ogImageGeneration: { template: 'og-template.svg', font: './brand/bold.ttf' },

  // === 404 Page ===
  // Custom 404 page content. Prerendered with noindex meta.
  notFound: {
    heading:    'Page not found',
    body:       "That page doesn't exist.",
    primaryCta: { label: 'Go home', href: '/' },
  },

  // === Bot Proxy (optional) ===
  // Proxy renders dynamic routes not in the prerender list.
  // Works with Node.js/Puppeteer (VPS) or Cloudflare Worker.
  // proxy: {
  //   // Your proxy server URL. Signals the build to widen the CSP
  //   // connect-src allow-list with this origin.
  //   url:      'https://your-proxy.example.com',
  //   // Cache-refresh shared secret is an env var, not config:
  //   // PRESTRUCT_SECRET (unset = refresh feature disabled entirely).
  //   // Render a different origin than siteUrl (for local dev, staging)
  //   targetUrl: 'https://staging.example.com',
  //   // Bot list for proxy - customize if needed
  //   botList: [
  //     'Googlebot',
  //     'Google-Extended',
  //     'Bingbot',
  //     'BingPreview',
  //     'DuckDuckBot',
  //     'Slurp',
  //   ],
  // },
}