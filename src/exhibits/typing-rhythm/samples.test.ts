import { expect, test } from 'vitest'
import { coarse, SAMPLES, simulate } from './samples.ts'
import { roundStats, standing } from './stats.ts'

const style = {
  gap: 170,
  jitter: 0.3,
  wordPause: 1.25,
  hold: 95,
  holdJitter: 0.22,
  slips: 0.02,
  fixes: 0.9,
}

test('a made-up round is the same every time and fully typed', () => {
  const a = simulate(3, style)
  expect(simulate(3, style)).toEqual(a)
  expect(a).toHaveLength(10)
  for (const s of a) expect(s.typed).toHaveLength(s.target.length)
})

test('the made-up typists live up to their names', () => {
  const st = (name: string) => {
    const s = SAMPLES.find((x) => x.name === name)!.sentences
    return standing(roundStats(s)!, 10)
  }
  const messy = st('Fast but messy')
  const steady = st('Slow and steady')
  expect(messy.speed).toBeGreaterThan(steady.speed)
  expect(messy.accuracy).toBeLessThan(steady.accuracy)
  expect(messy.steadiness).toBeLessThan(steady.steadiness)
})

test('spots key times rounded to a coarse grid', () => {
  const human = [
    0, 143.2, 251.7, 398.1, 466.9, 610.4, 702.3, 845.8, 990.1, 1101.6,
  ]
  expect(coarse(human)).toBe(false)
  expect(coarse(human.map((t) => Math.round(t / 16.667) * 16.667))).toBe(true)
  expect(coarse(human.map((t) => Math.round(t / 100) * 100))).toBe(true)
  expect(coarse(human.map(Math.round))).toBe(false) // 1 ms is fine
})
