/**
 * AppLayout.jsx
 * =============
 * The router-agnostic layout shell — Nav, Routes, Footer.
 * Imported by both App.jsx (wrapped in BrowserRouter for client)
 * and entry-server.jsx (wrapped in StaticRouter for SSR prerender).
 *
 * No BrowserRouter here — the router is always provided by the caller.
 */

import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Schedule from './pages/Schedule'
import Tickets from './pages/Tickets'
import Vendors from './pages/Vendors'
import Volunteer from './pages/Volunteer'
import Musicians from './pages/Musicians'
import News from './pages/News'
import Contact from './pages/Contact'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function AppLayout() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/about"      element={<About />} />
          <Route path="/schedule"   element={<Schedule />} />
          <Route path="/tickets"    element={<Tickets />} />
          <Route path="/vendors"    element={<Vendors />} />
          <Route path="/volunteer"  element={<Volunteer />} />
          <Route path="/musicians"  element={<Musicians />} />
          <Route path="/news"       element={<News />} />
          <Route path="/contact"    element={<Contact />} />
          <Route path="/terms"      element={<Terms />} />
          <Route path="/privacy"    element={<Privacy />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
