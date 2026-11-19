import { expect, test } from 'vitest'
import { column, COLUMNS, level } from './meters.ts'

test('every letter has one channel, left to right', () => {
  expect(COLUMNS.join('').split('').sort().join('')).toBe(
    'abcdefghijklmnopqrstuvwxyz',
  )
  expect(column('q')).toBe(0)
  expect(column('m')).toBe(6)
  expect(column('p')).toBe(9)
  expect(column(' ')).toBe(-1)
})

test('a quicker key kicks higher, within 0.05 and 1', () => {
  expect(level(50)).toBe(1)
  expect(level(80)).toBe(1)
  expect(level(200)).toBeGreaterThan(level(400))
  expect(level(1000)).toBe(0.05)
  expect(level(5000)).toBe(0.05)
  expect(level(null)).toBe(0.5)
})
