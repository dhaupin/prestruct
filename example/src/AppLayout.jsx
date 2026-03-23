/**
 * AppLayout.jsx -- NO BrowserRouter here, ever.
 * Imported by App.jsx (client) and prerender.js (SSR).
 */

import { Routes, Route, useLocation, NavLink, Link } from 'react-router-dom'
import { useEffect } from 'react'
import Home     from './pages/Home.jsx'
import About    from './pages/About.jsx'
import Use      from './pages/Use.jsx'
import NotFound from './pages/NotFound.jsx'

const GITHUB = 'https://github.com/dhaupin/cf-seo-ssr'

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
          <span className="wordmark-slash">/</span>cf-seo-ssr
        </Link>
        <nav className="nav">
          <NavLink to="/"     end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>home</NavLink>
          <NavLink to="/about"   className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>about</NavLink>
          <NavLink to="/use"     className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>use it</NavLink>
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
          <Route path="/use"   element={<Use />} />
          <Route path="*"      element={<NotFound />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="footer-left">
          <span>cf-seo-ssr</span>
          <span>MIT license</span>
        </div>
        <div className="footer-right">
          <a href={GITHUB} target="_blank" rel="noopener noreferrer">dhaupin/cf-seo-ssr</a>
        </div>
      </footer>
    </div>
  )
}
