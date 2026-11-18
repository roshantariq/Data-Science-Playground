import { describe, expect, test } from 'vitest'
import { chartScale, errorCurve } from './errors.ts'
import { randomPoints } from './points.ts'

function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

describe('errorCurve', () => {
  test('one row per degree up to the cap', () => {
    const rows = errorCurve(randomPoints(seeded(4)), 12)
    expect(rows.map((r) => r.degree)).toEqual(
      [...Array(12)].map((_, i) => i + 1),
    )
  })

  test('training error never rises as the degree rises', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const rows = errorCurve(randomPoints(seeded(seed)), 12)
      rows.slice(1).forEach((r, i) => {
        expect(r.train).toBeLessThanOrEqual(rows[i].train + 1e-6)
      })
    }
  })

  test('test error comes from points the fit never saw', () => {
    const points = [
      { x: 0, y: 0, test: false },
      { x: 10, y: 10, test: false },
      { x: 20, y: 20, test: false },
      { x: 30, y: 60, test: true }, // a straight line predicts 30 here
    ]
    const [row] = errorCurve(points, 1)
    expect(row.train).toBeCloseTo(0, 9)
    expect(row.test).toBeCloseTo(30, 9)
  })

  test('no test points means no test error', () => {
    const points = [
      { x: 0, y: 1, test: false },
      { x: 5, y: 3, test: false },
    ]
    expect(errorCurve(points, 1)[0].test).toBeNull()
  })

  test('no rows when the cap is below 1', () => {
    expect(errorCurve([{ x: 0, y: 0, test: false }], 0)).toEqual([])
  })
})

describe('chartScale', () => {
  const rows = [
    { degree: 1, train: 40, test: 50 },
    { degree: 2, train: 20, test: 30 },
    { degree: 3, train: 10, test: 5000 },
  ]

  test('normal scale tops out at 1.5x the degree-1 error and flags overflow', () => {
    const scale = chartScale(rows, false)
    expect(scale.offChart).toBe(true)
    expect(scale.y(0)).toBe(1) // bottom of the chart
    expect(scale.y(75)).toBeCloseTo(0, 9) // 1.5 * 50 = top
    expect(scale.y(5000)).toBe(0) // capped at the top
  })

  test('log scale fits every value, so nothing is off the chart', () => {
    const scale = chartScale(rows, true)
    expect(scale.offChart).toBe(false)
    for (const v of [5, 10, 5000]) {
      expect(scale.y(v)).toBeGreaterThanOrEqual(0)
      expect(scale.y(v)).toBeLessThanOrEqual(1)
    }
    expect(scale.y(5000)).toBeLessThan(scale.y(10)) // higher error, higher up
  })

  test('log scale survives a training error of exactly zero', () => {
    const scale = chartScale([{ degree: 1, train: 0, test: 3 }], true)
    expect(Number.isFinite(scale.y(0))).toBe(true)
  })
})
