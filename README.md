# Prestruct

**Build-time SEO prerender for Vite + React.** Validate your `ssr.config.js`,
build, inject meta, prerender every route to static HTML. No framework
migration, no runtime SSR.

---

## Quick Start

```bash
# In an existing Vite + React project:
npm i -D prestruct
npx prestruct init          # never clobbers existing files
cp ssr.config.example.js ssr.config.js   # then edit siteUrl + routes
npx prestruct build
```

Build runs the whole pipeline: validate -> `vite build` -> inject meta ->
prerender routes. Output lands in `dist/` with one `index.html` per route,
`sitemap.xml`, and `404.html`.

**Live demo:** https://prestruct.creadev.org (built with prestruct; source in
`example/`).

Prefer raw npm scripts over the CLI? The `init/` template scaffolds
`scripts/prerender.js` + `scripts/inject-brand.js` you can wire into
`package.json` directly -- see [docs/guides/cli.md](./docs/guides/cli.md).

---

## Config

```js
// ssr.config.js
export default {
  siteUrl: 'https://yoursite.com',
  siteName: 'Your Site',
  routes: [
    {
      path: '/',
      priority: '1.0',
      meta: {
        title: 'Home | Your Site',
        description: 'Homepage description (150-160 chars).',
      },
    },
    { path: '/about', priority: '0.8', meta: { title: 'About | Your Site' } },
  ],
}
```

Full reference (platform, islands, JSON-LD, `fetchRoutes()`, deployId footer,
`PRESTRUCT_STRICT`): [docs/guides/config.md](./docs/guides/config.md).

---

## CLI

```bash
npx prestruct init      # scaffold template files, never clobber
npx prestruct build     # validate -> vite build -> inject -> prerender
npx prestruct validate  # check ssr.config.js; exit 1 on bad config
npx prestruct clean     # clear the prerender route cache
```

Incremental builds: `.prestruct/cache/` stores rendered HTML; unchanged routes
are skipped on rebuild unless the shell changes. Fix a config mistake silently?
Rebuild with a validation pass first (`npx prestruct validate` prints errors
line-by-line).

---

## Architecture

```
ssr.config.js
      |
      v
prestruct build (or npm run build in the template)
      |
      |- validate        structured [prestruct] diagnostics
      |- vite build      JS/CSS bundles in dist/assets/
      |- inject-brand    meta + OG + JSON-LD into dist/index.html
      `- prerender       vite.ssrLoadModule per route -> static HTML
```

Static HTML is served directly at deploy time (Cloudflare Pages default). No
runtime SSR. Client-only dynamic content mounts into `<pre-island>` elements
after hydration.

---

## Repo layout (this monorepos the npm package)

| Path | Purpose |
|------|---------|
| `engine/` | Single source of truth for `prerender.js`, `inject-brand.js`, `validate-config.js`, islands + usePageMeta. |
| `bin/cli.mjs` | The `prestruct` executable (init/build/validate/clean). |
| `init/` | Project template `prestruct init` scaffolds, including `scripts/proxy.js` (VPS) and `proxy.worker.js` (Cloudflare Worker). |
| `example/` | Working demo site (8 routes), kept byte-identical to engine via `scripts/sync-engine.mjs`. |
| `packs/` | In-repo crashtest pack (`public/prestruct-proxy` v0.2.0) attacking the bot-proxy pair on both runtimes. |
| `docs/` | Full docs site, AGENTS-built with Pagefind. |
| `tests/` | vitest battery, including the engine sync contract test. |

If you touch `engine/`, run `node scripts/sync-engine.mjs` or CI will fail the
byte-identical check. Details in [AGENTS.md](./AGENTS.md).

---

## Bot proxy (optional, additive)

Prerendered HTML covers every route in `ssr.config.js`. Everything else serves
the SPA shell. The optional render proxy intercepts bots and serves live
Puppeteer HTML for the rest -- deploy it on a cheap VPS
([README-proxy.md](./README-proxy.md), Option A: Node + Puppeteer) or as a
Cloudflare Worker with Browser Rendering (Option B). Humans always get static
CF Pages output; the two layers stack, they don't replace each other.

---

## Crash testing (in-repo pack)

`packs/public/prestruct-proxy` (pack v0.2.0) is this repo's own adversarial
pack for the bot-proxy pair above: four wire-level contracts (method matrix,
hostile-path fuzz, bot-render 302 fallback, refresh-secret strict parity),
run through the [crashtest](https://github.com/dhaupin/crashtest) harness
against both runtimes. Attack route names come from the host `moduleCtx`, so
the pack runs against any wiring. Latest results live in
[labs/hardening.md](./labs/hardening.md), the CI-comparable ledger in
[labs/crashledger.json](./labs/crashledger.json).

The pack travels with the checkout, not the npm tarball. Adopting it from
another repo is one line in that repo's `crashtest.config.js`:
`packs: ['/abs/path/to/prestruct/packs']` -- contract table and runbook in
[packs/README.md](./packs/README.md).

---

## Deploy

- Cloudflare Pages: [docs/guides/cloudflare.md](./docs/guides/cloudflare.md)
  (`npm run build`, output `dist/`, Node 20+).
- Any static host works too: `dist/` is a plain static folder.

---

## Stack

- Vite 5+ (examples and the template battery build on Vite 6)
- React 18+
- React Router v6 and v7 both work: v6 via the `./server.js` subpath, v7 via
  the package-root fallback -- scaffold imports use the namespace+destructure
  form so CJS v7 passes vite SSR (docs and generated HTML render from v7 live)
- Cloudflare Pages default; any static host otherwise
- Node 20+

---

## Publishing state

**prestruct is on npm: <https://www.npmjs.com/package/prestruct>** (1.0.0,
published via `publish.yml`, GitHub Actions OIDC trusted publishing with
npm provenance -- verify with `npm audit signatures`). Tags drive releases:
`v*` triggers npm publish plus the GitHub release archive (template zip with
a self-testing battery). `main` may be ahead of the latest tag; its version
pins are the next planned release.

Local install test from the registry tarball (35 files) passed: `init` never
clobbers, `build` produces full `dist/` (baked meta, sitemap, 404). The
release-body template inside `release.yml` was corrected in the v1.0.0
aftermath to match what the archive actually contains.

**Legal:** using prestruct means agreeing to [LICENSE](./LICENSE) and
[LEGAL.md](./LEGAL.md). Fair-Code: commercial SaaS use is restricted.

---

## Read next

- [AGENTS.md](./AGENTS.md) -- engineering history, gotchas, hard rules,
  what's in/out of scope.
- [labs/prd-prestruct.md](./labs/prd-prestruct.md) -- roadmap.
- [docs/](./docs/index.md) -- full site (SEO, routing, islands, proxy,
  Cloudflare).

_No runtime deps added. Config is the API._
