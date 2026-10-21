---
layout: default
title: Bot-Render Proxy
description: "The bot-render proxy pair: express and Worker runtimes, config keys, cache behavior, and the refresh header contract."
nav_order: 15
version: 1.0.0
permalink: /guides/proxy
---


Dynamic rendering for bots using Puppeteer - VPS or Cloudflare Worker.

## When to Use the Proxy

The proxy handles requests that weren't prerendered at build time:

- **Dynamic routes** - Blog posts fetched from CMS
- **Search results** - `/search?q=...`
- **User-specific pages** - Can't prerender
- **Frequent updates** - Stock prices, live data

## Architecture

```text
Request
   │
   ├─► Bot? ──► Puppeteer ──► Rendered HTML ──► Cache ──► Response
   │
   └─► Human ──► 302 Redirect ──► Live site
```

## Bot Detection

The proxy checks User-Agent:

```js
const BOT_LIST = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot',
  'baiduspider', 'yandexbot', 'twitterbot',
  'facebookexternalhit', 'discordbot', 'linkedinbot'
]

function isBot(ua) {
  const lower = (ua || '').toLowerCase()
  return BOT_LIST.some(token => lower.includes(token))
}
```

Configure in `ssr.config.js`:

```js
proxy: {
  botList: ['googlebot', 'bingbot', 'my-custom-bot'],
}
```

## VPS Deployment

### 1. Install

```bash
npm install express puppeteer
cp init/scripts/proxy.js ./scripts/
```

### 2. Configure

The proxy reads config from `../ssr.config.js` (relative to the copy in
`scripts/`), so it must live next to the same config drive your build. The
auth secret is an env var -- there is no `secret` config key:

```js
// ssr.config.js
export default {
  siteUrl: 'https://example.com',
  proxy: {
    url: 'https://proxy.example.com',
    targetUrl: 'https://origin.example.com',   // optional
    botList: ['googlebot', 'bingbot'],
  }
}
```

### 3. Run

```bash
export PRESTRUCT_SECRET=your-secret   # unset = cache refresh disabled
cd /path/to/project                   # ssr.config.js must be ../ssr.config.js
PORT=3000 node scripts/proxy.js
```

### 4. Process Manager

Two starters ship in the scaffold (`npx prestruct init`):

```bash
# pm2 (ecosystem.cjs ships configured)
pm2 start scripts/proxy.js --name prestruct-proxy

# or systemd (scripts/prestruct-proxy.service ships configured)
sudo cp scripts/prestruct-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now prestruct-proxy
```

The scaffold keeps a shared, warm Puppeteer browser per AGENTS.md: pages
open/close per request, the browser process stays pooled; on `disconnected`
the reference clears and the next request respawns it.

## Cloudflare Worker Deployment

### Requirements
- Workers Paid plan
- `@cloudflare/puppeteer`

### wrangler.toml

```toml
[[browser]]
binding = "BROWSER"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

[vars]
PRESTRUCT_TARGET_URL = "https://example.com"
```

### Deploy

```bash
wrangler secret put PRESTRUCT_SECRET
wrangler deploy
```

## Caching

### Cache key

Different per runtime:

- **VPS**: SHA-256 of the full request path + query string (filesystem-safe,
  collision-resistant).
- **Worker**: `prestruct:` prefix + percent-encoded path + query (KV, 512-byte
  key limit).

### TTL

- **VPS**: fixed 24h constant (`CACHE_TTL` in scripts/proxy.js -- edit the
  constant to change it). Cache dir relocates via `PRESTRUCT_CACHE_DIR`; total
  cache caps at 500MB with oldest-first eviction.
- **Worker**: `CACHE_TTL_SECONDS` in wrangler.toml `[vars]`, default 86400.

### Cache busting

GET the target path with the `x-prestruct-refresh` header matching
`PRESTRUCT_SECRET`. A matched header skips the cache read (next response is
`X-Prestruct-Cache: MISS`); Worker KV propagation to all edges may take a few
seconds:

```bash
curl -H "x-prestruct-refresh: your-secret" \
  https://proxy.example.com/page/
```

## targetUrl vs siteUrl

```js
proxy: {
  targetUrl: 'http://localhost:5173',  // Local dev
  // or
  targetUrl: 'https://staging.example.com',  // Staging
}
```

## Security

- Cache refresh requires matching `PRESTRUCT_SECRET` (constant-time compare:
  hash + `timingSafeEqual` on the VPS, full-length XOR on the Worker). Unset
  secret = refresh disabled entirely, never allow-all.
- Only GET requests are processed; others get 405.
- Target URL is validated before Puppeteer (HTTP/HTTPS schemes only).
- Every render sends `X-Prestruct-Proxy: true` to the origin so the target can
  identify proxy traffic.

Render responses self-describe via headers: `X-Prestruct-Cache: HIT|MISS` and
`X-Prestruct-Rendered-At` (render timestamp). On render failure the proxy
falls through to a 302 to the live site so bots never receive an error page.

## Browser Pooling

VPS proxy uses single shared Chromium:

```js
let browser = null

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    })
  }
  return browser
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Browser crash | Auto-reopens on next request |
| Navigation timeout | Check targetUrl, increase timeout |
| Cache not invalidating | Verify PRESTRUCT_SECRET matches |
| Worker cold starts | Consider paid plan |

## Next steps

- [Cloudflare Pages](/prestruct/guides/cloudflare) - the Pages side of the split
- [Redirects](/prestruct/guides/redirects) - headers and redirects the build owns