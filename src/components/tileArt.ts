// The small drawing on each exhibit tile. Each keeps a recognisable shape,
// with fresh random data inside it on every load. Drawn in a 160 x 90 box,
// kept clear of the bottom few units and inside the wing-colour border.

export type Shape =
  | { kind: 'path'; style: Style; d: string; dashed?: boolean }
  | { kind: 'circle'; style: Style; x: number; y: number; r: number }
  | {
      kind: 'ellipse'
      style: Style
      x: number
      y: number
      rx: number
      ry: number
    }
  | { kind: 'rect'; style: Style; x: number; y: number; w: number; h: number }

// stroke and fill use the wing's mark colour; ink is the text colour;
// ring is a hollow test point, as in the Overfitting Playground.
export type Style = 'stroke' | 'fill' | 'ink' | 'line' | 'grid' | 'ring'

// back: faint guides that come to full strength on hover; marks: the drawing.
export type Art = { back: Shape[]; marks: Shape[] }

type Rand = () => number

const r1 = (n: number) => Math.round(n * 10) / 10
const dot = (style: Style, x: number, y: number, r: number): Shape => ({
  kind: 'circle',
  style,
  x: r1(x),
  y: r1(y),
  r,
})
const bar = (
  style: Style,
  x: number,
  y: number,
  w: number,
  h: number,
): Shape => ({
  kind: 'rect',
  style,
  x: r1(x),
  y: r1(y),
  w: r1(w),
  h: r1(h),
})
const line = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join(' ')

