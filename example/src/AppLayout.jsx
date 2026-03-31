/**
 * AppLayout.jsx -- NO BrowserRouter here, ever.
 * Imported by App.jsx (client) and prerender.js (SSR).
 */

import { Routes, Route, useLocation, NavLink, Link } from 'react-router-dom'
import { useEffect } from 'react'
import Home     from './pages/Home.jsx'
import About    from './pages/About.jsx'
import Deploy      from './pages/Deploy.jsx'
import NotFound from './pages/NotFound.jsx'

const GITHUB        = 'https://github.com/dhaupin/prestruct'
const CREADEV_URL   = 'https://creadev.org'
const CREADEV_BADGE = 'data:image/png;base64,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'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function GitHubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}

export default function AppLayout() {
  return (
    <div className="app">
      <ScrollToTop />
      <header className="site-header">
        <Link to="/" className="header-wordmark">
          <span className="wordmark-bracket">[</span>pre<span className="wordmark-accent">struct</span><span className="wordmark-bracket">]</span>
        </Link>
        <nav className="nav">
          <NavLink to="/"     end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>home</NavLink>
          <NavLink to="/about"   className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>about</NavLink>
          <NavLink to="/deploy"     className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>deploy</NavLink>
          <a href={GITHUB} className="nav-github" target="_blank" rel="noopener noreferrer">
            <GitHubIcon />
            <span>github</span>
          </a>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/"      element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/deploy"   element={<Deploy />} />
          <Route path="*"      element={<NotFound />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="footer-left">
          <span>prestruct</span>
          <span>MIT license</span>
        </div>
        <div className="footer-right">
          <a href={CREADEV_URL} className="footer-built" target="_blank" rel="noopener noreferrer">
            built by
            <img src={CREADEV_BADGE} alt="Creadev.org" className="footer-badge" />
          </a>
        </div>
      </footer>
    </div>
  )
}
