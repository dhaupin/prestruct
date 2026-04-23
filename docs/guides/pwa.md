---
layout: default
title: PWA Guide
nav_order: 21
---

# PWA Guide

Progressive Web App features for prestruct - offline support and installability.

## Service Worker

### Create sw.js

```js
// public/sw.js
const CACHE_NAME = 'prestruct-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/about/',
        '/manifest.json',
      ])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
          return response
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/offline/')
          }
        })
      return cached || networked
    })
  )
})
```

### Register

```jsx
// In AppLayout or main.jsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

## Manifest

```json
// public/manifest.json
{
  "name": "My Prestruct App",
  "short_name": "MyApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add to HTML head:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
```

## Offline Page

Prerender an offline page:

```js
// ssr.config.js
routes: [
  { path: '/offline/', meta: { title: 'Offline', noindex: true }}
]
```

## Workbox (Advanced)

```bash
npm install workbox-precaching workbox-routing workbox-strategies
```

```js
// public/sw.js
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images' })
)
```

## Checklist

- [ ] HTTPS (required)
- [ ] manifest.json with icons
- [ ] Service worker registered
- [ ] Offline page works
- [ ] Icons at all sizes