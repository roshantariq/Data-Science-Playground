import { expect, test } from 'vitest'
import { pickSentences, SENTENCES } from './sentences.ts'

test('every sentence is lowercase letters and single spaces', () => {
  expect(SENTENCES).toHaveLength(60)
  for (const s of SENTENCES) expect(s).toMatch(/^[a-z]+( [a-z]+)*$/)
})

test('a round of 20 has no repeats', () => {
  const round = pickSentences(20)
  expect(new Set(round).size).toBe(20)
  for (const s of round) expect(SENTENCES).toContain(s)
})
