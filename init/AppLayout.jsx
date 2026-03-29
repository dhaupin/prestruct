/**
 * src/AppLayout.jsx
 * =================
 * TEMPLATE FILE -- copy and wire to your own routes, components, and pages.
 *
 * Router-agnostic layout shell. No BrowserRouter here -- ever.
 *
 * Imported by:
 *   App.jsx          (wrapped in BrowserRouter for the client)
 *   prerender.js     (wrapped in StaticRouter via ssrLoadModule)
 *
 * CRITICAL: Nothing in this file's import graph may import BrowserRouter.
 * If it does, ssrLoadModule will initialize BrowserRouter against window.location
 * (which defaults to '/' in Node), overriding StaticRouter's location context.
 * Every route will prerender as the homepage with no error message.
 * See AGENTS.md for the full root cause analysis.
 *
 * SSR SAFETY: Any component in this tree that accesses window, document, or
 * localStorage must guard with `typeof window !== 'undefined'` because SSR
 * runs in Node where these globals don't exist.
 */

import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

// Replace these with your actual components and pages
// import Nav from './components/Nav'
// import Footer from './components/Footer'
// import Home from './pages/Home'
// import About from './pages/About'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function AppLayout() {
  return (
    <>
      <ScrollToTop />
      {/* <Nav /> */}
      <main>
        <Routes>
          {/* Replace with your routes */}
          {/* <Route path="/"      element={<Home />} /> */}
          {/* <Route path="/about" element={<About />} /> */}
          {/* <Route path="*"      element={<NotFound />} /> */}
        </Routes>
      </main>
      {/* <Footer /> */}
    </>
  )
}
