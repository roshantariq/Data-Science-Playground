// Random points of two shapes laid out in one of four patterns, new on
// every load. 30% are held back as test points.
import { H, W, type Dot, type Kind } from './tree.ts'

export const PATTERNS = [
  { id: 'blobs', name: 'Blobs' },
  { id: 'diagonal', name: 'Diagonal' },
  { id: 'ring', name: 'Ring' },
  { id: 'checker', name: 'Checkerboard' },
] as const

export type PatternId = (typeof PATTERNS)[number]['id']

export const COUNT = 90
export const TESTS = Math.floor(COUNT * 0.3)
const FLIP = 0.07 // share of points that land on the "wrong" side, as noise
const EDGE = 0.2

type Rand = () => number

const within = (v: number, max: number) =>
  Math.min(max - EDGE, Math.max(EDGE, v))

// A normal draw (Box–Muller).
const normal = (rand: Rand) =>
  Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())

function layout(
  id: PatternId,
  rand: Rand,
): { x: number; y: number; kind: Kind }[] {
  const anywhere = () => ({
    x: EDGE + rand() * (W - 2 * EDGE),
    y: EDGE + rand() * (H - 2 * EDGE),
  })
  const flip = (k: Kind): Kind => (rand() < FLIP ? ((1 - k) as Kind) : k)
  const out: { x: number; y: number; kind: Kind }[] = []
  if (id === 'blobs') {
    // Two clouds that overlap a little; the overlap is the noise.
    let c0, c1
    do {
      c0 = { x: 2 + rand() * 6, y: 1.5 + rand() * 3 }
      c1 = { x: 2 + rand() * 6, y: 1.5 + rand() * 3 }
    } while (Math.abs(Math.hypot(c0.x - c1.x, c0.y - c1.y) - 3) > 0.4)
    for (let i = 0; i < COUNT; i++) {
      const kind = (i % 2) as Kind
      const c = kind ? c1 : c0
      out.push({
        x: within(c.x + normal(rand) * 1.3, W),
        y: within(c.y + normal(rand) * 1.1, H),
        kind,
      })
    }
    return out
  }
  // The other three: points anywhere, sorted by a hidden rule.
  let rule: (x: number, y: number) => Kind
  if (id === 'diagonal') {
    const slope = (0.3 + rand() * 0.6) * (rand() < 0.5 ? -1 : 1)
    const cy = 2.4 + rand() * 1.2
    rule = (x, y) => (y > cy + slope * (x - W / 2) ? 1 : 0)
  } else if (id === 'ring') {
    const cx = 4 + rand() * 2
    const cy = 2.6 + rand() * 0.8
    const r = 1.7 + rand() * 0.4
    rule = (x, y) => (Math.hypot(x - cx, y - cy) < r ? 0 : 1)
  } else {
    const cx = 3.5 + rand() * 3
    const cy = 2.2 + rand() * 1.6
    rule = (x, y) => (x < cx !== y < cy ? 1 : 0)
  }
  for (let i = 0; i < COUNT; i++) {
    const p = anywhere()
    out.push({ ...p, kind: flip(rule(p.x, p.y)) })
  }
  return out
}

// Points for a pattern, redrawn until neither shape has under a third of
// them, with a random 30% marked as test points.
export function randomDots(id: PatternId, rand: Rand = Math.random): Dot[] {
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
