// Paints a neuron's map onto a canvas in flat bands of colour, no gradients:
// the surer the neuron, the darker the band.

export type RGB = [number, number, number]

const ALPHAS = [0.1, 0.24, 0.42] // how much of the mark colour each band shows

// The band a value falls in: 0, 1 or 2, or -1 for none. The output (0 to 1)
// is banded by how far it is from 0.5 on either side; a hidden neuron (-1 to
// 1) only where it lights up, above 0.
export function band(v: number, hidden: boolean) {
  if (hidden && v <= 0) return -1
  const s = hidden ? v : Math.abs(v - 0.5) * 2
  return s < 1 / 3 ? 0 : s < 2 / 3 ? 1 : 2
}

// "rgb(6, 163, 122)" from getComputedStyle, as numbers.
export function rgb(css: string): RGB {
  const [r = 0, g = 0, b = 0] = css.match(/[\d.]+/g)?.map(Number) ?? []
  return [r, g, b]
}

// `share` of colour b laid over colour a.
export const mix = (a: RGB, b: RGB, share: number): RGB =>
  a.map((v, i) => Math.round(v + (b[i] - v) * share)) as RGB

// One cell per value on an n-by-n canvas. `low` colours values below 0.5
// (circles) and `high` the rest (squares); a hidden neuron passes null for
// `low`, so only where it lights up is shaded.
export function paint(
  ctx: CanvasRenderingContext2D,
  values: Float32Array,
  n: number,
  surface: RGB,
  low: RGB | null,
  high: RGB,
) {
  const hidden = low === null
  const shades = [low, high].map((c) =>
    c ? ALPHAS.map((a) => mix(surface, c, a)) : null,
  )
  const img = ctx.createImageData(n, n)
  for (let k = 0; k < n * n; k++) {
    const v = values[k]
    const b = band(v, hidden)
    const side = shades[hidden || v >= 0.5 ? 1 : 0]
    const [r, g, bl] = b < 0 || !side ? surface : side[b]
    img.data.set([r, g, bl, 255], k * 4)
  }
  ctx.putImageData(img, 0, 0)
}
