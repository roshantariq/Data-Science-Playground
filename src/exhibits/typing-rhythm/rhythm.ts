// Pure helpers for the results screen: wording, timeline bars and note pitches.
import { column } from './meters.ts'
import { lev, type Key, type Sentence } from './stats.ts'

type Press = NonNullable<Key>

// Whole percent, rounded down so it never claims more typists than were beaten.
export const pct = (p: number) => `${Math.floor(p)}%`

// Backspace presses, and mistakes still there when each sentence ended.
export function mistakes(sentences: Sentence[]) {
  let fixed = 0
  let left = 0
  for (const s of sentences) {
    fixed += s.keys.filter((k) => k?.key === 'Backspace').length
    left += lev(s.target, s.typed.toLowerCase().replace(/[^a-z ]/g, ''))
  }
  return { fixed, left }
}

// A long pause: a gap over 3 times the round's median gap, using the same
// gaps as the stats (next to each other, no Backspace).
export function pauseLimit(sentences: Sentence[]) {
  const gaps = sentences
    .flatMap(({ keys }) =>
      keys.slice(1).map((b, i) => {
        const a = keys[i]
        const ok = a && b && a.key !== 'Backspace' && b.key !== 'Backspace'
        return ok ? b.down - a.down : 0
      }),
    )
    .filter((g) => g > 0)
    .sort((a, b) => a - b)
  if (!gaps.length) return Infinity
  const h = gaps.length >> 1
  return 3 * (gaps.length % 2 ? gaps[h] : (gaps[h - 1] + gaps[h]) / 2)
}

export type Bar = {
  key: string
  start: number // ms from the sentence's first key
  hold: number // ms
  gap: number // ms since the previous key was pressed (0 for the first)
  roll: boolean // pressed before the previous key was let go
  wordStart: boolean // first letter after a space
  pause: boolean // a long pause came before it
}

// One bar per key in a sentence. A key whose release was never seen is drawn as 100 ms.
export function bars(s: Sentence, pause: number): Bar[] {
  const ks = s.keys.filter(Boolean) as Press[]
  return ks.map((k, i) => {
    const prev = ks[i - 1]
    const gap = prev ? k.down - prev.down : 0
    return {
      key: k.key,
      start: k.down - ks[0].down,
      hold: Number.isFinite(k.up) ? Math.max(0, k.up - k.down) : 100,
      gap,
      roll: !!prev && k.down < prev.up,
      wordStart: prev?.key === ' ' && /^[a-z]$/.test(k.key),
      pause: gap > pause,
    }
  })
}

// Pitch by keyboard position on a five-note scale: the 10 key columns run
// left to right over two octaves from middle C. Spaces play a low C;
// Backspace plays nothing.
const SCALE = [0, 2, 4, 7, 9]
export function noteFreq(key: string): number | null {
  if (key === ' ') return 130.81
  const c = column(key)
  if (c < 0) return null
  return 261.63 * 2 ** ((12 * Math.floor(c / 5) + SCALE[c % 5]) / 12)
}
