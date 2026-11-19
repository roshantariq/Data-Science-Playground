import { describe, expect, test } from 'vitest'
import { SENTENCES } from './sentences.ts'
import {
  lev,
  percentile,
  roundStats,
  score,
  standing,
  type Key,
  type Sentence,
} from './stats.ts'

// Every key 200 ms after the last, held for 100 ms.
function typeOut(text: string, start = 0): Key[] {
  return [...text].map((key, i) => ({
    key,
    down: start + i * 200,
    up: start + i * 200 + 100,
  }))
}
// Words per minute at 200 ms a gap: the clock runs from the first press to
// the last, so a sentence of c characters is timed over c - 1 gaps.
const SPEED5 =
  SENTENCES.slice(0, 5).join('').length /
  5 /
  ((SENTENCES.slice(0, 5).reduce((t, s) => t + s.length - 1, 0) * 0.2) / 60)
const round = (n: number): Sentence[] =>
  SENTENCES.slice(0, n).map((s) => ({ target: s, typed: s, keys: typeOut(s) }))

describe('roundStats', () => {
  test('speed is characters / 5 per minute', () => {
    expect(roundStats(round(5))!.speed).toBeCloseTo(SPEED5, 6)
  })

  test('a gap across another key (such as Shift) is left out', () => {
    const r = round(5)
    const keys = r[0].keys as NonNullable<Key>[]
    // Shift pressed between the 3rd and 4th keys, and the rest 5 s later.
    r[0].keys = [
      ...keys.slice(0, 3),
      null,
      ...keys
        .slice(3)
        .map((k) => ({ ...k, down: k.down + 5000, up: k.up + 5000 })),
    ]
    expect(roundStats(r)!.speed).toBeCloseTo(SPEED5, 6)
  })

  test('accuracy is Backspace presses per character', () => {
    const r = round(5)
    const k = r[0].keys
    r[0].keys = [k[0], { key: 'Backspace', down: 100, up: 150 }, ...k.slice(1)]
    const chars = SENTENCES.slice(0, 5).join('').length
    expect(roundStats(r)!.accuracy).toBeCloseTo(1 / chars, 9)
  })

  test('a mistake left in counts the same as one fixed', () => {
    const r = round(5)
    r[0].typed = 'x' + r[0].typed.slice(1) // wrong first letter, not fixed
    const chars = SENTENCES.slice(0, 5).join('').length
    expect(roundStats(r)!.accuracy).toBeCloseTo(1 / chars, 9)
  })

  test('every key held while the next is pressed is all rollover', () => {
    const r = round(5).map((s) => ({
      ...s,
      keys: s.keys.map((k) => k && { ...k, up: k.down + 300 }),
    }))
    expect(roundStats(r)!.rollover).toBe(1)
  })

  test('a single sentence is too short to measure', () => {
    expect(roundStats(round(1))).toBeNull()
  })
})

test('edit distance counts a skipped letter once', () => {
  expect(lev('the cat', 'the cat')).toBe(0)
  expect(lev('the cat', 'th cat')).toBe(1)
  expect(lev('the cat', 'the bat')).toBe(1)
  expect(lev('the cat', '')).toBe(7)
})

describe('percentile', () => {
  const q = [...Array(101)].map((_, i) => i * 2) // 0, 2, ..., 200

  test('reads between the points', () => {
    expect(percentile(101, q)).toBeCloseTo(50.5, 9)
  })

  test('stays within 0 and 100', () => {
    expect(percentile(-5, q)).toBe(0)
    expect(percentile(500, q)).toBe(100)
  })

  test('takes the middle of tied typists', () => {
    // The lowest 4% all share the value 0.
    const tied = [0, 0, 0, 0, 0, ...q.slice(5)]
    expect(percentile(0, tied)).toBe(2)
  })
})

test('lower-is-better stats are turned round', () => {
  const s = roundStats(round(10))!
  const st = standing({ ...s, accuracy: 10 }, 10)
  expect(st.accuracy).toBe(0)
})

test('score is the geometric mean of speed, accuracy and steadiness', () => {
  const p = { speed: 80, accuracy: 20, steadiness: 50 }
  expect(score({ ...p, touch: 0, rollover: 0, wordstarts: 0 })).toBeCloseTo(
    Math.cbrt(80 * 20 * 50),
    9,
  )
})
