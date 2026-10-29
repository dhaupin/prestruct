---
layout: default
title: Wiring an island
description: "Client-only content punched through prerendered HTML: register, place, mount, and verify the fallback crawlers see."
nav_order: 25
version: 1.2.0
permalink: /playbooks/wire-an-island/
---

# Wiring an island

An island is client-only content in an otherwise static page. The prerender
ships the fallback inside a `<pre-island>` element; after hydration,
`mountIslands()` replaces it with the real component in its own React root.

Register the component, place the element, and mount after navigation.

```jsx
// AppIslands.jsx
import CartWidget from './islands/CartWidget.jsx'

export const islands = {
  'cart-widget': CartWidget,
}
```

```jsx
// any page component
<pre-island data-pre-island="cart-widget">
  <span className="loading">Loading cart...</span>
</pre-island>
```

```jsx
// AppLayout.jsx - mount after each route change
useEffect(() => {
  const timer = setTimeout(() => mountIslands(islands), 0)
  return () => clearTimeout(timer)
}, [pathname])
```

The `data-pre-load` attribute controls when the island mounts: `eager`
(default), `visible` via `IntersectionObserver`, or `idle` via
`requestIdleCallback`. Build and confirm the fallback is in the static HTML:

```bash
npx prestruct build
grep -o 'pre-island[^>]*' dist/index.html
```

What crawlers see is the fallback content, so make it meaningful. Islands are
separate React roots: they cannot receive props from the tree, read its
context, or run at build time. For indexed dynamic content, prerender it into
its own route instead. See
[Advanced Islands](/prestruct/guides/advanced-islands) for the full pattern.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/playbooks/' | relative_url }}">all playbooks</a></p>
</div>
