// The Ski Slope's maths: four landscapes (plus one made from a fitted curve
// in the Overfitting Playground), and the ball rolling down them by
// gradient descent with momentum. Plain TypeScript, no React or Three.js,
// so it can be tested. The landscape covers x and y from -1 to 1, and its
// height is scaled to run from 0 (lowest point) to 1 (highest).

import type { FitSurface } from '../overfitting/surface.ts'

export type Rand = () => number
export type LandscapeId = 'bowl' | 'valley' | 'two-valleys' | 'bumpy' | 'fit'

export const LANDSCAPES: { id: Exclude<LandscapeId, 'fit'>; name: string }[] = [
  { id: 'bowl', name: 'Bowl' },
  { id: 'valley', name: 'Narrow valley' },
  { id: 'two-valleys', name: 'Two valleys' },
  { id: 'bumpy', name: 'Bumpy' },
]

export type Landscape = {
  id: LandscapeId
  height: (x: number, y: number) => number
  lowest: { x: number; y: number } // the lowest point on a fine grid
  // How sharply the floor curves at the lowest point (the steepest way).
  // Steps are divided by it, so a learning rate of 1 means the same on
  // every landscape: about the fastest safe pace, with bouncing near 2.
  sharpness: number
}

type Fn = (x: number, y: number) => number

const between = (rand: Rand, a: number, b: number) => a + rand() * (b - a)

// Each shape keeps its character; the details move at random on every load.
function shape(id: LandscapeId, rand: Rand): Fn {
  if (id === 'bowl') {
    const cx = between(rand, -0.3, 0.3)
    const cy = between(rand, -0.3, 0.3)
    const a = between(rand, 0.8, 1.3)
    const b = between(rand, 0.8, 1.3)
    return (x, y) => a * (x - cx) ** 2 + b * (y - cy) ** 2
  }
  if (id === 'valley') {
    // Steep walls, a gentle floor, turned to a random angle.
    const t = rand() * Math.PI
    const c = Math.cos(t)
    const s = Math.sin(t)
    const along = between(rand, -0.3, 0.3)
    const across = between(rand, -0.2, 0.2)
    return (x, y) => {
      const u = c * x + s * y - along
      const w = -s * x + c * y - across
      return 0.12 * u * u + 3 * w * w
    }
  }
  if (id === 'two-valleys') {
    // A deep dip and a shallow one on opposite sides of the middle.
    const t = rand() * Math.PI * 2
    const r = between(rand, 0.45, 0.6)
    const deep = { x: Math.cos(t) * r, y: Math.sin(t) * r }
    const shallow = { x: -deep.x, y: -deep.y }
    const depth = between(rand, 0.45, 0.6)
    const wide = between(rand, 0.1, 0.14)
    const dip = (x: number, y: number, p: { x: number; y: number }) =>
      Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / wide)
    return (x, y) =>
      0.3 * (x * x + y * y) - dip(x, y, deep) - depth * dip(x, y, shallow)
  }
  // Bumpy: a wide bowl covered in small dips.
  const cx = between(rand, -0.25, 0.25)
  const cy = between(rand, -0.25, 0.25)
  const waves = [0, 1, 2].map(() => ({
    fx: between(rand, 6, 9),
    fy: between(rand, 6, 9),
    px: rand() * Math.PI * 2,
    py: rand() * Math.PI * 2,
  }))
  return (x, y) =>
    0.6 * ((x - cx) ** 2 + (y - cy) ** 2) +
    0.05 *
      waves.reduce(
        (sum, w) => sum + Math.sin(w.fx * x + w.px) * Math.sin(w.fy * y + w.py),
        0,
      )
}

const GRID = 120

export function landscape(
  id: Exclude<LandscapeId, 'fit'>,
  rand: Rand = Math.random,
): Landscape {
  return scaled(id, shape(id, rand))
}

// A fitted curve's training error over two of its numbers (see
// overfitting/surface.ts), centred on the best fit.
export function fitLandscape(s: FitSurface): Landscape {
  return {
    ...scaled('fit', (x, y) => s.a * x * x + 2 * s.b * x * y + s.c * y * y),
    lowest: { x: 0, y: 0 },
  }
}

