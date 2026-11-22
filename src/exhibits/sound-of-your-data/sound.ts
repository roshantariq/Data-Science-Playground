// Sound of Your Data's maths: outliers, pitches, grouping long series, number
// columns in a CSV, and the made-up series. Plain TypeScript, no React or
// audio, so it can be tested.

export type Rand = () => number

// Upload limits (the worker checks rows, the page checks size).
export const MAX_BYTES = 5 * 1024 * 1024
export const MAX_ROWS = 50_000
export type Column = { name: string; values: number[] }
export type Dataset = {
  id: string
  name: string
  credit?: string
  columns: Column[]
}

// A value is an outlier when it doesn't fit the values around it: it sits
// far from the median of its neighbours (10 either side), measured against
// how far values usually sit from theirs (a robust z-score above 5). Only
// the strongest 1% are kept (at least one), so a repeating pattern like
// quiet weekends doesn't turn every weekend into an outlier.
const NEAR = 10
const LIMIT = 5
const SHARE = 0.01

export function outliers(values: number[]): boolean[] {
  const flags = values.map(() => false)
  if (values.length < 5) return flags
  const gaps = values.map(
    (v, i) => v - median(values.slice(Math.max(0, i - NEAR), i + NEAR + 1)),
  )
  const sizes = gaps.map(Math.abs)
  // Most values exactly on their neighbours' median (data with no noise):
  // use the average gap instead.
  const typical =
    median(sizes) || sizes.reduce((a, b) => a + b, 0) / sizes.length
  const score = (g: number) =>
    typical > 0 ? (0.6745 * Math.abs(g)) / typical : 0
  gaps
    .map((g, i) => ({ i, z: score(g) }))
    .filter((x) => x.z > LIMIT)
    .sort((a, b) => b.z - a.z)
    .slice(0, Math.max(1, Math.floor(values.length * SHARE)))
    .forEach((x) => (flags[x.i] = true))
  return flags
}

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export type Step = { value: number; outlier: boolean }

export const MAX_STEPS = 400

// What gets played: one step per value, or for long series, groups of
// values averaged into at most MAX_STEPS steps. A group holding an outlier
// plays that outlier, so it still stands out.
export function steps(values: number[], max = MAX_STEPS): Step[] {
  const out = outliers(values)
  if (values.length <= max)
    return values.map((value, i) => ({ value, outlier: out[i] }))
  const result: Step[] = []
  for (let g = 0; g < max; g++) {
    const from = Math.floor((g * values.length) / max)
    const to = Math.floor(((g + 1) * values.length) / max)
    let sum = 0
    let pick = -1
    for (let i = from; i < to; i++) {
      sum += values[i]
      if (out[i] && (pick < 0 || Math.abs(values[i]) > Math.abs(values[pick])))
        pick = i
    }
    result.push(
      pick >= 0
        ? { value: values[pick], outlier: true }
        : { value: sum / (to - from), outlier: false },
    )
  }
  return result
}

// The range pitches are spread over: the ordinary values only, so a few
// outliers don't squash everything else into one note. Outliers sit at the
// top or bottom note.
export function range(s: Step[]) {
  const usual = s.filter((x) => !x.outlier).map((x) => x.value)
  const pool = usual.length ? usual : s.map((x) => x.value)
  let lo = Infinity
  let hi = -Infinity
  for (const v of pool) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return { lo, hi: hi > lo ? hi : lo + 1 }
}

const position = (v: number, lo: number, hi: number) =>
  Math.max(0, Math.min(1, (v - lo) / (hi - lo)))

const LOW = 130.81 // C3
const SCALE = [0, 2, 4, 7, 9] // the five-note scale Typing Rhythm uses
export const NOTES = 16 // C3 to C6, three octaves (C2 to C5 low, C4 to C7 high)

// Notes: the value picks one of 16 notes on the five-note scale. `octave`
// moves the whole range down (-1) or up (+1) an octave.
export function noteFreq(v: number, lo: number, hi: number, octave = 0) {
  const n = Math.round(position(v, lo, hi) * (NOTES - 1))
  return LOW * 2 ** (octave + (12 * Math.floor(n / 5) + SCALE[n % 5]) / 12)
}

// Slide: the value sets the pitch exactly, over the same three octaves.
export function slideFreq(v: number, lo: number, hi: number, octave = 0) {
  return LOW * 2 ** (octave + 3 * position(v, lo, hi))
}

