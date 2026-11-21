import { describe, expect, it } from 'vitest'
import { nextExhibit, wingCount, type Exhibit } from './exhibits.ts'

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

describe('nextExhibit', () => {
  const ex = (slug: string, open: boolean): Exhibit => ({
    slug,
    wing: 'machines',
    title: slug,
    line: '',
    open,
  })
  const a = ex('a', true)
  const b = ex('b', false)
  const c = ex('c', true)
  const d = ex('d', false)
  const list = [a, b, c, d]

  it('skips coming-soon exhibits', () => {
    expect(nextExhibit(a, list)).toBe(c)
  })

  it('wraps round to the start', () => {
    expect(nextExhibit(c, list)).toBe(a)
  })

  it('gives nothing when no other exhibit is open', () => {
    expect(nextExhibit(a, [a, b, d])).toBeNull()
  })
})
