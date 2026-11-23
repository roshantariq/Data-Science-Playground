import { describe, expect, it } from 'vitest'
import { band, mix, rgb } from './draw.ts'

describe('band', () => {
  it('bands the output by how sure it is, on either side of 0.5', () => {
    expect(band(0.5, false)).toBe(0)
    expect(band(0.3, false)).toBe(1)
    expect(band(0.7, false)).toBe(1)
    expect(band(0.02, false)).toBe(2)
    expect(band(0.98, false)).toBe(2)
  })

  it('shades a hidden neuron only where it lights up', () => {
    expect(band(-0.9, true)).toBe(-1)
    expect(band(0, true)).toBe(-1)
    expect(band(0.1, true)).toBe(0)
    expect(band(0.5, true)).toBe(1)
    expect(band(0.9, true)).toBe(2)
  })
})

describe('colours', () => {
  it('reads computed rgb() colours and mixes them', () => {
    expect(rgb('rgb(6, 163, 122)')).toEqual([6, 163, 122])
    expect(mix([0, 0, 0], [200, 100, 50], 0.5)).toEqual([100, 50, 25])
  })
})
