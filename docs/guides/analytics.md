---
layout: default
title: Analytics & Monitoring
nav_order: 16
---

# Analytics & Monitoring

Tracking performance and user behavior with prestruct.

## Prerendered Sites and Analytics

Since prestruct serves static HTML, standard analytics work differently:

- **Page views**: Work normally (static HTML loads)
- **Events**: Work normally after hydration
- **Custom dimensions**: Need special handling
- **Real-time**: Some tools have limitations

## Google Analytics 4

### Setup

```bash
npm install @analytics/google-analytics
# or
npm install react-ga4
```

### Adding to Your App

Since islands run client-side only, analytics should initialize in a useEffect:

```jsx
// src/components/Analytics.jsx
import { useEffect } from 'react'

export default function Analytics() {
  useEffect(() => {
    // Only load in browser
    if (typeof window === 'undefined') return
    
    // Load GA4
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX'
    document.head.appendChild(script)
    
    window.dataLayer = window.dataLayer || []
    function gtag(){dataLayer.push(arguments)}
    window.gtag = gtag
    
    gtag('js', new Date())
    gtag('config', 'G-XXXXXXXXXX')
  }, [])
  
  return null // This component renders nothing
}
```

### Add as Island

```jsx
// In AppLayout.jsx
import Analytics from './components/Analytics.jsx'

export default function AppLayout() {
  return (
    <>
      <Analytics />
      {/* ... rest of layout */}
    </>
  )
}

// Or as island for better loading
<pre-island data-pre-island="analytics">
  <Analytics />
</pre-island>
```

### Track Page Views

```jsx
// Use a hook to track route changes
import { useLocation } from 'react-router-dom'

function usePageView() {
  const location = useLocation()
  
  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('config', 'G-XXXXXXXXXX', {
      page_path: location.pathname,
    })
  }, [location.pathname])
}
```

## Cloudflare Analytics

### Browser Insights

Cloudflare provides free analytics:

1. Enable in Cloudflare Dashboard → Speed → Overview
2. Add to your site:

```jsx
// Add to index.html head (before other scripts)
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

**Note:** This can impact Lighthouse scores. Consider loading it lazily.

## Track Prerendering

### Custom Prerender Events

```js
// In prerender.js - add to the render loop
console.log(`[prerender] ✓ ${route.path}`)

// Track with build metrics
const startTime = Date.now()
// ... render
const duration = Date.now() - startTime
console.log(`[prerender] ${route.path} rendered in ${duration}ms`)
```

### Track Route Coverage

```js
// Add to build script output
const totalRoutes = ROUTES.length
const succeededRoutes = /* count from succeeded */ 
console.log(`[prerender] Coverage: ${succeededRoutes}/${totalRoutes} routes`)
```

## Error Tracking

### Sentry

```bash
npm install @sentry/react
```

```jsx
// src/main.jsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
})

// Wrap your app
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
```

### Custom Error Boundary

```jsx
// src/components/ErrorBoundary.jsx
import { Component } from 'react'
import * as Sentry from '@sentry/react'

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { extra: errorInfo })
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

## Performance Monitoring

### Web Vitals

```jsx
// src/components/WebVitals.jsx
import { useEffect } from 'react'

export default function WebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Use web-vitals library
    import('web-vitals').then(({ getCLS, getFID, getLCP }) => {
      getCLS(console.log)
      getFID(console.log)
      getLCP(console.log)
    })
  }, [])
  
  return null
}
```

### Send to Analytics

```jsx
import { useEffect } from 'react'

export default function WebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    import('web-vitals').then(({ onCLS, onFID, onLCP }) => {
      onCLS(sendToAnalytics)
      onFID(sendToAnalytics) 
      onLCP(sendToAnalytics)
    })
    
    function sendToAnalytics({ name, delta, id }) {
      window.gtag?.('event', name, {
        event_category: 'Web Vitals',
        event_label: id,
        value: Math.round(name === 'CLS' ? delta * 1000 : delta),
        non_interaction: true,
      })
    }
  }, [])
  
  return null
}
```

## Real User Monitoring

### Custom RUM Island

```jsx
// src/islands/RUM.jsx
import { useEffect, useState } from 'react'

export default function RUM() {
  const [metrics, setMetrics] = useState(null)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Capture navigation timing
    const navigation = performance.getEntriesByType('navigation')[0]
    
    if (navigation) {
      const metrics = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.startTime,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        domInteractive: navigation.domInteractive - navigation.startTime,
      }
      
      setMetrics(metrics)
      
      // Send to your analytics
      fetch('/api/rum', {
        method: 'POST',
        body: JSON.stringify(metrics),
      }).catch(() => {}) // Silently fail
    }
  }, [])
  
  // Don't render anything
  return null
}
```

## Logging

### Client-Side Logger

```jsx
// src/utils/logger.js
const isProduction = import.meta.env.PROD

export const logger = {
  info: (...args) => {
    if (!isProduction) console.info(...args)
    // Send to logging service in production
  },
  warn: (...args) => {
    console.warn(...args)
    // Always send warnings in production
  },
  error: (...args) => {
    console.error(...args)
    // Send errors to Sentry, etc.
  }
}
```

### API Request Logging

```js
// In your fetch wrapper
async function apiRequest(url, options = {}) {
  const startTime = Date.now()
  
  try {
    const response = await fetch(url, options)
    const duration = Date.now() - startTime
    
    logger.info(`API: ${url}`, { 
      status: response.status, 
      duration 
    })
    
    return response
  } catch (error) {
    logger.error(`API Error: ${url}`, { 
      error: error.message,
      duration: Date.now() - startTime 
    })
    throw error
  }
}
```

## Debug Mode

### Enable in Development

```js
// In main.jsx or your analytics component
const DEBUG = import.meta.env.DEV

useEffect(() => {
  if (DEBUG) {
    // Log navigation
    const originalPush = window.history.pushState
    window.history.pushState = function(...args) {
      console.log('[router] Navigation to:', args[0])
      return originalPush.apply(this, args)
    }
  }
}, [])
```

### Build Time Logging

```js
// In prerender.js
console.log('[prerender] Starting...')
console.log('[prerender] Routes:', ROUTES.length)
console.log('[prerender] Site URL:', siteUrl)

// After each route
console.log(`[prerender] ✓ ${route.path}`)

// Summary
console.log(`[prerender] Complete: ${succeeded}/${total} routes`)
```

## Health Checks

### Endpoint for Monitoring

```js
// Cloudflare Pages Function
// functions/api/health.js
export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    build: process.env.BUILD_ID || 'unknown'
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

## Best Practices

1. **Load analytics asynchronously** - Don't block page render
2. **Use islands** - Load tracking code only when needed
3. **Sample in development** - Don't flood analytics with test data
4. **Track what matters** - Focus on business metrics
5. **Set up alerts** - Notify when error rates spike

## Dashboard Tools

- **Google Analytics 4** - Traffic, behavior, conversions
- **Cloudflare Analytics** - Performance, security
- **Sentry** - Error tracking
- **Datadog** - Full-stack monitoring
- **Grafana** - Custom dashboards