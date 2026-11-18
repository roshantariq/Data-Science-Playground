import { fitPolynomial, rmse } from './fit.ts'
import type { Sample } from './points.ts'

export type ErrorRow = { degree: number; train: number; test: number | null }

/** Training and test error for every degree from 1 to the cap. */
export function errorCurve(points: Sample[], cap: number): ErrorRow[] {
  const training = points.filter((p) => !p.test)
  const tests = points.filter((p) => p.test)
  return Array.from({ length: Math.max(0, cap) }, (_, i) => {
    const predict = fitPolynomial(training, i + 1)
    return {
      degree: i + 1,
      train: rmse(training, predict),
      test: tests.length ? rmse(tests, predict) : null,
    }
  })
}

/**
 * Maps an error to a height from 0 (top) to 1 (bottom). The normal scale
 * tops out at 1.5x the degree-1 error, so an exploding test error runs off
 * the top (offChart). The log scale fits every value.
 */
export function chartScale(rows: ErrorRow[], log: boolean) {
  const values = rows.flatMap((r) =>
    r.test === null ? [r.train] : [r.train, r.test],
  )
  if (!log) {
    const first = rows[0]
    const top = 1.5 * Math.max(first?.train ?? 0, first?.test ?? 0) || 1
    return {
      y: (v: number) => 1 - Math.min(v, top) / top,
      offChart: values.some((v) => v > top),
    }
  }
  const hi = Math.max(...values, 1e-9) * 1.2
  // Near-zero training errors would stretch the axis forever; floor them.
  const lo =
    Math.max(Math.min(...values.filter((v) => v > 0), hi), hi * 1e-4) / 1.2
  const span = Math.log(hi) - Math.log(lo) || 1
  return {
    y: (v: number) => 1 - (Math.log(Math.max(v, lo)) - Math.log(lo)) / span,
    offChart: false,
  }
}
