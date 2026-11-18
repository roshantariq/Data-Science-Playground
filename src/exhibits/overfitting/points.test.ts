import { describe, expect, test } from 'vitest'
import {
  addPoint,
  curvePoints,
  HEIGHT,
  MAX_POINTS,
  movePoint,
  newSplit,
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

const testCount = (points: { test: boolean }[]) =>
  points.filter((p) => p.test).length

describe('editing points', () => {
  test('adds a point, keeping it inside the area', () => {
    expect(addPoint([], { x: 10, y: 20 })).toEqual([
      { x: 10, y: 20, test: false },
    ])
    expect(addPoint([], { x: -5, y: 9999 })).toEqual([
      { x: 0, y: HEIGHT, test: false },
    ])
  })

  test('refuses to add beyond the limit', () => {
    const full = Array.from({ length: MAX_POINTS }, (_, i) => ({
      x: i,
      y: 1,
      test: false,
    }))
    expect(addPoint(full, { x: 500, y: 300 })).toBe(full)
  })

  test('removes and moves a point, keeping its group', () => {
    const points = [
      { x: 1, y: 1, test: false },
      { x: 2, y: 2, test: true },
    ]
    expect(removePoint(points, 0)).toEqual([{ x: 2, y: 2, test: true }])
    expect(movePoint(points, 1, { x: 5000, y: 50 })).toEqual([
      { x: 1, y: 1, test: false },
      { x: WIDTH, y: 50, test: true },
    ])
  })
})

describe('train/test split', () => {
  test('added points keep the mix at 30% test, rounding towards training', () => {
    let points: ReturnType<typeof addPoint> = []
    const counts = []
    for (let i = 0; i < 10; i++) {
      points = addPoint(points, { x: i * 10, y: 0 })
      counts.push(testCount(points))
    }
    // 1-3 points: all training, so a curve can be drawn first.
    expect(counts).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2, 3])
  })

  test('random data is split exactly 30% test (rounded down)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const points = randomPoints(seeded(seed))
      expect(testCount(points)).toBe(Math.floor(points.length * 0.3))
    }
  })

  test('a new split keeps the points and the 30% mix, but reshuffles', () => {
    const points = randomPoints(seeded(3))
    const again = newSplit(points, seeded(9))
    expect(again.map(({ x, y }) => ({ x, y }))).toEqual(
      points.map(({ x, y }) => ({ x, y })),
    )
    expect(testCount(again)).toBe(testCount(points))
    expect(again.map((p) => p.test)).not.toEqual(points.map((p) => p.test))
  })
})

describe('finding points', () => {
  test('finds the nearest point within the radius', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 110, y: 100 },
    ]
    expect(pointAt(points, { x: 108, y: 101 }, 20)).toBe(1)
    expect(pointAt(points, { x: 300, y: 300 }, 20)).toBe(-1)
  })
})

describe('curvePoints', () => {
  test('samples the curve across the full width', () => {
    const line = curvePoints((x) => x / 2, 11)
    expect(line).toHaveLength(11)
    expect(line[0]).toEqual({ x: 0, y: 0 })
    expect(line[10]).toEqual({ x: WIDTH, y: WIDTH / 2 })
  })

  test('keeps runaway values near the area so the drawing stays sane', () => {
    const line = curvePoints((x) => (x - 500) ** 9, 21)
    expect(line.every((p) => p.y >= -HEIGHT && p.y <= 2 * HEIGHT)).toBe(true)
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