const DRAW: Record<string, (rand: Rand) => Art> = {
  // A wiggly curve through the points; every third point is a test ring.
  overfitting(rand) {
    const xs = [10, 26, 42, 58, 74, 90, 106, 122, 138, 150]
    const wave = 18 + rand() * 8
    const ys = xs.map((x) => 44 + Math.sin(x / wave) * 18 + (rand() - 0.5) * 18)
    let d = `M${xs[0]} ${r1(ys[0])}`
    for (let i = 1; i < xs.length; i++) {
      const mx = (xs[i - 1] + xs[i]) / 2
      const c1 = r1(ys[i - 1] + (rand() - 0.5) * 14)
      const c2 = r1(ys[i] + (rand() - 0.5) * 14)
      d += ` C${mx} ${c1} ${mx} ${c2} ${xs[i]} ${r1(ys[i])}`
    }
    return {
      back: [{ kind: 'path', style: 'grid', d: 'M0 28H160M0 58H160' }],
      marks: [
        { kind: 'path', style: 'stroke', d },
        ...xs.map((x, i) => dot(i % 3 === 1 ? 'ring' : 'ink', x, ys[i], 3.5)),
      ],
    }
  },

  // Contour rings, and a ball's path rolling down to the lowest point.
  'gradient-descent'(rand) {
    const cx = 72 + rand() * 36
    const cy = 38 + rand() * 12
    const rings: Shape[] = [
      [64, 34],
      [42, 22],
      [18, 9],
    ].map(([rx, ry]) => ({
      kind: 'ellipse',
      style: 'grid',
      x: r1(cx),
      y: r1(cy),
      rx,
      ry,
    }))
    let x = 10 + rand() * 24
    let y = 8 + rand() * 12
    const steps: [number, number][] = [[x, y]]
    for (let i = 0; i < 5; i++) {
      x += (cx - x) * (0.35 + rand() * 0.2) + (rand() - 0.5) * 6
      y += (cy - y) * (0.35 + rand() * 0.2)
      steps.push([x, y])
    }
    return {
      back: rings,
      marks: [
        { kind: 'path', style: 'stroke', d: line(steps) },
        ...steps.map(([sx, sy], i) => dot('fill', sx, sy, i === 5 ? 5 : 3)),
      ],
    }
  },

  // Two kinds of points, split by hand-drawn lines.
  'be-the-algorithm'(rand) {
    const sx = 55 + rand() * 40
    const sy = 30 + rand() * 30
    const marks: Shape[] = [
      {
        kind: 'path',
        style: 'line',
        d: `M${r1(sx)} 4V82M4 ${r1(sy)}H${r1(sx)}`,
      },
    ]
    for (let i = 0; i < 16; i++) {
      const x = 8 + rand() * 144
      const y = 8 + rand() * 72
      const a = x < sx ? y < sy + 8 : y > sy - 8
      marks.push(dot(a ? 'fill' : 'ink', x, y, 3.2))
    }
    return { back: [], marks }
  },

  // Two spirals of points, with the boundary that separates them.
  'neural-net-peek'(rand) {
    const t0 = rand() * Math.PI * 2
    const at = (t: number, r: number, turn: number): [number, number] => [
      80 + Math.cos(t + t0 + turn) * r * 1.6,
      45 + Math.sin(t + t0 + turn) * r,
    ]
    const marks: Shape[] = []
    for (let i = 0; i < 26; i++) {
      const k = i % 2
      const [x, y] = at((i / 26) * 3.2 * Math.PI, 3 + i * 1.35, k * Math.PI)
      marks.push(dot(k ? 'ink' : 'fill', x, y, 2.4))
    }
    const edge: [number, number][] = []
    for (let i = 0; i <= 40; i++) {
      edge.push(at((i / 40) * 3.2 * Math.PI, 3 + i * 0.88, Math.PI / 2))
    }
    return { back: [{ kind: 'path', style: 'stroke', d: line(edge) }], marks }
  },

  // The rhythm timeline: a bar per key, width = hold time, rollover keys on a
  // lower line, word starts in the wing colour, and one long pause marked.
  'typing-rhythm'(rand) {
    const marks: Shape[] = []
    const back: Shape[] = []
    for (const top of [14, 50]) {
      let x = 8
      let word = true
      let paused = top === 50 || rand() < 0.5
      while (x < 146) {
        const w = 4 + rand() * 9
        const roll = !word && rand() < 0.22
        marks.push(
          bar(
            word ? 'fill' : 'ink',
            x,
            roll ? top + 14 : top,
            Math.min(w, 152 - x),
            10,
          ),
        )
        x += w + (roll ? -2 : 2 + rand() * 4)
        word = rand() < 0.22
        if (word) x += 3
        if (!paused && x > 60 && rand() < 0.2) {
          back.push({
            kind: 'path',
            style: 'line',
            dashed: true,
            d: `M${r1(x + 4)} ${top - 4}V${top + 28}`,
          })
          x += 10
          paused = true
        }
      }
    }
    return { back, marks }
  },

  // A waveform with one outlier, marked with a dot.
  'sound-of-your-data'(rand) {
    const out = 2 + Math.floor(rand() * 12)
    let d = ''
    let peak: Shape = dot('ink', 0, 0, 3)
    for (let i = 0; i < 15; i++) {
      const x = 10 + i * 10
      const h = i === out ? 32 : 5 + rand() * 22
      if (i === out) peak = dot('ink', x, 43 - h - 6, 3)
      d += `M${x} ${r1(43 - h)}V${r1(43 + h)}`
    }
    return {
      back: [{ kind: 'path', style: 'grid', d: 'M0 43H160' }],
      marks: [{ kind: 'path', style: 'stroke', d }, peak],
    }
  },

  // Rounds as bars: one best round, then an ordinary one, around the average.
  'regression-to-the-mean'(rand) {
    const best = 2 + Math.floor(rand() * 8)
    const marks: Shape[] = []
    for (let i = 0; i < 12; i++) {
      const v =
        i === best ? 66 : i === best + 1 ? 30 + rand() * 8 : 18 + rand() * 30
      marks.push(bar(i === best ? 'ink' : 'fill', 8 + i * 12.4, 82 - v, 8, v))
    }
    return {
      back: [{ kind: 'path', style: 'line', dashed: true, d: 'M4 49H156' }],
      marks,
    }
  },

  // Answers plotted under the "perfectly sure" diagonal: a bit overconfident.
  'calibration-check'(rand) {
    const pts: [number, number][] = [0, 1, 2, 3, 4].map((i) => {
      const x = 24 + i * 30
      return [x, 80 - (x - 12) * 0.48 + 3 + rand() * 10 * (i / 4 + 0.3)]
    })
    return {
      back: [{ kind: 'path', style: 'grid', d: 'M12 80L150 14' }],
      marks: [
        { kind: 'path', style: 'stroke', d: line(pts) },
        ...pts.map(([x, y]) => dot('fill', x, y, 3.4)),
      ],
    }
  },
}

export function tileArt(slug: string, rand: Rand = Math.random): Art | null {
  return DRAW[slug]?.(rand) ?? null
}
