# Prestruct v0.2.6 Plan

Platform modulo, MIT onboarding, and feature gaps filled.

---

## Completed in v0.2.6

### Platform Detection

**ssr.config.js field:**
```js
platform: 'cloudflare'  // 'vercel' | 'netlify' | 'cloudflare' (default)
```

Default is Cloudflare - existing sites work unchanged. Future releases generate host-specific config.

### MIT Onboarding Flow

```
init/ssr.config.example.js  →  User copies →  project/ssr.config.js
                                          ↑
                                   (gitignored - env file)
```

- `ssr.config.example.js` synced on every release (MIT baseline)
- `ssr.config.js` gitignored, protected from sync
- User copies template → customizes → builds

### Full Config Reference

`ssr.config.example.js` documents every option:

- **Platform**: cloudflare/vercel/netlify
- **Site identity**: siteUrl, siteName, author, tagline, ogImage, keywords
- **App**: appLayoutPath
- **Routes**: path, priority, changefreq, meta (title, description, ogImage)
- **JSON-LD**: buildJsonLd()
- **404**: notFound (heading, body, primaryCta)
- **Proxy**: url, secret, targetUrl, botList

---

## Post-v0.2.6: Feature Roadmap

### 1. Platform Stubs (vercel/netlify)

**Where:**
```
init/scripts/
  host-vercel.js     ← NEW
  host-netlify.js    ← NEW
  inject-brand.js   ← MOD: call host scripts
```

**Basic prestruct form:**

```js
// init/scripts/host-vercel.js
// Reads platform from ssr.config.js
// Writes vercel.json to dist/ when platform === 'vercel'
```

```js
// init/scripts/host-netlify.js
// Reads platform from ssr.config.js  
// Writes netlify.toml to dist/ when platform === 'netlify'
```

**inject-brand.js changes:**
```js
if (platform === 'cloudflare') {
  // existing: _headers, _redirects
}
if (platform === 'vercel') {
  await import('./host-vercel.js')
}
if (platform === 'netlify') {
  await import('./host-netlify.js')
}
```

**Dependencies:** None

---

### 2. Proxy: Transparent + Agnostic

**Current:**
```
init/scripts/
  proxy.js          ← VPS/Puppeteer (works anywhere Node runs)
  proxy.worker.js   ← Cloudflare Worker
```

**Changes:**

- Add `proxy.platform` field in ssr.config.js:
  ```js
  proxy: {
    // platform: 'vps' | 'cf-worker' (default: cf-worker)
    url: 'https://...',
    secret: '...',
    targetUrl: '...',  // render different origin
    botList: ['Googlebot', ...]
  }
  ```

- Label files clearly:
  - `proxy.vps.js` (label: "VPS / Node.js + Puppeteer")
  - `proxy.worker.js` (label: "Cloudflare Worker + Browser Rendering API")

- By default: CF Worker works out of the box

- Document platform requirements:
  - CF Worker: Paid plan, Browser Rendering API binding
  - VPS: Node server + Puppeteer installed

**Current status:** Works. Just needs documentation + labels.

---

### 3. Streaming SSR

**Where:** `init/scripts/prerender.js`

**Basic form:**
```js
// ssr.config.js
streaming: false  // default off (synchronous renderToString)
```

**Changes:**
- Add `streaming` field to config
- Use React 18's `renderToPipeableStream` when enabled
- Flush early meta, stream content progressively

**Dependencies:** React 18 (already in use), Node 18+

**Note:** Per AGENTS.md - "not needed for build-time prerender" - but basic streaming is straightforward to add.

---

### 4. Incremental Prerender

**Where:** `init/scripts/prerender.js`

**Basic form:**
```
.prestruct/cache/   ← NEW: route hash cache
```

**Changes:**
- Track file hash + generated html for each route
- Compare at build time:
  - Route file unchanged? → skip
  - Route file changed? → rerender
  - New route? → render
- Cache invalidation:
  - `--force` flag: rebuild all
  - `--route /path`: rebuild single route

**Dependencies:** None (just fs)

**Implementation:**
```js
// Simple hash comparison
const routeChanged = (route) => {
  const cache = readCache()
  const current = hash(routeFile)
  return cache[route.path] !== current
}
```

---

### 5. CMS Routes

**Where:** `init/scripts/prerender.js`

**Basic form:**
```js
// ssr.config.js
async fetchRoutes() {
  // User provides: returns array of route objects
  // Runs at build time only
  return [
    { path: '/blog/post-1', priority: '0.7', meta: {...} },
    { path: '/blog/post-2', priority: '0.6', meta: {...} },
  ]
}
```

**Changes:**
- `prerender.js` checks for `config.fetchRoutes`
- Call if defined, merge with static routes
- User owns CMS fetch logic (headless CMS-agnostic)
- Merge: `staticRoutes + fetchedRoutes`, dedupe by path

**Dependencies:** Node fetch (built-in Node 18+)

---

### 6. Tests + CI

**Where:**
```
.github/workflows/
  test.yml          ← NEW
tests/
  prerender.test.js ← NEW
  inject-brand.test.js ← NEW
```

**Framework:** Vitest (matches Vite ecosystem)

**test.yml:**
```yaml
name: Test
on: [pull_request, push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm test
      - run: npm run build
      - run: npm run prerender
```

**Dependencies:** vitest

**Test files:**
```js
// tests/inject-brand.test.js
// Tests meta injection, OG tags, JSON-LD

// tests/prerender.test.js  
// Tests route parsing, file generation

// tests/islands.test.js
// Tests island mounting
```

---

## Summary

| Area | Files | Complexity |
|------|-------|------------|
| Platform stubs | +3 new | Low |
| Proxy agnostic | +labels, +docs | Low |
| Streaming SSR | modify prerender.js | Medium |
| Incremental | cache logic | Low |
| CMS routes | config pattern | Medium |
| Tests + CI | +test workflow | Medium |

**Approach:** Each feature is self-contained. Build in order above.

**Philosophy:**
- Basic prestruct form first
- Extend only when needed
- Keep core small, extensions optional
- Existing users never broken

---

_Generated: v0.2.6 work_