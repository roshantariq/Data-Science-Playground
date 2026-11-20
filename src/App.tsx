import { useState } from 'react'
import { Link, Outlet, ScrollRestoration } from 'react-router'
import { WINGS } from './exhibits.ts'
import { currentTheme, setTheme, type Theme } from './theme.ts'
import './App.css'

const NEXT: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}
const LABEL: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

// The frame around every page: header, the page itself, footer.
function App() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)
  const next = NEXT[theme]

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="frame header-inner">
          <Link className="site-name" to="/">
            Data Science Playground
          </Link>
          <nav>
            <Link to="/machines">{WINGS.machines.title}</Link>
            <Link to="/feel">{WINGS.feel.title}</Link>
          </nav>
          <button
            type="button"
            className="theme-toggle"
            aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[next]}`}
            onClick={() => {
              setTheme(next)
              setThemeState(next)
            }}
          >
            Theme: {LABEL[theme]}
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="frame footer-inner">
          <div>
            <b>Data Science Playground</b>
            <span>Everything runs in your browser.</span>
          </div>
          <div>
            <span>Site</span>
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
          <div>
            <span>Contact</span>
            <a href="https://github.com/roshantariq">github.com/roshantariq</a>
          </div>
        </div>
      </footer>
      <ScrollRestoration />
    </>
  )
}

export default App
