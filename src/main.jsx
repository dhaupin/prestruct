import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = document.getElementById('root')

// Use hydrateRoot when server-rendered content is present (prerendered HTML).
// This attaches React to the existing SSR DOM without replacing it, eliminating
// the flash of unstyled content between SSR paint and React mount.
//
// hydrateRoot requires that SSR and client render produce identical output.
// All known mismatch sources are resolved:
//   - Nav dark state: useState(false) on both, synced after mount via useEffect
//   - Footer year: suppressHydrationWarning on that span
//   - No inline <style> tags anywhere in the component tree
//   - SSR renders correct per-route content (AppLayout, not App)
//
// Falls back to createRoot for direct SPA navigation without SSR content.
if (root.dataset.serverRendered) {
  ReactDOM.hydrateRoot(
    root,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
