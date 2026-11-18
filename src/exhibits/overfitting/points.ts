import type { Point } from './fit.ts'

/** Points live in a fixed grid, so resizing the window never moves them. */
export const WIDTH = 1000
export const HEIGHT = 600
export const MAX_POINTS = 60

const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v))
const inside = (p: Point): Point => ({
  x: clamp(p.x, WIDTH),
  y: clamp(p.y, HEIGHT),
})

export function addPoint(points: Point[], p: Point): Point[] {
  return points.length >= MAX_POINTS ? points : [...points, inside(p)]
}

export function removePoint(points: Point[], index: number): Point[] {
  return points.filter((_, i) => i !== index)
}

export function movePoint(points: Point[], index: number, p: Point): Point[] {
  return points.map((q, i) => (i === index ? inside(p) : q))
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

/**
 * 20 to 40 noisy points around a hidden shape. Everything is random each
 * time: the shape (a mix of waves, bumps and a slope), the point count,
 * their positions and how noisy they are.
 */
export function randomPoints(rand: () => number = Math.random): Point[] {
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
  return ts.map((t, i) => {
    // Box-Muller: normally distributed noise.
    const gauss =
      Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
    const y = HEIGHT * 0.8 - ((shape[i] - low) / span) * HEIGHT * 0.6
    return inside({
      x: margin + t * (WIDTH - 2 * margin),
      y: y + noise * gauss,
    })
  })
}
