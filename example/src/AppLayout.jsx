/**
 * AppLayout.jsx -- NO BrowserRouter here, ever.
 * Imported by App.jsx (client) and prerender.js (SSR).
 */

import { Routes, Route, useLocation, NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import Home    from './pages/Home.jsx'
import About   from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import NotFound from './pages/NotFound.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function AppLayout() {
  return (
    <div className="app">
      <ScrollToTop />
      <header className="site-header">
        <nav className="nav">
          <NavLink to="/"       end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
          <NavLink to="/about"     className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
          <NavLink to="/contact"   className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Contact</NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/about"   element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*"        element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>cf-seo-ssr example &mdash; <a href="https://github.com/your-org/cf-seo-ssr" target="_blank" rel="noopener noreferrer">view on GitHub</a></p>
      </footer>
    </div>
  )
}
