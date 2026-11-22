import { describe, expect, it } from 'vitest'
import samples from './samples.json'
import {
  madeUp,
  MAX_STEPS,
  noteFreq,
  numberColumns,
  outliers,
  range,
  slideFreq,
  steps,
} from './sound.ts'

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

describe('outliers', () => {
  it('flags a value far from the rest', () => {
    const v = [10, 11, 9, 10, 12, 10, 95, 11, 9]
    expect(outliers(v)).toEqual(v.map((x) => x === 95))
  })

  it('flags the spike, not every quiet weekend, in a weekly pattern', () => {
    const v: number[] = Array.from({ length: 182 }, (_, d) =>
      d % 7 >= 5 ? 550 : 1000,
    )
    v[90] = 5000
    expect(outliers(v).flatMap((o, i) => (o ? [i] : []))).toEqual([90])
  })

  it('flags nothing in ordinary data, short data or identical values', () => {
    expect(outliers([1, 2, 3, 4, 5, 6, 7, 8]).some(Boolean)).toBe(false)
    expect(outliers([1, 100, 2]).some(Boolean)).toBe(false)
    expect(outliers([5, 5, 5, 5, 5, 5]).some(Boolean)).toBe(false)
  })
})

describe('steps', () => {
  it('keeps one step per value for short series', () => {
    expect(steps([1, 2, 3])).toHaveLength(3)
  })

  it('groups long series and keeps their outliers', () => {
    const v = Array.from({ length: 5000 }, (_, i) => 10 + (i % 3))
    v[2500] = 1000
    const s = steps(v)
    expect(s).toHaveLength(MAX_STEPS)
    expect(s.filter((x) => x.outlier)).toEqual([{ value: 1000, outlier: true }])
  })
})

describe('pitch', () => {
  it('rises with the value and stays within three octaves', () => {
    const { lo, hi } = range(steps([0, 5, 10, 15, 20]))
    for (const f of [noteFreq, slideFreq]) {
      expect(f(0, lo, hi)).toBeCloseTo(130.81, 1)
      expect(f(20, lo, hi)).toBeCloseTo(130.81 * 8, 0)
      expect(f(10, lo, hi)).toBeGreaterThan(f(5, lo, hi))
      expect(f(-50, lo, hi)).toBe(f(0, lo, hi)) // out of range sits at the edge
    }
  })

  it('spreads pitches over the ordinary values, not the outliers', () => {
    const s = steps([10, 11, 9, 10, 12, 10, 95, 11, 9])
    expect(range(s)).toEqual({ lo: 9, hi: 12 })
  })
})

describe('numberColumns', () => {
  it('finds the number columns under a header', () => {
    const rows = [
      ['name', 'age', 'city', 'score'],
      ...Array.from({ length: 6 }, (_, i) => [
        `p${i}`,
        `${20 + i}`,
        'X',
        `${i}.5`,
      ]),
    ]
    expect(numberColumns(rows).map((c) => c.name)).toEqual(['age', 'score'])
  })

  it('names the columns itself when there is no header', () => {
    const rows = Array.from({ length: 6 }, (_, i) => [`${i}`, `${i * 2}`])
    expect(numberColumns(rows).map((c) => c.name)).toEqual([
      'Column 1',
      'Column 2',
    ])
  })

  it('skips columns with too few numbers', () => {
    const rows = [['a'], ['1'], ['x'], ['2'], ['y'], ['3'], ['z']]
    expect(numberColumns(rows)).toEqual([])
  })
})

describe('samples', () => {
  it('has the three real datasets, every value a number', () => {
    expect(samples.map((s) => s.id)).toEqual(['titanic', 'iris', 'nyc'])
    for (const s of samples)
      for (const c of s.columns) {
        expect(c.values.length).toBeGreaterThan(100)
        expect(c.values.every(Number.isFinite)).toBe(true)
      }
  })

  it('makes up new series each time, each with an outlier', () => {
    const a = madeUp(seeded(1))
    const b = madeUp(seeded(2))
    expect(a[0].columns[0].values).not.toEqual(b[0].columns[0].values)
    for (const s of a)
      expect(
        outliers(s.columns[0].values).filter(Boolean).length,
      ).toBeGreaterThan(0)
  })
})
