import { expect, test } from 'vitest'
import { EXHIBITS } from '../exhibits.ts'
import { tileArt, type Shape } from './tileArt.ts'

const seeded = (seed: number) => {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// The edges a point or bar reaches. Lines join points that are checked, and
// guides and contour rings may run off the edge, so those are skipped.
function box(s: Shape): [number, number, number, number] | null {
  if (s.kind === 'circle') return [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r]
  if (s.kind === 'rect') return [s.x, s.y, s.x + s.w, s.y + s.h]
  return null
}

test('every exhibit has a drawing', () => {
  for (const e of EXHIBITS) expect(tileArt(e.slug), e.slug).not.toBeNull()
  expect(tileArt('no-such-exhibit')).toBeNull()
})

test('points and bars stay inside the box, above the wing strip', () => {
  for (const e of EXHIBITS) {
    for (let seed = 1; seed <= 300; seed++) {
      const art = tileArt(e.slug, seeded(seed))!
      for (const s of [...art.back, ...art.marks]) {
        const b = box(s)
        if (!b) continue
        const [x0, y0, x1, y1] = b
        expect(x0, `${e.slug} seed ${seed}`).toBeGreaterThanOrEqual(0)
        expect(y0, `${e.slug} seed ${seed}`).toBeGreaterThanOrEqual(0)
        expect(x1, `${e.slug} seed ${seed}`).toBeLessThanOrEqual(160)
        expect(y1, `${e.slug} seed ${seed}`).toBeLessThanOrEqual(86)
      }
    }
  }
})

test('the same random numbers give the same drawing, new ones a new drawing', () => {
  for (const e of EXHIBITS) {
    expect(tileArt(e.slug, seeded(7))).toEqual(tileArt(e.slug, seeded(7)))
    expect(tileArt(e.slug, seeded(7))).not.toEqual(tileArt(e.slug, seeded(8)))
  }
})
