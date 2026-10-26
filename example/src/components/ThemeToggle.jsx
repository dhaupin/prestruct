import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

// The family theme key (same as the docs layout): dark is the default token
// sheet, only a persisted light theme flips the html[data-theme] attribute.
const THEME_KEY = 'prestruct-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const initial = getInitialTheme()
    setTheme(initial)
    document.documentElement.dataset.theme = initial
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem(THEME_KEY, next)
    document.documentElement.dataset.theme = next
  }

  if (!mounted) {
    return <button className="theme-toggle" aria-label="Toggle theme" disabled />
  }

  return (
    <button 
      className="theme-toggle" 
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} />
      ) : (
        <Moon size={16} />
      )}
    </button>
  )
}