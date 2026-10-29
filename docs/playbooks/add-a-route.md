---
layout: default
title: Adding a route
description: "One route in ssr.config.js, a matching component, a rebuilt page, and a green audit."
nav_order: 25
version: 1.2.0
permalink: /playbooks/add-a-route/
---

# Adding a route

A route is one entry in `ssr.config.js` plus the component the router already
knows how to render. Add both, then rebuild.

```js
// ssr.config.js - routes array
{
  path: '/pricing/',
  priority: '0.8',
  changefreq: 'monthly',
  meta: {
    title: 'Pricing | Your Site',
    description: 'Plans and pricing for Your Site (150-160 chars).',
  }
}
```

The route path must match the `<Route path>` in `AppLayout.jsx`. Add the
component there if it is new:

```jsx
// AppLayout.jsx
<Route path="/pricing/" element={<Pricing />} />
```

Rebuild and confirm the page baked:

```bash
npx prestruct build
ls dist/pricing/index.html
```

An empty `routes` array fails the build, and a route that fails to render
exits non-zero rather than shipping a blank page. Both are contract, not
warnings. When a route's content comes from a CMS, the routes come from
`fetchRoutes()` instead of the static array - see
[Configuration](/prestruct/guides/config).

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/playbooks/' | relative_url }}">all playbooks</a></p>
</div>
