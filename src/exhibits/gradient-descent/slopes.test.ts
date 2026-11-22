import { describe, expect, it } from 'vitest'
import { fitSurface } from '../overfitting/surface.ts'
import {
  fitLandscape,
  LANDSCAPES,
  landscape,
  MAX_STEPS,
  roll,
} from './slopes.ts'

// A repeatable stand-in for Math.random.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

describe('landscape', () => {
  it('runs from 0 at the lowest point to at most 1, for every shape', () => {
    for (const { id } of LANDSCAPES) {
      for (let s = 1; s <= 20; s++) {
        const land = landscape(id, seeded(s))
        expect(land.height(land.lowest.x, land.lowest.y)).toBeCloseTo(0, 6)
        for (let i = 0; i <= 10; i++) {
          for (let j = 0; j <= 10; j++) {
            const z = land.height(-1 + i / 5, -1 + j / 5)
            expect(z).toBeGreaterThanOrEqual(-1e-9)
            expect(z).toBeLessThanOrEqual(1 + 1e-9)
          }
        }
      }
    }
  })

  it('gives the same shape for the same seed and a new one otherwise', () => {
    const a = landscape('bumpy', seeded(3))
    const b = landscape('bumpy', seeded(3))
    const c = landscape('bumpy', seeded(4))
    expect(a.height(0.3, -0.2)).toBe(b.height(0.3, -0.2))
    expect(a.height(0.3, -0.2)).not.toBe(c.height(0.3, -0.2))
  })
})

describe('roll', () => {
  it('reaches the bottom of a bowl at a moderate learning rate', () => {
    for (let s = 1; s <= 20; s++) {
      const land = landscape('bowl', seeded(s))
      expect(roll(land, { x: 0.9, y: -0.9 }, 0.3, 0).outcome).toBe('lowest')
    }
  })

  it('bounces when the learning rate is too high', () => {
    const land = landscape('bowl', seeded(5))
    expect(roll(land, { x: 0.9, y: -0.9 }, 2.4, 0).outcome).toBe('bouncing')
  })

  it('is still rolling at the end when the learning rate is tiny', () => {
    const land = landscape('valley', seeded(5))
    const r = roll(land, { x: 0.9, y: 0.9 }, 0.01, 0)
    expect(r.outcome).toBe('slow')
    expect(r.steps).toHaveLength(MAX_STEPS + 1)
  })

  it('settles in the shallow dip when started inside it', () => {
    for (let s = 1; s <= 20; s++) {
      const land = landscape('two-valleys', seeded(s))
      const shallow = { x: -land.lowest.x, y: -land.lowest.y }
      expect(roll(land, shallow, 0.3, 0).outcome).toBe('stuck')
    }
  })

  it('on a degree-10 fit, stops short on the flat floor unless it has momentum', () => {
    const r = seeded(7)
    const points = Array.from({ length: 20 }, () => ({ x: r() * 10, y: 0 }))
    const land = fitLandscape(fitSurface(points, 10))
    const start = { x: -0.9, y: -0.7 }
    expect(roll(land, start, 1, 0).outcome).toBe('floor')
    expect(roll(land, start, 1, 0.9).outcome).toBe('lowest')
  })

  it('never leaves the map', () => {
    for (const { id } of LANDSCAPES) {
      const land = landscape(id, seeded(9))
      for (const step of roll(land, { x: 1, y: 1 }, 3, 0.9).steps) {
        expect(Math.abs(step.x)).toBeLessThanOrEqual(1)
        expect(Math.abs(step.y)).toBeLessThanOrEqual(1)
      }
    }
  })
})