// The columns of a CSV (rows of cells, first row maybe a header) that are
// mostly numbers: at least 80% of the filled cells, and at least 5 values.
export function numberColumns(rows: string[][]): Column[] {
  if (!rows.length) return []
  const isNum = (c: string) => c.trim() !== '' && Number.isFinite(Number(c))
  const header = !rows[0].every(isNum)
  const body = header ? rows.slice(1) : rows
  const width = Math.max(...rows.map((r) => r.length))
  const columns: Column[] = []
  for (let c = 0; c < width; c++) {
    const filled = body.map((r) => r[c] ?? '').filter((x) => x.trim() !== '')
    const values = filled.filter(isNum).map(Number)
    if (values.length < 5 || values.length < filled.length * 0.8) continue
    const name = header ? (rows[0][c] ?? '').trim().slice(0, 60) : ''
    columns.push({ name: name || `Column ${c + 1}`, values })
  }
  return columns
}

const between = (rand: Rand, a: number, b: number) => a + rand() * (b - a)
const noise = (rand: Rand) => rand() + rand() + rand() - 1.5 // roughly bell-shaped
const r0 = (v: number) => Math.round(v)

// Made-up series, new on every load. Each has a shape to hear and one
// value that doesn't belong.
export function madeUp(rand: Rand = Math.random): Dataset[] {
  // A website over 26 weeks: quiet weekends, slow growth, one viral day.
  const viral = Math.floor(between(rand, 60, 170))
  const base = between(rand, 800, 1200)
  const visits = Array.from({ length: 182 }, (_, d) => {
    const weekend = d % 7 >= 5 ? 0.55 : 1
    const v = base * (1 + d / 400) * weekend * (1 + 0.08 * noise(rand))
    return r0(d === viral ? v * between(rand, 4, 6) : v)
  })

  // Heart rate on a 40-minute run, one reading every 10 seconds: warm up,
  // three hard stretches, cool down, and one glitch from the sensor.
  const glitch = Math.floor(between(rand, 40, 200))
  const rest = between(rand, 58, 70)
  const heart = Array.from({ length: 240 }, (_, i) => {
    const m = i / 6 // minutes
    let target = rest
    if (m > 2) target = 135
    if ([10, 20, 30].some((s) => m > s && m < s + 4)) target = 168
    if (m > 36) target = 100
    const ease = Math.min(1, Math.max(0, (m - 1) / 3))
    const v = rest + (target - rest) * (m < 4 ? ease : 1) + 3 * noise(rand)
    return r0(i === glitch ? (rand() < 0.5 ? 38 : 225) : v)
  })

  // An ice cream shop's daily sales for a year: summer peak, one huge order.
  const order = Math.floor(between(rand, 20, 340))
  const sales = Array.from({ length: 365 }, (_, d) => {
    const season =
      60 + 140 * Math.max(0, Math.sin(((d - 80) / 365) * 2 * Math.PI))
    const v = season * (1 + 0.15 * noise(rand))
    return r0(d === order ? v + between(rand, 600, 900) : v)
  })

  return [
    {
      id: 'visits',
      name: 'Website visits (made up)',
      columns: [{ name: 'Visits per day', values: visits }],
    },
    {
      id: 'heart',
      name: 'Heart rate on a run (made up)',
      columns: [{ name: 'Beats per minute', values: heart }],
    },
    {
      id: 'sales',
      name: 'Ice cream sales (made up)',
      columns: [{ name: 'Sales per day', values: sales }],
    },
  ]
}

// Timings handed over by Typing Rhythm's "Hear it as data" link, checked
// before use: gaps between keys and hold times, in milliseconds.
export const TYPING = 'typing'
export function typingDataset(v: unknown): Dataset | null {
  if (typeof v !== 'object' || v === null) return null
  const { name, gaps, holds } = v as Record<string, unknown>
  const ok = (a: unknown): a is number[] =>
    Array.isArray(a) &&
    a.length >= 5 &&
    a.length <= MAX_ROWS &&
    a.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)
  if (typeof name !== 'string' || !ok(gaps) || !ok(holds)) return null
  return {
    id: TYPING,
    name: name.slice(0, 60),
    columns: [
      { name: 'Gap between keys (ms)', values: gaps },
      { name: 'Time each key was held (ms)', values: holds },
    ],
  }
}
