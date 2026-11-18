import { describe, expect, test } from 'vitest'
import {
  addPoint,
  HEIGHT,
  MAX_POINTS,
  movePoint,
  pointAt,
  randomPoints,
  removePoint,
  WIDTH,
} from './points.ts'

function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

const inside = (p: { x: number; y: number }) =>
  p.x >= 0 && p.x <= WIDTH && p.y >= 0 && p.y <= HEIGHT

describe('editing points', () => {
  test('adds a point, keeping it inside the area', () => {
    expect(addPoint([], { x: 10, y: 20 })).toEqual([{ x: 10, y: 20 }])
    expect(addPoint([], { x: -5, y: 9999 })).toEqual([{ x: 0, y: HEIGHT }])
  })

  test('refuses to add beyond the limit', () => {
    const full = Array.from({ length: MAX_POINTS }, (_, i) => ({ x: i, y: 1 }))
    expect(addPoint(full, { x: 500, y: 300 })).toBe(full)
  })

  test('removes and moves a point', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]
    expect(removePoint(points, 0)).toEqual([{ x: 2, y: 2 }])
    expect(movePoint(points, 1, { x: 5000, y: 50 })).toEqual([
      { x: 1, y: 1 },
      { x: WIDTH, y: 50 },
    ])
  })

  test('finds the nearest point within the radius', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 110, y: 100 },
    ]
    expect(pointAt(points, { x: 108, y: 101 }, 20)).toBe(1)
    expect(pointAt(points, { x: 300, y: 300 }, 20)).toBe(-1)
  })
})

describe('randomPoints', () => {
  test('makes 20 to 40 points inside the area', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const points = randomPoints(seeded(seed))
      expect(points.length).toBeGreaterThanOrEqual(20)
      expect(points.length).toBeLessThanOrEqual(40)
      expect(points.every(inside)).toBe(true)
    }
  })

  test('stays inside the area at the extremes of the random source', () => {
    expect(randomPoints(() => 0).every(inside)).toBe(true)
    expect(randomPoints(() => 0.999999).every(inside)).toBe(true)
  })

  test('gives a different pattern each time', () => {
    const a = randomPoints(seeded(1))
    const b = randomPoints(seeded(2))
    expect(a).not.toEqual(b)
  })
})
