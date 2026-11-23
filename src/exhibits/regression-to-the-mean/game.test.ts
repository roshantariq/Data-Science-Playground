import { describe, expect, it } from 'vitest'
import {
  changeAfter,
  coach,
  coachTally,
  extremes,
  luckTimes,
  mean,
  newBests,
  slowerFaster,
  spread,
  TOO_SOON,
} from './game.ts'

// Small seeded generator so the luck tests repeat exactly.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('coach', () => {
  const times = [300, 280, 250, 320, 290]
  it('stays quiet for the first two rounds', () => {
    expect(coach(times, 0)).toBeNull()
    expect(coach(times, 1)).toBeNull()
  })
  it('judges each round against the average before it', () => {
    expect(coach(times, 2)).toBe('praise') // 250 < 290
    expect(coach(times, 3)).toBe('scold') // 320 > 276.7
    expect(coach(times, 4)).toBe('scold') // 290 > 287.5
  })
  it('counts what happened after praise and after scolding', () => {
    expect(coachTally(times)).toEqual({
      praised: 1,
      slowerAfter: 1,
      scolded: 1,
      fasterAfter: 1,
    })
  })
})

describe('extremes and changeAfter', () => {
  const times = [300, 200, 310, 400, 250, 260]
  it('picks the fastest and slowest rounds that have a next round', () => {
    expect(extremes(times, 2, true)).toEqual([1, 4])
    expect(extremes(times, 2, false)).toEqual([3, 2])
  })
  it('averages the change to the next round', () => {
    expect(changeAfter(times, [1, 4])).toBe((110 + 10) / 2)
    expect(changeAfter(times, [3, 2])).toBe((-150 + 90) / 2)
  })
})

describe('newBests', () => {
  it('lists each round that beat every round before it', () => {
    expect(newBests([300, 320, 280, 290, 250, 260])).toEqual([2, 4])
  })
})

describe('luckTimes', () => {
  it('rolls times with the asked-for average and spread', () => {
    const t = luckTimes(280, 40, 20000, seeded(1))
    expect(Math.abs(mean(t) - 280)).toBeLessThan(2)
    expect(spread(t)).toBeGreaterThan(38)
    expect(spread(t)).toBeLessThan(42)
    expect(Math.min(...t)).toBeGreaterThanOrEqual(TOO_SOON)
  })
  it('shows regression to the mean with no skill at all', () => {
    // Over many 30-round games of pure luck, the rounds after the 5 fastest
    // are slower, and the rounds after the 5 slowest are faster.
    const rand = seeded(7)
    let afterFast = 0
    let afterSlow = 0
    for (let g = 0; g < 500; g++) {
      const t = luckTimes(280, 40, 30, rand)
      afterFast += changeAfter(t, extremes(t, 5, true))
      afterSlow += changeAfter(t, extremes(t, 5, false))
    }
    expect(afterFast / 500).toBeGreaterThan(30)
    expect(afterSlow / 500).toBeLessThan(-30)
  })
})

describe('slowerFaster', () => {
  it('words the sign', () => {
    expect(slowerFaster(38.4)).toBe('38 ms slower')
    expect(slowerFaster(-52)).toBe('52 ms faster')
  })
})
