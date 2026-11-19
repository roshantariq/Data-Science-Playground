import { expect, test } from 'vitest'
import { parseBest } from './best.ts'

const standing = {
  speed: 50,
  accuracy: 60,
  steadiness: 70,
  touch: 10,
  rollover: 20,
  wordstarts: 30,
}

test('reads back a saved best', () => {
  const b = { score: 59.4, standing }
  expect(parseBest(JSON.stringify(b))).toEqual(b)
})

test('ignores nothing saved, broken text, or a missing stat', () => {
  expect(parseBest(null)).toBeNull()
  expect(parseBest('{not json')).toBeNull()
  const { touch: _, ...five } = standing
  expect(parseBest(JSON.stringify({ score: 1, standing: five }))).toBeNull()
})
