---
layout: default
title: Advanced Proxy
nav_order: 20
---


Dynamic rendering for bots using Puppeteer - VPS or Cloudflare Worker.

## When to Use the Proxy

The proxy handles requests that weren't prerendered at build time:

- **Dynamic routes** - Blog posts fetched from CMS
- **Search results** - `/search?q=...` 
- **User-specific pages** - Can't prerender
- **Frequent updates** - Stock prices, live data

## Architecture

```
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

```js
// ssr.config.js
export default {
  siteUrl: 'https://example.com',
  proxy: {
    url: 'https://proxy.example.com',
    targetUrl: 'https://origin.example.com',
    secret: process.env.PRESTRUCT_SECRET,
    botList: ['googlebot', 'bingbot'],
  }
}
```

### 3. Run

```bash
export PRESTRUCT_SECRET=your-secret
export PORT=3000
node scripts/proxy.js
```

### 4. Process Manager

```bash
pm2 start scripts/proxy.js --name prestruct-proxy
```

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

### Cache Key
SHA-256 of URL path + query string.

### TTL
- VPS: 24 hours default (configurable)
- Worker: Set via `CACHE_TTL_SECONDS`

### Cache Busting

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

- Requires matching `PRESTRUCT_SECRET` for cache refresh
- Only GET requests processed
- URL validation before Puppeteer

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