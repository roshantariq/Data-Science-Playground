import { useState } from 'react'
import { currentTheme, setTheme, type Theme } from './theme.ts'
import './App.css'

function App() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <>
      <header className="site-header">
        <span className="site-name">Data Science Playground</span>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => {
            setTheme(next)
            setThemeState(next)
          }}
        >
          {next === 'dark' ? 'Dark mode' : 'Light mode'}
        </button>
      </header>
      <main>
        <h1>Data Science Playground</h1>
      </main>
    </>
  )
}

export default App
