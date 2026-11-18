import type { Point } from './fit.ts'

/** Points live in a fixed grid, so resizing the window never moves them. */
export const WIDTH = 1000
export const HEIGHT = 600
export const MAX_POINTS = 60
const TEST_SHARE = 0.3

/** A point plus its group: test points are hidden from the fit. */
export type Sample = Point & { test: boolean }

const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v))
const inside = (p: Point): Point => ({
  x: clamp(p.x, WIDTH),
  y: clamp(p.y, HEIGHT),
})
/** Test points for n points: 30%, rounded down so training fills first. */
const testTarget = (n: number) => Math.floor(n * TEST_SHARE)

/** Adds a point to whichever group keeps the mix closest to 70/30. */
export function addPoint(points: Sample[], p: Point): Sample[] {
  if (points.length >= MAX_POINTS) return points
  const tests = points.filter((q) => q.test).length
  const test = tests < testTarget(points.length + 1)
  return [...points, { ...inside(p), test }]
}

export function removePoint(points: Sample[], index: number): Sample[] {
  return points.filter((_, i) => i !== index)
}

/** Moving never changes a point's group, so colours don't flicker. */
export function movePoint(points: Sample[], index: number, p: Point): Sample[] {
  return points.map((q, i) =>
    i === index ? { ...inside(p), test: q.test } : q,
  )
}

/** Reshuffles which points are test points, keeping the 30% mix. */
export function newSplit(
  points: Point[],
  rand: () => number = Math.random,
): Sample[] {
  const order = points.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const test = new Set(order.slice(0, testTarget(points.length)))
  return points.map(({ x, y }, i) => ({ x, y, test: test.has(i) }))
}

/** Index of the nearest point within radius, or -1. */
export function pointAt(points: Point[], p: Point, radius: number): number {
  let best = -1
  let bestDistance = radius
  points.forEach((q, i) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    if (d <= bestDistance) [best, bestDistance] = [i, d]
  })
  return best
}

/** Samples a curve across the full width for drawing; runaway values are capped. */
export function curvePoints(
  predict: (x: number) => number,
  samples = 200,
): Point[] {
  return Array.from({ length: samples }, (_, i) => {
    const x = (i / (samples - 1)) * WIDTH
    return { x, y: Math.min(2 * HEIGHT, Math.max(-HEIGHT, predict(x))) }
  })
}

/**
 * 20 to 40 noisy points around a hidden shape. Everything is random each
 * time: the shape (a mix of waves, bumps and a slope), the point count,
 * their positions and how noisy they are.
 */
export function randomPoints(rand: () => number = Math.random): Sample[] {
  const between = (a: number, b: number) => a + rand() * (b - a)
  const parts: ((t: number) => number)[] = [(t) => between(-1, 1) * t]
  const extra = 1 + Math.floor(rand() * 3)
  for (let k = 0; k < extra; k++) {
    const size = between(0.5, 1.5)
    if (rand() < 0.5) {
      const cycles = between(0.5, 2.5)
      const phase = between(0, 2 * Math.PI)
      parts.push((t) => size * Math.sin(2 * Math.PI * cycles * t + phase))
    } else {
      const centre = between(0, 1)
      const width = between(0.08, 0.3)
      const sign = rand() < 0.5 ? -1 : 1
      parts.push((t) => sign * size * Math.exp(-(((t - centre) / width) ** 2)))
    }
  }
  const count = 20 + Math.floor(rand() * 21)
  const ts = Array.from({ length: count }, () => rand())
  const shape = ts.map((t) => parts.reduce((sum, f) => sum + f(t), 0))
  const low = Math.min(...shape)
  const span = Math.max(...shape) - low || 1
  const noise = between(0.03, 0.12) * HEIGHT
  const margin = 40
  const points = ts.map((t, i) => {
    // Box-Muller: normally distributed noise.
    const gauss =
      Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
    const y = HEIGHT * 0.8 - ((shape[i] - low) / span) * HEIGHT * 0.6
    return inside({
      x: margin + t * (WIDTH - 2 * margin),
      y: y + noise * gauss,
    })
  })
  return newSplit(points, rand)
}
