export type Theme = 'system' | 'light' | 'dark'

const KEY = 'theme'

// The chosen theme; 'system' when nothing is set.
export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  return set === 'light' || set === 'dark' ? set : 'system'
}

export function setTheme(theme: Theme) {
  const root = document.documentElement
  try {
    if (theme === 'system') {
      delete root.dataset.theme
      localStorage.removeItem(KEY)
    } else {
      root.dataset.theme = theme
      localStorage.setItem(KEY, theme)
    }
  } catch {
    // Storage blocked (e.g. private mode): the choice lasts for this page only.
  }
}

// Apply a saved choice before the first render.
export function applySavedTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved
    }
  } catch {
    // Storage blocked: follow the system setting.
  }
}
