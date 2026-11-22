import { expect, test } from 'vitest'
import { bars, mistakes, noteFreq, pauseLimit, pct, timings } from './rhythm.ts'
import type { Sentence } from './stats.ts'

const k = (key: string, down: number, up: number) => ({ key, down, up })

test('percent is rounded down', () => {
  expect(pct(99.9)).toBe('99%')
  expect(pct(0.4)).toBe('0%')
  expect(pct(81)).toBe('81%')
})

test('counts Backspace presses and mistakes left in', () => {
  const s: Sentence = {
    target: 'the cat',
    typed: 'the bat',
    keys: [k('t', 0, 50), k('x', 100, 150), k('Backspace', 200, 250)],
  }
  expect(mistakes([s])).toEqual({ fixed: 1, left: 1 })
})

test('bars mark rollover, word starts and long pauses', () => {
  const s: Sentence = {
    target: 'a bc',
    typed: 'a bc',
    keys: [
      k('a', 1000, 1100),
      null, // another key, skipped
      k(' ', 1200, 1250),
      k('b', 1240, 1300), // pressed before space was let go
      k('c', 2400, 2450), // after a long gap
    ],
  }
  const b = bars(s, 900)
  expect(b.map((x) => x.key)).toEqual(['a', ' ', 'b', 'c'])
  expect(b.map((x) => x.start)).toEqual([0, 200, 240, 1400])
  expect(b.map((x) => x.roll)).toEqual([false, false, true, false])
  expect(b.map((x) => x.wordStart)).toEqual([false, false, true, false])
  expect(b.map((x) => x.pause)).toEqual([false, false, false, true])
})

test('a long pause is over 3 times the median gap', () => {
  const s: Sentence = {
    target: '',
    typed: '',
    keys: [
      k('a', 0, 1),
      k('b', 100, 101),
      k('c', 200, 201),
      k('d', 1000, 1001),
    ],
  }
  expect(pauseLimit([s])).toBe(300)
})

test('notes rise from the left of the keyboard to the right, on a five-note scale', () => {
  expect(noteFreq('q')).toBeCloseTo(261.63, 2) // middle C
  expect(noteFreq('w')).toBeCloseTo(293.66, 1) // D
  expect(noteFreq('y')).toBeCloseTo(523.25, 1) // C an octave up
  expect(noteFreq('p')).toBeGreaterThan(noteFreq('o')!)
  expect(noteFreq('a')).toBe(noteFreq('q')) // same column, same note
  expect(noteFreq('Backspace')).toBeNull()
})

test('timings lists every gap and hold in typing order, sentence by sentence', () => {
  const s = (keys: Sentence['keys']): Sentence => ({
    target: '',
    typed: '',
    keys,
  })
  expect(
    timings([
      s([k('a', 0, 80), k('b', 150, 240), null, k('c', 400, Infinity)]),
      s([k('d', 5000, 5090), k('e', 5200, 5260)]),
    ]),
  ).toEqual({ gaps: [150, 250, 200], holds: [80, 90, 90, 60] })
})
