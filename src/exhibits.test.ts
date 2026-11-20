import { describe, expect, it } from 'vitest'
import { wingCount } from './exhibits.ts'

describe('wingCount', () => {
  it('counts open exhibits', () => {
    expect(wingCount(4, 1)).toBe('4 exhibits, 1 open')
    expect(wingCount(4, 4)).toBe('4 exhibits, 4 open')
  })

  it('says coming soon when nothing is open, and uses the singular for one', () => {
    expect(wingCount(4, 0)).toBe('4 exhibits, coming soon')
    expect(wingCount(1, 0)).toBe('1 exhibit, coming soon')
  })
})
