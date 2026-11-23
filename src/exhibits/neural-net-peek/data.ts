// Random points of two shapes in one of four patterns, new on every load,
// on a square map from -1 to 1 each way. 30% are held back as test points.
import type { Kind, Point } from './net.ts'

export const PATTERNS = [
  { id: 'spirals', name: 'Two spirals' },
  { id: 'circle', name: 'Circle' },
  { id: 'checker', name: 'Checkerboard' },
  { id: 'blobs', name: 'Blobs' },
] as const

export type PatternId = (typeof PATTERNS)[number]['id']

export const COUNT = 200
export const TESTS = Math.floor(COUNT * 0.3)
const FLIP = 0.05 // share of points on the "wrong" side, as noise
const EDGE = 0.95

type Rand = () => number

const within = (v: number) => Math.min(EDGE, Math.max(-EDGE, v))

// A normal draw (Box–Muller).
const normal = (rand: Rand) =>
  Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())

function layout(id: PatternId, rand: Rand): Omit<Point, 'test'>[] {
  const out: Omit<Point, 'test'>[] = []
  if (id === 'spirals' || id === 'blobs') {
    const turn = rand() * Math.PI * 2
    // Blobs: two clouds about one unit apart, overlapping a little.
    const c = [0, 1].map((k) => ({
      x: Math.cos(turn + k * Math.PI) * (0.4 + rand() * 0.15),
      y: Math.sin(turn + k * Math.PI) * (0.4 + rand() * 0.15),
    }))
    for (let i = 0; i < COUNT; i++) {
      const kind = (i % 2) as Kind
      if (id === 'blobs') {
        out.push({
          x: within(c[kind].x + normal(rand) * 0.3),
          y: within(c[kind].y + normal(rand) * 0.3),
          kind,
        })
        continue
      }
      // Spirals: one and a half turns each, the second half a turn behind.
      const t = rand()
      const a = turn + kind * Math.PI + t * 3 * Math.PI
      const r = 0.08 + t * 0.82
      out.push({
        x: within(Math.cos(a) * r + normal(rand) * 0.04),
        y: within(Math.sin(a) * r + normal(rand) * 0.04),
        kind,
      })
    }
    return out
  }
  // Circle and Checkerboard: points anywhere, sorted by a hidden rule.
  const cx = (rand() - 0.5) * 0.5
  const cy = (rand() - 0.5) * 0.5
  const r = 0.45 + rand() * 0.15
  const rule = (x: number, y: number): Kind =>
    id === 'circle'
      ? Math.hypot(x - cx, y - cy) < r
        ? 0
        : 1
      : x < cx !== y < cy
        ? 1
        : 0
  for (let i = 0; i < COUNT; i++) {
    const x = (rand() * 2 - 1) * EDGE
    const y = (rand() * 2 - 1) * EDGE
    const k = rule(x, y)
    out.push({ x, y, kind: rand() < FLIP ? ((1 - k) as Kind) : k })
  }
  return out
}

// Points for a pattern, redrawn until neither shape has under a third of
// them, with a random 30% marked as test points.
export function randomPoints(id: PatternId, rand: Rand = Math.random): Point[] {
  const balanced = (ps: { kind: Kind }[]) => {
    const a = ps.filter((p) => p.kind === 0).length
    return a >= COUNT / 3 && a <= (2 * COUNT) / 3
  }
  let pts = layout(id, rand)
  while (!balanced(pts)) pts = layout(id, rand)
  // Shuffle (Fisher–Yates) and hold back the first 30%.
  const order = pts.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const test = new Set(order.slice(0, TESTS))
  return pts.map((p, i) => ({ ...p, test: test.has(i) }))
}
