// The best round, kept in this browser as stat results only: the score and
// six percentages. No timings, no letters.
import { STATS, type Stats } from './stats.ts'

const KEY = 'typing-rhythm-best'

export type Best = { score: number; standing: Stats }

// A saved best, or null if there's none or it isn't in the shape we wrote.
export function parseBest(text: string | null): Best | null {
  try {
    const b = JSON.parse(text ?? 'null')
    const ok =
      typeof b?.score === 'number' &&
      STATS.every((k) => typeof b.standing?.[k] === 'number')
    return ok ? { score: b.score, standing: b.standing } : null
  } catch {
    return null
  }
}

// Storage can be blocked (e.g. private mode); then nothing is saved.
export function loadBest() {
  try {
    return parseBest(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

// False if the browser blocks storage, so nothing can be kept.
export function canSave() {
  try {
    localStorage.getItem(KEY)
    return true
  } catch {
    return false
  }
}

export function saveBest(b: Best) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b))
  } catch {
    // Not saved.
  }
}

export function deleteBest() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to delete.
  }
}
