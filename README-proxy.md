# Prestruct render proxy

The proxy is an optional addition to the Prestruct build pipeline. It adds
dynamic bot-time rendering on top of the existing build-time prerender.

`npx prestruct init` scaffolds all the proxy files (`scripts/proxy.js`,
`scripts/proxy.worker.js`, `proxy.package.json`, `wrangler.toml`) into your
project, so on a scaffolded project you can skip the file-copying steps below.
See also: [docs/guides/cloudflare.md](docs/guides/cloudflare.md) for the Pages
side of the setup.

**Without the proxy:** bots get the static prerendered HTML from Cloudflare Pages.
This covers every route listed in `ssr.config.js`. Routes not in that list serve
the SPA shell with no prerendered content.

**With the proxy:** bots are intercepted and served a live Puppeteer render of
the target page. Humans still get the static CF Pages site. The proxy adds coverage
for dynamic routes, paginated URLs, and any content that changes between deploys.

The two approaches stack -- you don't replace one with the other.

---

## Choose a deployment target

Two runtimes are available. Pick one.

| | VPS (Node) | Cloudflare Worker |
|---|---|---|
| File | `scripts/proxy.js` | `scripts/proxy.worker.js` |
| Runtime | Node 20+, Express, Puppeteer | CF Workers + Browser Rendering API |
| Plan required | Any VPS ($5/mo Hetzner works) | Workers Paid |
| Cache storage | Disk (`.prestruct_cache/`) | KV namespace |
| Cold start | Pre-warmed on process start | Per-isolate (fast) |
| Chromium | Downloaded by Puppeteer | Managed by Cloudflare |
| TLS | Reverse-proxy with nginx/Caddy | Included |

---

## Option A: VPS setup

### 1. Provision a server

Any Linux VPS works. The proxy needs:
- Node 20+
- ~200MB RAM for the Chromium process + 50MB headroom per concurrent page
- A domain or subdomain pointed at it (for TLS)

### 2. Copy files to the server

Copy these files to your VPS (structure can be flat). On a scaffolded project
they already exist, created by `npx prestruct init`:
```
scripts/proxy.js
ssr.config.js
proxy.package.json   -> rename to package.json
```

### 3. Install dependencies

```bash
npm install
```

Puppeteer downloads a compatible Chromium binary automatically during install.

### 4. Set the secret

```bash
export PRESTRUCT_SECRET="a-long-random-string"
```

Use the same value in `config.proxy.secret` in `ssr.config.js`. Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Start the proxy

For a quick test:

```bash
node scripts/proxy.js
```

Prestruct ships two keep-alive starters so you don't have to write your own:
| Starter | File | Start it with |
|---|---|---|
| pm2 | `ecosystem.cjs` | `pm2 start ecosystem.cjs` |
| systemd | `scripts/prestruct-proxy.service` | see the comments in the unit file |

pm2 (from the project root, after `npm install` of the proxy dependencies):

```bash
export PRESTRUCT_SECRET=your-secret
pm2 start ecosystem.cjs
pm2 save && pm2 startup        # survive reboots
pm2 logs prestruct-proxy       # watch it
```

The ecosystem file pins one process (`exec_mode: fork`) and restarts on memory
spikes -- the proxy keeps a warm Chromium pool, so it must never be clusterised.

For systemd, the unit file is also copied by `prestruct init`. Point
`WorkingDirectory` at your install path, put `PRESTRUCT_SECRET` in
`/etc/prestruct/config.env`, then `sudo systemctl enable --now prestruct-proxy`.
Full instructions in the comments of the unit file.

### 6. Set up TLS

The proxy listens on `PORT` (default 3000). Put nginx or Caddy in front of it.

Caddy example (automatic TLS):
```
proxy.yoursite.com {
  reverse_proxy localhost:3000
}
```

### 7. Update ssr.config.js

```js
proxy: {
  url:       'https://proxy.yoursite.com',
  secret:    'a-long-random-string',   // same value as PRESTRUCT_SECRET env
  targetUrl: null,                     // defaults to siteUrl
  botList:   [ /* ... */ ],
},
```

