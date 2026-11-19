// Live meters while typing: one channel per column of a QWERTY keyboard,
// left to right, like the channels on a mixer.
export const COLUMNS = [
  'qaz',
  'wsx',
  'edc',
  'rfv',
  'tgb',
  'yhn',
  'ujm',
  'ik',
  'ol',
  'p',
]

export const column = (key: string) => COLUMNS.findIndex((c) => c.includes(key))

// How high a key kicks its meter (0.05 to 1): full for a key 80 ms or less
// after the last one, nearly flat at a second, on a log scale. The first key
// of a sentence has no gap and kicks to half.
export function level(gap: number | null) {
  if (gap === null) return 0.5
  const l = 1 - Math.log(Math.max(gap, 80) / 80) / Math.log(1000 / 80)
  return Math.max(0.05, l)
}
