---
version: 1.0.0
permalink: /discussions/announcing-v1.0.0
layout: none
title: "Announcing prestruct v1.0.0"
comments: false
nav_order: 21
---
# prestruct v1.0.0


prestruct is a build-time SEO prerender tool for Vite + React apps. v1.0.0 is the first stable release. It is on npm now:

```bash
npm i -D prestruct
```

This post covers what ships in the package, how the build pipeline works, and how to start using it. Repo links at the end.

## Why it exists

A Vite + React SPA deployed to Cloudflare Pages serves the same empty shell HTML for every route: `<div id="root"></div>` plus a bundle tag. Crawlers without JavaScript see nothing. Runtime SSR fixes this but requires a server, framework migration, or edge runtime. prestruct does neither: it renders every route to real static HTML at build time and leaves your app architecture untouched. hydrateRoot attaches to the prerendered DOM on first load, so there is no flash of content repaint either.

## The build pipeline

`prestruct build` runs four stages in order:

1. **validate** -- `ssr.config.js` is shape-checked (site form, route paths,
traversal guard, duplicate paths, priority and changefreq values, meta objects). Failure exits nonzero with structured diagnostics, before any build happens.
2. **vite build** -- a standard `vite build`. No SSR bundle, no extra config.
Everything the pipeline needs from React is loaded through `vite.ssrLoadModule` against your own module registry, so the peer dependencies (react, react-dom, react-router-dom, vite) resolve from your project, not from the package.
3. **inject-brand** -- head tags for the shell: canonical, OG tags, robots
directives, JSON-LD structured data. All user-supplied strings `$`-escaped before they enter an HTML attribute position.
4. **prerender** -- every route from `ssr.config.js` renders to
`dist/<path>/index.html` with per-route meta baked in, plus `sitemap.xml`, a noindexed `404.html` served with a real HTTP 404, and CF Pages `_headers` / `_redirects` files preconfigured.

Output is a plain static folder. Any host that serves files works; Cloudflare Pages is the first-class target because the caching and redirect semantics are already handled.

## What ships in the package

The npm tarball is 35 files (~68 KB packed). Three directories, each with a specific role:

| Directory | Purpose |
| --- | --- |
| `bin/` | The `prestruct` CLI: `init`, `build`, `validate`, `clean` |
| `engine/` | Build pipeline: prerender, inject-brand, validate-config, islands runtime, usePageMeta hook |
| `init/` | Project scaffold: AppLayout, usePageMeta, islands registration, ssr.config.example.js, vite/vitest configs, proxy scripts |

`init` copies files into your project only if they do not already exist. It never clobbers.

Peer dependencies (react, react-dom, react-router-dom, vite) are resolved from your project, not bundled. Node >= 18 required.

## Config

`ssr.config.js` is the single config file. Shape:

```js
export default {
  siteUrl: 'https://yoursite.com',       // required, no trailing slash
  siteName: 'Your Site',                 // OG site name
  appLayoutPath: '/src/AppLayout.jsx',   // layout entry for prerender
  routes: [
    {
      path: '/',                         // required, leading slash
      priority: '1.0',                   // sitemap priority 0.0-1.0
      changefreq: 'weekly',              // daily/weekly/monthly/yearly
      meta: {
        title: 'Home | Your Site',
        description: 'Your homepage description',
      },
    },
  ],
}
```

Optional keys this release supports:

- `platform` -- `cloudflare` (default) | `vercel` | `netlify`, outputs the
matching host config files in `dist/`.
- `robots` -- opt-in robots.txt generation with sitemap reference.
- `deployId` / `deployIdFooter` -- build identity meta tag and an opt-in
footer attribute. deployId is per-git-commit, not per-build, so the incremental cache survives identity-only rebuilds.
- `fetchRoutes()` -- an async hook on the config object that returns extra
route objects at build time. Use it for CMS-driven routes; results merge with static routes, static wins on path collision. No runtime overhead.
- `proxy` -- bot proxying for URLs the build cannot prerender. Ships two
variants: `init/scripts/proxy.js` (Node/Express/Puppeteer, VPS) and `init/scripts/proxy.worker.js` (Cloudflare Worker via Browser Rendering API, Workers Paid required). Bot detection and cache-bust contract are identical in both; only the cache storage differs (disk vs KV).

