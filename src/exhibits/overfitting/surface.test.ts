import { describe, expect, test } from 'vitest'
import { fitPolynomial, rmse, type Point } from './fit.ts'
import { fitSurface, isFitSurface } from './surface.ts'

const points: Point[] = Array.from({ length: 16 }, (_, i) => ({
  x: i * 60 + (i % 3) * 7,
  y: 300 + 120 * Math.sin(i / 2) + ((i * 37) % 23),
}))

describe('fitSurface', () => {
  test('matches the real training error when the two numbers move', () => {
    for (const degree of [1, 4, 9]) {
      const s = fitSurface(points, degree)
      const best = fitPolynomial(points, degree)
      const xs = points.map((p) => p.x)
      const min = Math.min(...xs)
      const half = (Math.max(...xs) - min) / 2
      const [i, j] = s.powers
      const [u, v] = [3, -2]
      const moved = (x: number) => {
        const t = (x - min) / half - 1
        return best(x) + u * t ** i + v * t ** j
      }
      const rise = rmse(points, moved) ** 2 - rmse(points, best) ** 2
      expect(rise).toBeCloseTo(s.a * u * u + 2 * s.b * u * v + s.c * v * v, 4)
    }
  })

  test('the valley gets longer and flatter as the degree rises', () => {
    const stretch = (d: number) => {
      const { a, b, c } = fitSurface(points, d)
      const mid = (a + c) / 2
      const r = Math.hypot((a - c) / 2, b)
      return (mid + r) / (mid - r)
    }
    expect(fitSurface(points, 1).powers).toEqual([0, 1])
    expect(fitSurface(points, 10).powers).toEqual([8, 10])
    expect(stretch(10)).toBeGreaterThan(10 * stretch(1))
  })

  test('checks handed-over data', () => {
    expect(isFitSurface(fitSurface(points, 3))).toBe(true)
    expect(isFitSurface(null)).toBe(false)
    expect(isFitSurface({ degree: 3, powers: [1, 3], a: 1, b: 0 })).toBe(false)
    expect(
      isFitSurface({ degree: 3, powers: [1, 3], a: 1, b: 0, c: NaN }),
    ).toBe(false)
  })
})
