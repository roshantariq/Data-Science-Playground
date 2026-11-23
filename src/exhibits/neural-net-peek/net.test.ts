import { describe, expect, it } from 'vitest'
import { COUNT, PATTERNS, randomPoints, TESTS } from './data.ts'
import {
  accuracy,
  createNet,
  epoch,
  gradients,
  loss,
  neuronMaps,
  predict,
  type Point,
} from './net.ts'

// A repeatable stand-in for Math.random.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

// Trains a fresh net on a pattern and returns its training accuracy.
function trained(
  id: (typeof PATTERNS)[number]['id'],
  hidden: number[],
  epochs: number,
  seed: number,
) {
  const rand = seeded(seed)
  const train = randomPoints(id, rand).filter((p) => !p.test)
  const net = createNet(hidden, rand)
  for (let e = 0; e < epochs; e++) epoch(net, train, undefined, rand)
  return { net, train, acc: accuracy(net, train) }
}

describe('randomPoints', () => {
  it('makes 200 points, 30% test, neither shape under a third, all on the map', () => {
    for (const { id } of PATTERNS) {
      for (let s = 1; s <= 10; s++) {
        const pts = randomPoints(id, seeded(s))
        expect(pts).toHaveLength(COUNT)
        expect(pts.filter((p) => p.test)).toHaveLength(TESTS)
        const circles = pts.filter((p) => p.kind === 0).length
        expect(circles).toBeGreaterThanOrEqual(COUNT / 3)
        expect(circles).toBeLessThanOrEqual((2 * COUNT) / 3)
        for (const p of pts) {
          expect(Math.abs(p.x)).toBeLessThan(1)
          expect(Math.abs(p.y)).toBeLessThan(1)
        }
      }
    }
  })

  it('differs from one load to the next', () => {
    expect(randomPoints('spirals')).not.toEqual(randomPoints('spirals'))
  })
})

describe('gradients', () => {
  it('match the slope of the loss measured by nudging each weight', () => {
    const rand = seeded(7)
    const net = createNet([3, 2], rand)
    const batch: Point[] = Array.from({ length: 6 }, (_, i) => ({
      x: rand() * 2 - 1,
      y: rand() * 2 - 1,
      kind: (i % 2) as 0 | 1,
      test: false,
    }))
    const { dw, db } = gradients(net, batch)
    const h = 1e-5
    const slope = (get: () => number, set: (v: number) => void) => {
      const v = get()
      set(v + h)
      const up = loss(net, batch)
      set(v - h)
      const down = loss(net, batch)
      set(v)
      return (up - down) / (2 * h)
    }
    net.w.forEach((wl, l) =>
      wl.forEach((row, j) => {
        row.forEach((_, i) =>
          expect(dw[l][j][i]).toBeCloseTo(
            slope(
              () => row[i],
              (v) => (row[i] = v),
            ),
            6,
          ),
        )
        expect(db[l][j]).toBeCloseTo(
          slope(
            () => net.b[l][j],
            (v) => (net.b[l][j] = v),
          ),
          6,
        )
      }),
    )
  })
})

describe('training', () => {
  it('lowers the loss', () => {
    const rand = seeded(3)
    const train = randomPoints('circle', rand).filter((p) => !p.test)
    const net = createNet([4], rand)
    const before = loss(net, train)
    for (let e = 0; e < 50; e++) epoch(net, train, undefined, rand)
    expect(loss(net, train)).toBeLessThan(before * 0.75)
  })

  it('separates the blobs with a single neuron', () => {
    for (const s of [1, 2, 3]) {
      expect(trained('blobs', [1], 30, s).acc).toBeGreaterThanOrEqual(0.85)
    }
  })

  it('needs two layers for the spirals: 8 + 8 learns them, 2 neurons cannot', () => {
    for (const s of [1, 2, 3]) {
      expect(trained('spirals', [8, 8], 1000, s).acc).toBeGreaterThanOrEqual(
        0.9,
      )
      expect(trained('spirals', [2], 1000, s).acc).toBeLessThan(0.85)
    }
  })
})

describe('neuronMaps', () => {
  it('gives one map per neuron, in range, with the output matching predict', () => {
    const net = createNet([8, 8], seeded(5))
    const n = 20
    const maps = neuronMaps(net, n)
    expect(maps).toHaveLength(17)
    for (const m of maps.slice(0, -1)) {
      expect(m).toHaveLength(n * n)
      for (const v of m) expect(Math.abs(v)).toBeLessThanOrEqual(1)
    }
    // Row 0, column 0 is the top-left cell.
    const out = maps.at(-1)!
    expect(out[0]).toBeCloseTo(predict(net, -1 + 1 / n, 1 - 1 / n), 6)
    expect(out[n * n - 1]).toBeCloseTo(predict(net, 1 - 1 / n, -1 + 1 / n), 6)
  })
})
