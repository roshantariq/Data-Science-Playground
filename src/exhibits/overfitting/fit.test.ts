import { describe, expect, test } from 'vitest'
import { fitPolynomial, maxDegree, rmse, type Point } from './fit.ts'

// Deterministic noise so tests never flake.
function noisy(n: number): Point[] {
  let seed = 7
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: n }, (_, i) => {
    const x = 40 + i * 35 // canvas-like pixel coordinates
    return { x, y: 300 + 120 * Math.sin(x / 90) + (rand() - 0.5) * 80 }
  })
}

describe('fitPolynomial', () => {
  test('recovers a straight line', () => {
    const points = [100, 140, 175, 230, 300].map((x) => ({ x, y: 2 * x + 1 }))
    const predict = fitPolynomial(points, 1)
    expect(predict(500)).toBeCloseTo(1001, 6)
  })

  test('recovers a parabola', () => {
    const points = [-3, -1, 0, 2, 5, 6].map((x) => ({
      x,
      y: x * x - 4 * x + 3,
    }))
    const predict = fitPolynomial(points, 2)
    expect(predict(4)).toBeCloseTo(3, 6)
  })

  test('degree 20 through 21 points passes through every point', () => {
    const points = noisy(21)
    const predict = fitPolynomial(points, 20)
    for (const p of points) expect(predict(p.x)).toBeCloseTo(p.y, 4)
  })

  test('training error never rises as the degree rises', () => {
    const points = noisy(30)
    let previous = Infinity
    for (let d = 1; d <= maxDegree(points); d++) {
      const error = rmse(points, fitPolynomial(points, d))
      expect(Number.isFinite(error)).toBe(true)
      expect(error).toBeLessThanOrEqual(previous + 1e-6)
      previous = error
    }
  })

  test('rejects a degree the points cannot support', () => {
    const points = noisy(5)
    expect(() => fitPolynomial(points, 5)).toThrow(RangeError)
    expect(() => fitPolynomial(points, 0)).toThrow(RangeError)
    expect(() => fitPolynomial(points, 2.5)).toThrow(RangeError)
  })
})

describe('maxDegree', () => {
  test('is one less than the number of distinct x values, capped at 20', () => {
    expect(maxDegree(noisy(8))).toBe(7)
    expect(maxDegree(noisy(30))).toBe(20)
    expect(maxDegree([{ x: 1, y: 1 }])).toBe(0)
    expect(
      maxDegree([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
      ]),
    ).toBe(1)
  })
})

describe('rmse', () => {
  test('is the root mean square of the errors', () => {
    const points = [
      { x: 0, y: 3 },
      { x: 1, y: 4 },
    ]
    expect(rmse(points, () => 0)).toBeCloseTo(Math.sqrt((9 + 16) / 2), 12)
  })
})