// Heights scaled to run from 0 to 1 over the map.
function scaled(id: LandscapeId, f: Fn): Landscape {
  let min = Infinity
  let max = -Infinity
  let lowest = { x: 0, y: 0 }
  for (let i = 0; i <= GRID; i++) {
    for (let j = 0; j <= GRID; j++) {
      const x = -1 + (2 * i) / GRID
      const y = -1 + (2 * j) / GRID
      const z = f(x, y)
      if (z < min) {
        min = z
        lowest = { x, y }
      }
      if (z > max) max = z
    }
  }
  const span = max - min
  const height = (x: number, y: number) => (f(x, y) - min) / span
  return { id, height, lowest, sharpness: sharpness(height, lowest) }
}

// The largest curvature at a point, from second differences.
function sharpness(height: Fn, p: { x: number; y: number }) {
  const h = 1e-3
  const z = height(p.x, p.y)
  const xx = (height(p.x + h, p.y) - 2 * z + height(p.x - h, p.y)) / h ** 2
  const yy = (height(p.x, p.y + h) - 2 * z + height(p.x, p.y - h)) / h ** 2
  const xy =
    (height(p.x + h, p.y + h) -
      height(p.x + h, p.y - h) -
      height(p.x - h, p.y + h) +
      height(p.x - h, p.y - h)) /
    (4 * h * h)
  const mid = (xx + yy) / 2
  return Math.max(mid + Math.sqrt(((xx - yy) / 2) ** 2 + xy * xy), 1e-6)
}

// The slope under the ball, by a small step either side.
export function gradient(land: Landscape, x: number, y: number) {
  const h = 1e-4
  return {
    x: (land.height(x + h, y) - land.height(x - h, y)) / (2 * h),
    y: (land.height(x, y + h) - land.height(x, y - h)) / (2 * h),
  }
}

export type Step = { x: number; y: number; z: number }

// How a roll ended: at the lowest point, settled in a dip that isn't the
// lowest, stopped on a flat valley floor short of the lowest point (only on
// "Your fit"), bouncing from wall to wall, or still rolling when time ran out.
export type Outcome = 'lowest' | 'stuck' | 'floor' | 'bouncing' | 'slow'

export type Roll = { steps: Step[]; outcome: Outcome }

export const MAX_STEPS = 300
const clamp = (v: number) => Math.max(-1, Math.min(1, v))

// Gradient descent with momentum: each step the ball's velocity keeps
// `momentum` of what it had and adds `rate` times the downhill slope. The
// edge of the map is a wall: the ball stops against it in that direction.
export function roll(
  land: Landscape,
  start: { x: number; y: number },
  rate: number,
  momentum: number,
): Roll {
  let x = clamp(start.x)
  let y = clamp(start.y)
  let vx = 0
  let vy = 0
  const steps: Step[] = [{ x, y, z: land.height(x, y) }]
  let settled = false
  for (let i = 0; i < MAX_STEPS && !settled; i++) {
    const g = gradient(land, x, y)
    const step = rate / land.sharpness
    vx = momentum * vx - step * g.x
    vy = momentum * vy - step * g.y
    const nx = clamp(x + vx)
    const ny = clamp(y + vy)
    if (nx !== x + vx) vx = 0
    if (ny !== y + vy) vy = 0
    x = nx
    y = ny
    steps.push({ x, y, z: land.height(x, y) })
    const moved = Math.hypot(
      steps[i + 1].x - steps[i].x,
      steps[i + 1].y - steps[i].y,
    )
    const g2 = gradient(land, x, y)
    settled = moved < 2e-4 && Math.hypot(g2.x, g2.y) / land.sharpness < 0.01
  }
  return { steps, outcome: outcome(land, steps, settled) }
}

function outcome(land: Landscape, steps: Step[], settled: boolean): Outcome {
  const end = steps[steps.length - 1]
  if (settled) {
    const floor = land.height(land.lowest.x, land.lowest.y)
    if (end.z - floor >= 0.02) return 'stuck'
    // A fitted curve's valley floor can be so flat that the ball stops on
    // it while still far from the lowest point. "Your fit" has just one
    // lowest point, so being far from it means it fell short; elsewhere
    // another dip can be just as low.
    const away = Math.hypot(end.x - land.lowest.x, end.y - land.lowest.y)
    return land.id === 'fit' && away > 0.1 ? 'floor' : 'lowest'
  }
  // Bouncing: most recent steps turn back on the one before.
  const last = steps.slice(-21)
  let turns = 0
  for (let i = 2; i < last.length; i++) {
    const ax = last[i - 1].x - last[i - 2].x
    const ay = last[i - 1].y - last[i - 2].y
    const bx = last[i].x - last[i - 1].x
    const by = last[i].y - last[i - 1].y
    if (ax * bx + ay * by < 0) turns++
  }
  return turns >= 12 ? 'bouncing' : 'slow'
}
