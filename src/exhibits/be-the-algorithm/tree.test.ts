import { describe, expect, it } from 'vitest'
import { COUNT, PATTERNS, randomDots, TESTS } from './data.ts'
import {
  accuracy,
  bestSplit,
  grow,
  label,
  leaves,
  MAP,
  predict,
  splitCount,
  splitLeaf,
  type Dot,
  type Tree,
} from './tree.ts'

// A repeatable stand-in for Math.random.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

const dot = (x: number, y: number, kind: 0 | 1): Dot => ({
  x,
  y,
  kind,
  test: false,
})

describe('randomDots', () => {
  it('makes 90 points, 30% test, neither shape under a third, all on the map', () => {
    for (const { id } of PATTERNS) {
      for (let s = 1; s <= 10; s++) {
        const dots = randomDots(id, seeded(s))
        expect(dots).toHaveLength(COUNT)
        expect(dots.filter((d) => d.test)).toHaveLength(TESTS)
        const circles = dots.filter((d) => d.kind === 0).length
        expect(circles).toBeGreaterThanOrEqual(COUNT / 3)
        expect(circles).toBeLessThanOrEqual((2 * COUNT) / 3)
        for (const d of dots) {
          expect(d.x).toBeGreaterThan(0)
          expect(d.x).toBeLessThan(10)
          expect(d.y).toBeGreaterThan(0)
          expect(d.y).toBeLessThan(6)
        }
      }
    }
  })
})

describe('splits', () => {
  it('names boxes by path and counts splits', () => {
    let t: Tree = { box: MAP }
    t = splitLeaf(t, '', 'x', 4)
    t = splitLeaf(t, '1', 'y', 3)
    expect(splitCount(t)).toBe(2)
    expect(leaves(t).map((l) => l.path)).toEqual(['0', '10', '11'])
    expect(leaves(t)[2].box).toEqual({ x0: 4, x1: 10, y0: 3, y1: 6 })
  })

  it('guesses the most common shape in each box, and the one above when empty or tied', () => {
    const train = [dot(1, 1, 0), dot(2, 1, 0), dot(8, 1, 1), dot(9, 5, 0)]
    let t: Tree = { box: MAP }
    t = splitLeaf(t, '', 'x', 5)
    expect(predict(t, train, dot(1.5, 3, 1))).toBe(0)
    // The right side holds one of each: a tie keeps the top's guess (circles).
    expect(predict(t, train, dot(7, 3, 1))).toBe(0)
    t = splitLeaf(t, '1', 'y', 3)
    expect(predict(t, train, dot(7, 1, 0))).toBe(1)
    expect(accuracy(t, train, train)).toBe(1)
    const l = label(t, train)
    expect(l.counts).toEqual([3, 1])
    expect(l.split!.high.split!.low.counts).toEqual([0, 1])
  })
})

describe('the real tree', () => {
  it('finds the cut that separates two shapes cleanly', () => {
    const train = [
      dot(1, 1, 0),
      dot(2, 4, 0),
      dot(3, 2, 0),
      dot(6, 1, 1),
      dot(8, 5, 1),
    ]
    const b = bestSplit(train)!
    expect(b.axis).toBe('x')
    expect(b.at).toBe(4.5)
  })

  it('never uses more splits than its budget and stops when nothing helps', () => {
    const dots = randomDots('blobs', seeded(3)).filter((d) => !d.test)
    for (const n of [1, 3, 5, 8])
      expect(splitCount(grow(dots, n))).toBeLessThanOrEqual(n)
    expect(splitCount(grow([dot(1, 1, 0), dot(5, 5, 0)], 5))).toBe(0)
  })

  it('does better on training points with more splits', () => {
    for (let s = 1; s <= 10; s++) {
      const train = randomDots('ring', seeded(s)).filter((d) => !d.test)
      const few = accuracy(grow(train, 1), train, train)
      const many = accuracy(grow(train, 8), train, train)
      expect(many).toBeGreaterThanOrEqual(few)
    }
  })
})