The full reference with every key is in the [config guide](https://docs.creadev.org/prestruct/guides/config).

## Islands: client-only content in prerendered pages

Prerendered HTML is the same for every visitor. User-specific content does not belong in it, and crawlers should not index it. Islands solve this with a `<pre-island>` custom element you drop into a component:

```jsx
<pre-island data-pre-island="cart-widget">
  <span class="island-loading">Loading cart</span>
</pre-island>
```

The fallback content renders into the static HTML (what crawlers see). After hydration, `mountIslands()` (called from your layout's route effect) mounts a React component into each island through its own `createRoot`, using the registry exported from `AppIslands.jsx`. Load strategies per island:

- `eager` (default) -- mounts immediately after hydration
- `visible` -- mounts on viewport entry via IntersectionObserver
- `idle` -- mounts during browser idle time via requestIdleCallback

Islands are separate React roots. They do not participate in hydration, so they cannot cause hydration mismatches, but they also do not see React context from the app tree.

Details and patterns: [advanced islands guide](https://docs.creadev.org/prestruct/guides/advanced-islands).

## SEO coverage

Per route, the pipeline writes:

- `<title>`, `meta name="description"`, `link rel="canonical"`,
`meta property="og:url"`
- `og:title`, `og:description`, `twitter:title`, `twitter:description`
- Site-level tags once: `og:image`, `og:type`, `og:site_name`, `twitter:card`
- Schema.org JSON-LD, site-wide
- `sitemap.xml` with priorities from config

On SPA navigation after load, the `usePageMeta` hook (registered the moment your layout mounts) updates the route-family tags (title, description, canonical, og:url, og/twitter title and description) and leaves the site-level tags alone. JS-executing bots that navigate a prerendered SPA see the correct tags for the route they landed on.

Full details: [SEO guide](https://docs.creadev.org/prestruct/guides/seo).

## Incremental prerender

Every rendered route's HTML is content-hashed into `.prestruct/cache/routes.json`. Rebuilds skip routes whose inputs (shell, assets, meta) did not change. Full clean re-render: `prestruct clean`, or `prestruct build --force`.

## Provenance

Releases publish from GitHub Actions (`.github/workflows/publish.yml`) with npm provenance attestations tied to the repo and workflow. Verify a install:

```bash
npm audit signatures
```

## Getting started

In an existing Vite + React project:

```bash
npm i -D prestruct
npx prestruct init
cp ssr.config.example.js ssr.config.js   # edit siteUrl + routes
npx prestruct build
```

`init` scaffolds the layout, hook, islands registration, example config, and proxy scripts. `build` produces `dist/`. Deploy `dist/` to Cloudflare Pages (or any static host), and every route is real HTML before any JavaScript executes.

The complete walkthrough, empty starter to deployed: [Getting Started guide](https://docs.creadev.org/prestruct/guides/getting-started).

## Known limits

- Build-time only. Runtime SSR, edge SSR, and streaming SSR are out of scope
by design. If a page's content must change per request and cannot be a CMS route, the bot proxy is the answer.
- Cloudflare Pages `_headers`/`_redirects` are the shipped defaults. Vercel
and Netlify outputs validate their semantics but do not generate host-specific config files.
- react-router-dom v6 and v7 are both supported; the prerender loader tries
the v6 `server.js` subpath first and falls back to the package root.

## Links

- npm: <https://www.npmjs.com/package/prestruct>
- Live demo (built with prestruct, source in `example/`):
<https://prestruct.creadev.org>
- Docs: <https://docs.creadev.org/prestruct>
- GitHub: <https://github.com/dhaupin/prestruct>
- Issues: <https://github.com/dhaupin/prestruct/issues>
- Full changelog: <https://github.com/dhaupin/prestruct/blob/main/CHANGELOG.md>

The tool has been running production sites for a while and the release keeps the API stable from here: breaking changes get a major bump, non-breaking improvements land in minor and patch releases. Thanks to everyone who tested the pre-releases and filed issues. If you deploy something with it, tell us what broke.
