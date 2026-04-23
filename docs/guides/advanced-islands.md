---
layout: default
title: Advanced Islands
nav_order: 11
---


Deep dive into dynamic islands patterns with prestruct.

## How Islands Work

Islands punch holes through prerendered HTML for client-only content. The static HTML renders with fallback content (visible to crawlers), then React hydrates and replaces it.

```
Build Time                              Client Time
────────────                             ───────────
<pre-island>Hello</pre-island>    →     <pre-island>Hello</pre-island>
(static, visible to crawlers)            (replaced by React component)
```

## Basic Setup

### 1. Register in AppIslands.jsx

```jsx
// src/AppIslands.jsx
import CartWidget from './islands/CartWidget.jsx'
import RecentlyViewed from './islands/RecentlyViewed.jsx'

export const islands = {
  'cart-widget': CartWidget,
  'recently-viewed': RecentlyViewed,
}
```

### 2. Use in Your Components

```jsx
// In any page component
export default function Shop() {
  return (
    <div>
      <h1>Shop</h1>
      <pre-island data-pre-island="cart-widget">
        <span className="loading">Loading cart...</span>
      </pre-island>
    </div>
  )
}
```

### 3. Mount in AppLayout

```jsx
// src/AppLayout.jsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { mountIslands } from './islands.js'
import { islands } from './AppIslands.jsx'

export default function AppLayout() {
  const { pathname } = useLocation()
  
  useEffect(() => {
    // Mount islands after each navigation
    const timer = setTimeout(() => mountIslands(islands), 0)
    return () => clearTimeout(timer)
  }, [pathname])
  
  return (
    // ... your routes
  )
}
```

## Load Strategies

### eager (default)

Mounts immediately after hydration. Use for above-fold content.

```jsx
<pre-island data-pre-island="header-cart" />
```

### visible

Mounts when element enters viewport via IntersectionObserver.

```jsx
<pre-island data-pre-island="footer-newsletter" data-pre-load="visible">
  <div className="skeleton" />
</pre-island>
```

### idle

Mounts during browser idle time. Best for non-critical content.

```jsx
<pre-island data-pre-island="chat-widget" data-pre-load="idle" />
```

## Island Component Patterns

### Reading Data from localStorage

```jsx
// src/islands/CartWidget.jsx
import { useState, useEffect } from 'react'

export default function CartWidget() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Read from localStorage on mount
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    setItems(cart)
    setLoading(false)
  }, [])
  
  if (loading) {
    return <div className="cart-skeleton">Loading...</div>
  }
  
  return (
    <div className="cart-widget">
      <span>{items.length} items</span>
      <span>${items.reduce((sum, i) => sum + i.price, 0)}</span>
    </div>
  )
}
```

### Fetching Data

```jsx
// src/islands/RecentlyViewed.jsx
import { useState, useEffect } from 'react'

export default function RecentlyViewed() {
  const [products, setProducts] = useState([])
  
  useEffect(() => {
    fetch('/api/recently-viewed')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])
  
  if (!products.length) return null
  
  return (
    <div className="recently-viewed">
      {products.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  )
}
```

### Using a Global Store

```jsx
// If using Zustand, Redux, etc.
import { useStore } from './store.js'

export default function UserMenu() {
  const user = useStore(s => s.user)
  
  if (!user) {
    return <a href="/login">Login</a>
  }
  
  return <span>Welcome, {user.name}</span>
}
```

## Multiple Islands

You can use multiple islands on a single page:

```jsx
export default function ProductPage() {
  return (
    <div>
      <header>
        <pre-island data-pre-island="header-cart" />
      </header>
      
      <main>
        <h1>Product Name</h1>
        {/* Product content */}
      </main>
      
      <aside>
        <pre-island data-pre-island="recently-viewed" data-pre-load="visible" />
        <pre-island data-pre-island="recommendations" data-pre-load="idle" />
      </aside>
    </div>
  )
}
```

## Islands with State Sharing

Since islands are independent React roots, they can't share state directly. Options:

### 1. Custom Events

```jsx
// In cart island
useEffect(() => {
  const handleUpdate = (e) => setCount(e.detail.count)
  window.addEventListener('cart-update', handleUpdate)
  return () => window.removeEventListener('cart-update', handleUpdate)
}, [])

// In product island
const addToCart = (item) => {
  // ... add to localStorage
  window.dispatchEvent(new CustomEvent('cart-update', { 
    detail: { count: newCount } 
  }))
}
```

### 2. BroadcastChannel

```jsx
const channel = new BroadcastChannel('cart_channel')

// In one island
channel.postMessage({ type: 'ADD_ITEM', item })

// In another
channel.onmessage = (e) => {
  if (e.data.type === 'ADD_ITEM') {
    // Update UI
  }
}
```

### 3. polling localStorage

```jsx
// Simple but works
useEffect(() => {
  const interval = setInterval(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    setCartCount(cart.length)
  }, 1000)
  return () => clearInterval(interval)
}, [])
```

## Conditional Islands

Use conditional rendering to show islands only when needed:

```jsx
{showCart && (
  <pre-island data-pre-island="cart-widget">
    <LoadingSkeleton />
  </pre-island>
)}
```

##岛在 SSR

Islands have special behavior during prerendering:

1. **`<pre-island>` passes through** - React's `renderToString` treats it as unknown element
2. **Fallback content renders** - Whatever is inside shows in static HTML
3. **Component never runs** - Island JSX is not executed at build time

This means:
- ✅ Crawlers see fallback content (good for SEO)
- ✅ No private data in static HTML
- ✅ Islands load independently after hydration

## Styling Islands

Since islands mount into empty elements, style the fallback too:

```jsx
<pre-island data-pre-island="cart-widget">
  <div className="cart-placeholder">
    <span className="skeleton-line"></span>
    <span className="skeleton-line short"></span>
  </div>
</pre-island>

<style>{`
  .cart-placeholder { padding: 1rem; }
  .skeleton-line { 
    height: 1rem; 
    background: #eee; 
    margin-bottom: 0.5rem;
    border-radius: 4px;
  }
  .short { width: 60%; }
`}</style>
```

## Debugging Islands

### Check if island mounted

```jsx
// In your island component
useEffect(() => {
  console.log('[island] mounted:', name)
}, [])
```

### Verify elements exist

```jsx
// In browser console
document.querySelectorAll('pre-island[data-pre-island]')
// Shows all island placeholders

// After mounting, they should have React-rendered content
document.querySelectorAll('.cart-widget')
```

### Common Issues

**Island not mounting:**
- Check `data-pre-island` name matches registry key exactly
- Verify `mountIslands(islands)` is called in useEffect

**Double mounting:**
- Normal! `mountIslands` runs on every route change
- The WeakSet in islands.js prevents actual double createRoot

**FOUC on island:**
- Add skeleton/loading fallback inside `<pre-island>`
- Use `data-pre-load="idle"` for below-fold islands

## Performance Tips

1. **Use `visible` for below-fold** - Don't load until needed
2. **Use `idle` for chat widgets** - Low priority
3. **Keep islands small** - They're separate React roots with overhead
4. **Skip islands for cached data** - If data doesn't change, render statically