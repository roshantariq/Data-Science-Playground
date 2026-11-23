// Maths for Regression to the Mean, Live: the coach, the rounds after the
// fastest and slowest ones, and a pure-luck player.

export const ROUNDS = 30
export const TOP = 5 // fastest and slowest rounds picked out at the end
export const TOO_SOON = 100 // ms: quicker than this is a guess, not a reaction

export const mean = (xs: number[]) =>
  xs.reduce((s, x) => s + x, 0) / (xs.length || 1)

export function spread(xs: number[]) {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

export type Verdict = 'praise' | 'scold'

// From round 3, the coach praises a round faster than the average so far
// and scolds one that's slower.
export function coach(times: number[], i: number): Verdict | null {
  if (i < 2) return null
  return times[i] < mean(times.slice(0, i)) ? 'praise' : 'scold'
}

// The indices of the n fastest (or slowest) rounds that have a round after
// them.
export function extremes(times: number[], n: number, fastest: boolean) {
  return times
    .slice(0, -1)
    .map((t, i) => [t, i])
    .sort((a, b) => (fastest ? a[0] - b[0] : b[0] - a[0]))
    .slice(0, n)
    .map(([, i]) => i)
}

// Average change from each of those rounds to the next one, in ms. Positive
// means the next round was slower.
export const changeAfter = (times: number[], picked: number[]) =>
  mean(picked.map((i) => times[i + 1] - times[i]))

// How often the round after the coach's praise was slower, and the round
// after a scolding faster.
export function coachTally(times: number[]) {
  const t = { praised: 0, slowerAfter: 0, scolded: 0, fasterAfter: 0 }
  for (let i = 0; i < times.length - 1; i++) {
    const v = coach(times, i)
    if (v === 'praise') {
      t.praised++
      if (times[i + 1] > times[i]) t.slowerAfter++
    } else if (v === 'scold') {
      t.scolded++
      if (times[i + 1] < times[i]) t.fasterAfter++
    }
  }
  return t
}

// The round where each new best was set, from round 2 on.
export function newBests(times: number[]) {
  const out: number[] = []
  let best = times[0]
  for (let i = 1; i < times.length; i++)
    if (times[i] < best) {
      best = times[i]
      out.push(i)
    }
  return out
}

// A player with no skill: every time is a random roll with the given
// average and spread (normal, kept above TOO_SOON).
export function luckTimes(
  avg: number,
  sd: number,
  n: number,
  rand: () => number,
) {
  return Array.from({ length: n }, () => {
    const z =
      Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
    return Math.max(TOO_SOON, Math.round(avg + sd * z))
  })
}

// "38 ms slower" or "12 ms faster".
export const slowerFaster = (ms: number) =>
  `${Math.abs(Math.round(ms))} ms ${ms >= 0 ? 'slower' : 'faster'}`
