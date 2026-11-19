// Sample typists for when this device can't time keys fairly: one real
// round typed on a laptop, and three computer-generated ones.
import admin from './admin-round.json'
import { pickSentences } from './sentences.ts'
import type { Key, Sentence } from './stats.ts'

// A small seeded random generator (mulberry32), so the made-up typists
// are the same on every visit.
function seeded(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Style = {
  gap: number // typical ms between presses
  jitter: number // how much gaps vary (log scale)
  wordPause: number // gap multiplier after a space
  hold: number // typical ms a key is held
  holdJitter: number
  slips: number // chance of hitting a wrong letter
  fixes: number // chance a slip is fixed with Backspace
}

// A made-up round of 10 sentences typed in the given style.
export function simulate(seed: number, p: Style): Sentence[] {
  const r = seeded(seed)
  const normal = () =>
    Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
  return pickSentences(10, r).map((target) => {
    const keys: Key[] = []
    let t = 0
    let prev = ''
    let typed = ''
    const press = (key: string) => {
      t +=
        p.gap * Math.exp(p.jitter * normal()) * (prev === ' ' ? p.wordPause : 1)
      const hold = Math.max(30, p.hold * Math.exp(p.holdJitter * normal()))
      keys.push({ key, down: t, up: t + hold })
      prev = key
    }
    for (const c of target) {
      if (c !== ' ' && r() < p.slips) {
        const wrong = c === 'e' ? 'r' : 'e'
        press(wrong)
        if (r() >= p.fixes) {
          typed += wrong // left in
          continue
        }
        press('Backspace')
      }
      press(c)
      typed += c
    }
    return { target, typed, keys }
  })
}

// Saved JSON writes a missing key release as null.
const fromJson = (s: { target: string; typed: string; keys: unknown[] }[]) =>
  s.map((x) => ({
    ...x,
    keys: x.keys.map((k) =>
      k
        ? {
            ...(k as NonNullable<Key>),
            up: (k as { up: number | null }).up ?? NaN,
          }
        : null,
    ),
  })) as Sentence[]

export const SAMPLES: { name: string; sentences: Sentence[] }[] = [
  { name: 'Admin Round', sentences: fromJson(admin) },
  {
    name: 'Fast but messy',
    sentences: simulate(1, {
      gap: 105,
      jitter: 0.45,
      wordPause: 1.4,
      hold: 80,
      holdJitter: 0.35,
      slips: 0.1,
      fixes: 0.6,
    }),
  },
  {
    name: 'Slow and steady',
    sentences: simulate(2, {
      gap: 320,
      jitter: 0.16,
      wordPause: 1.1,
      hold: 110,
      holdJitter: 0.08,
      slips: 0.01,
      fixes: 1,
    }),
  },
  {
    name: 'All-rounder',
    sentences: simulate(3, {
      gap: 170,
      jitter: 0.3,
      wordPause: 1.25,
      hold: 95,
      holdJitter: 0.22,
      slips: 0.02,
      fixes: 0.9,
    }),
  },
]

// True when key times sit on a coarse grid (15 ms or more), as when a
// browser blurs its clocks against fingerprinting (Firefox rounds to
// 16.67 ms, Tor up to 100 ms). Normal clocks are 1 ms or finer.
export function coarse(stamps: number[]) {
  const s = [...stamps].sort((a, b) => a - b)
  const gaps = s
    .slice(1)
    .map((t, i) => t - s[i])
    .filter((g) => g > 0.5)
  return gaps.length >= 8 && gaps.reduce(roughGcd) >= 15
}

// The largest step that all gaps are whole multiples of, to within 1 ms.
function roughGcd(a: number, b: number): number {
  while (b >= 1) {
    const r = a % b
    if (r < 1 || b - r < 1) return b
    ;[a, b] = [b, r]
  }
  return 0
}
