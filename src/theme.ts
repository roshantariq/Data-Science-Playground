export type Theme = 'light' | 'dark'

const KEY = 'theme'

// The theme in effect: the saved choice, else the system setting.
export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
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
