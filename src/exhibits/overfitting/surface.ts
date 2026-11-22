// The crossover to the Ski Slope: the training error of a fitted curve,
// seen over two of its numbers while the rest stay at their best values.
//
// Written the usual way, a degree-d curve is c0 + c1·x + c2·x² + … + cd·x^d
// (x rescaled to run from -1 to 1, as in fit.ts). The pair shown is the one
// that pulls hardest against each other: x^(d-2) and x^d, which look more
// and more alike as d grows, so the error's valley gets longer and flatter
// (for a straight line, its height and tilt). Near the best fit the error
// changes by a·u² + 2b·u·v + c·v² when those two numbers move by u and v.
import type { Point } from './fit.ts'

export type FitSurface = {
  degree: number
  powers: [number, number]
  a: number
  b: number
  c: number
}

export function fitSurface(points: Point[], degree: number): FitSurface {
  const xs = points.map((p) => p.x)
  const min = Math.min(...xs)
  const half = (Math.max(...xs) - min) / 2
  const i = degree === 1 ? 0 : degree - 2
  const j = degree
  let a = 0
  let b = 0
  let c = 0
  for (const x of xs) {
    const t = (x - min) / half - 1
    const u = t ** i
    const v = t ** j
    a += u * u
    b += u * v
    c += v * v
  }
  const n = xs.length
  return { degree, powers: [i, j], a: a / n, b: b / n, c: c / n }
}

// Checks data handed over from another page before it's used.
export function isFitSurface(v: unknown): v is FitSurface {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
  return (
    Number.isInteger(s.degree) &&
    (s.degree as number) >= 1 &&
    (s.degree as number) <= 20 &&
    Array.isArray(s.powers) &&
    s.powers.length === 2 &&
    s.powers.every(Number.isInteger) &&
    num(s.a) &&
    num(s.b) &&
    num(s.c) &&
    (s.a as number) > 0 &&
    (s.c as number) > 0
  )
}
