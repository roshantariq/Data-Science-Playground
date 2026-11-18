import type { ErrorRow } from './errors.ts'

export type Verdict = {
  kind: 'spot' | 'closeHigh' | 'farHigh' | 'closeLow' | 'farLow' | 'none'
  best: number // degree with the lowest test error
  pick: number // the visitor's degree
}

/**
 * Judges a pick by how much worse its test error is than the lowest:
 * within 10% is spot on, up to 50% is close, beyond that is far.
 */
export function judge(rows: ErrorRow[], pick: number): Verdict | null {
  if (rows.length === 0 || rows.some((r) => r.test === null)) return null
  const tests = rows.map((r) => r.test!)
  const best = tests.indexOf(Math.min(...tests)) + 1
  if (best === rows.length) return { kind: 'none', best, pick }
  const worse = tests[pick - 1] / tests[best - 1]
  const side = pick > best ? 'High' : 'Low'
  if (worse <= 1.1) return { kind: 'spot', best, pick }
  return { kind: worse <= 1.5 ? `close${side}` : `far${side}`, best, pick }
}

export function message({ kind, best, pick }: Verdict) {
  const said = {
    spot: [
      'Spot on.',
      `The curve does best on the hollow dots at degree ${best}, and your pick does just as well. Any simpler and it can't follow the shape. Any bendier and it starts chasing the wobble.`,
    ],
    closeHigh: [
      'Close, but a little past it.',
      `The best was degree ${best}. At ${pick} the curve has already started bending toward the wobble in the solid dots.`,
    ],
    farHigh: [
      'Too far.',
      `The best was degree ${best}. By ${pick} the curve twists to hit every solid dot and misses the hollow ones badly.`,
    ],
    closeLow: [
      'Close, just short.',
      `The best was degree ${best}. At ${pick} the curve is still a little too stiff to follow the shape.`,
    ],
    farLow: [
      'Not bendy enough yet.',
      `The best was degree ${best}. At ${pick} the curve is too simple to follow the shape of the dots.`,
    ],
    none: [
      'No overfit this time.',
      `The curve kept getting better on the hollow dots all the way up to degree ${best}. Try Random data or New split and look again.`,
    ],
  }[kind]
  return { title: said[0], text: said[1] }
}
