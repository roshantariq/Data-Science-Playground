// The six Typing Rhythm stats, worked out the same way as
// research/typing-rhythm/tables.py so they can be compared with its tables.
import tables from './tables.json'

// A letter, space or Backspace press; null marks any other key, which breaks
// the stream so no gap spans it.
export type Key = { key: string; down: number; up: number } | null
export type Sentence = { typed: string; keys: Key[] }

export const STATS = [
  'speed',
  'accuracy',
  'steadiness',
  'touch',
  'rollover',
  'wordstarts',
] as const
export type Stat = (typeof STATS)[number]
export type Stats = Record<Stat, number>

const BK = 'Backspace'
const NORMS: Record<string, number> = tables.norms
const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length
const sd = (x: number[]) => {
  const m = mean(x)
  return Math.sqrt(mean(x.map((v) => (v - m) ** 2)))
}
const median = (x: number[]) => {
  const s = [...x].sort((a, b) => a - b)
  const h = s.length >> 1
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

// Neighbouring keys with no other key between them.
const pairs = (keys: Key[]) =>
  keys
    .slice(1)
    .map((b, i) => [keys[i], b] as const)
    .filter((p): p is readonly [NonNullable<Key>, NonNullable<Key>] =>
      Boolean(p[0] && p[1]),
    )

// The six stats for one round, or null if it is too short to measure.
export function roundStats(sentences: Sentence[]): Stats | null {
  let chars = 0
  let minutes = 0
  let bk = 0
  let roll = 0
  let nroll = 0
  const holds: number[] = []
  const iv: [string, number][] = []
  for (const { typed, keys } of sentences) {
    const pr = pairs(keys)
    if (!pr.length) return null
    // Time as if every gap were typed: the mean gap times the gaps between kept keys.
    const kept = keys.filter(Boolean).length
    minutes += (mean(pr.map(([a, b]) => b.down - a.down)) * (kept - 1)) / 60000
    chars += typed.toLowerCase().replace(/[^a-z ]/g, '').length
    bk += keys.filter((k) => k?.key === BK).length
    nroll += pr.length
    roll += pr.filter(([a, b]) => b.down < a.up).length
    for (const k of keys)
      if (k && k.key !== BK && k.up - k.down > 0 && k.up - k.down < 1000)
        holds.push(k.up - k.down)
    for (const [a, b] of pr)
      if (a.key !== BK && b.key !== BK)
        iv.push([a.key + b.key, b.down - a.down])
  }
  const ms = iv.map(([, t]) => t).filter((t) => t > 0)
  if (ms.length < 50 || minutes <= 0 || chars === 0 || holds.length <= 20)
    return null
  // Letter-corrected gaps: log gap minus the study's norm for that letter pair.
  const pause = 3 * median(ms)
  const res: number[] = []
  const ws: number[] = []
  const ww: number[] = []
  for (const [bg, t] of iv) {
    if (t <= 0 || t > pause || !(bg in NORMS)) continue
    const r = Math.log(t) - NORMS[bg]
    res.push(r)
    if (bg[0] === ' ' && bg[1] !== ' ') ws.push(r)
    else if (!bg.includes(' ')) ww.push(r)
  }
  if (res.length <= 30 || ws.length <= 5 || ww.length <= 20) return null
  return {
    speed: chars / 5 / minutes, // words per minute
    accuracy: bk / chars, // corrections per character
    steadiness: sd(res),
    touch: sd(holds) / mean(holds),
    rollover: roll / nroll,
    wordstarts: mean(ws) - mean(ww),
  }
}

// Share of typists in the study below v (0 to 100), read off 101 percentile
// points. On a tie it takes the middle of the tied typists.
export function percentile(v: number, q: number[]): number {
  const n = q.length - 1
  const i = q.findIndex((x) => x >= v)
  const below =
    i < 0 ? n : i === 0 ? 0 : i - 1 + (v - q[i - 1]) / (q[i] - q[i - 1])
  const j = q.findLastIndex((x) => x <= v)
  const upto = j < 0 ? 0 : j === n ? n : j + (v - q[j]) / (q[j + 1] - q[j])
  return ((below + upto) / 2 / n) * 100
}

// Lower is better for corrections, steadiness (spread), touch (spread) and word starts (slowing).
const HIGHER_IS_BETTER: Record<Stat, boolean> = {
  speed: true,
  accuracy: false,
  steadiness: false,
  touch: false,
  rollover: true,
  wordstarts: false,
}

// For each stat, the share of typists in the study this round beats (0 to 100).
// Tables exist for rounds of 5, 10 and 15 sentences; 20 uses 15.
export function standing(s: Stats, sentences: number): Stats {
  const n = sentences >= 15 ? '15' : sentences >= 10 ? '10' : '5'
  const t = tables.percentiles[n]
  return Object.fromEntries(
    STATS.map((k) => {
      const p = percentile(s[k], t[k])
      return [k, HIGHER_IS_BETTER[k] ? p : 100 - p]
    }),
  ) as Stats
}

// The score: geometric mean of the Speed, Accuracy and Steadiness standings.
export const score = (p: Stats) =>
  Math.cbrt(p.speed * p.accuracy * p.steadiness)