### 8. Rebuild and deploy

```bash
npm run build
```

`inject-brand.js` reads `config.proxy.url` and adds the proxy origin to
`connect-src` in `dist/_headers` automatically.

---

## Option B: Cloudflare Worker setup

### 1. Create a Worker project

```bash
npm create cloudflare@latest prestruct-proxy
cd prestruct-proxy
npm install @cloudflare/puppeteer
```

### 2. Copy the Worker file

Copy `scripts/proxy.worker.js` into the project. Update `wrangler.toml` (or
copy the included `wrangler.toml` and fill in the blanks).

### 3. Create a KV namespace

```bash
wrangler kv namespace create CACHE
```

Copy the output `id` into `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CACHE"
id      = "paste-your-id-here"
```

### 4. Add the Browser binding

```toml
[[browser]]
binding = "BROWSER"
```

### 5. Set target URL and secret

In `wrangler.toml`:
```toml
[vars]
PRESTRUCT_TARGET_URL = "https://yoursite.com"
CACHE_TTL_SECONDS    = "86400"
```

Set the secret (never in wrangler.toml):
```bash
wrangler secret put PRESTRUCT_SECRET
```

### 6. Deploy

```bash
wrangler deploy
```

Your Worker URL will be something like `prestruct-proxy.your-account.workers.dev`.
Point a custom domain at it via the CF dashboard if preferred.

### 7. Update ssr.config.js

```js
proxy: {
  url:       'https://prestruct-proxy.your-account.workers.dev',
  secret:    'same-value-as-wrangler-secret',
  targetUrl: null,
  botList:   [ /* ... */ ],
},
```

### 8. Rebuild and deploy CF Pages

```bash
npm run build
```

---

## Pointing the proxy at a non-Prestruct site

Set `config.proxy.targetUrl` (or `PRESTRUCT_TARGET_URL` for the Worker) to any
publicly reachable URL. The proxy will Puppeteer-render that target instead of
`siteUrl`.

Examples:
```js
// WordPress site
targetUrl: 'https://wordpress.yoursite.com'

// Local Vite dev server (VPS proxy, same machine)
targetUrl: 'http://localhost:5173'

// Staging environment
targetUrl: 'https://staging.yoursite.com'
```

The rendered HTML is returned verbatim to the bot. Meta tags, canonical URLs,
and structured data come from whatever the target page produces.

The localhost loopback case works when the proxy and the target server run on the
same machine. Puppeteer resolves `localhost` in the context of the proxy process,
not the requesting client.

---

## Flushing the cache

Send `x-prestruct-refresh` with the secret value to bust the cache for a specific path:

```bash
curl -H "x-prestruct-refresh: your-secret" https://proxy.yoursite.com/blog/my-post
```

The path is re-rendered immediately and the new HTML replaces the cache entry.
All other paths are unaffected.

If `PRESTRUCT_SECRET` is not set on the proxy host, the refresh feature is disabled.
The header is ignored regardless of its value.

---

## Keeping bot lists in sync

The VPS proxy reads `config.proxy.botList` from `ssr.config.js` at startup.

The Worker proxy has its own `BOT_LIST` array at the top of `proxy.worker.js`
(Workers have no access to build-time config). You usually never touch it:
when `config.proxy.url` is set, the build (`inject-brand.js`) rewrites the
Worker's `BOT_LIST` from `ssr.config.js` automatically:

```text
[inject-brand] BOT_LIST synced from ssr.config.js (13 bots) -> scripts/proxy.worker.js
```

Edit `botList` in `ssr.config.js`, rebuild, redeploy the Worker. The sync is
idempotent (no rewrite when already equal) and is skipped when
`scripts/proxy.worker.js` does not exist or the array cannot be found.

---

## What the proxy does not do

- It does not replace `npm run build`. The build-time prerender still runs and
  still produces static HTML for configured routes.
- It does not serve humans. Non-bot requests get a 302 to the live site.
- It does not transform HTML. The rendered snapshot is returned as-is.
- It does not handle POST, PUT, or other methods.
