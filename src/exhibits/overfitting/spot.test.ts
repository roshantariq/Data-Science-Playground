import { describe, expect, test } from 'vitest'
import { judge, message } from './spot.ts'

// Test error is lowest at degree 3 (value 10).
const rows = [20, 13, 10, 10.5, 14, 30].map((test, i) => ({
  degree: i + 1,
  train: 50 - i,
  test,
}))

describe('judge', () => {
  test('within 10% of the lowest test error is spot on, either side', () => {
    expect(judge(rows, 3)).toEqual({ kind: 'spot', best: 3, pick: 3 })
    expect(judge(rows, 4)?.kind).toBe('spot') // 10.5 is within 10% of 10
  })

  test('up to 50% worse is close; beyond that is far', () => {
    expect(judge(rows, 2)?.kind).toBe('closeLow') // 13: 30% worse
    expect(judge(rows, 1)?.kind).toBe('farLow') // 20: 100% worse
    expect(judge(rows, 5)?.kind).toBe('closeHigh') // 14: 40% worse
    expect(judge(rows, 6)?.kind).toBe('farHigh') // 30: 200% worse
  })

  test('no overfit when test error is lowest at the top degree', () => {
    const falling = [9, 7, 5].map((test, i) => ({
      degree: i + 1,
      train: 1,
      test,
    }))
    expect(judge(falling, 1)).toEqual({ kind: 'none', best: 3, pick: 1 })
  })

  test('nothing to judge without test points or rows', () => {
    expect(judge([], 1)).toBeNull()
    expect(judge([{ degree: 1, train: 1, test: null }], 1)).toBeNull()
  })
})

describe('message', () => {
  test('fills in the real degrees', () => {
    expect(message({ kind: 'farHigh', best: 5, pick: 12 })).toEqual({
      title: 'Too far.',
      text: 'The best was degree 5. By 12 the curve twists to hit every solid dot and misses the hollow ones badly.',
    })
    expect(message({ kind: 'none', best: 12, pick: 3 }).text).toContain(
      'all the way up to degree 12',
    )
  })
})
