import { useState } from 'react'
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

function App() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)
  const next = NEXT[theme]

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
          Theme: {LABEL[theme]}
        </button>
      </header>
      <main>
        <h1>Data Science Playground</h1>
      </main>
    </>
  )
}

export default App
