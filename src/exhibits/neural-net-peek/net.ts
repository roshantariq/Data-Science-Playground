// A small neural network with two inputs (a point's x and y, each from -1
// to 1) and one output: how likely the point is a square. Hidden neurons use
// tanh, the output a sigmoid, and it learns by gradient descent on
// cross-entropy, a few points at a time.

export type Kind = 0 | 1 // 0 = circle, 1 = square
export type Point = { x: number; y: number; kind: Kind; test: boolean }

// w[l][j][i] is the weight from neuron i in layer l to neuron j in layer
// l + 1, and b[l][j] that neuron's bias. Layer 0 is the two inputs.
export type Net = { w: number[][][]; b: number[][] }

type Rand = () => number

export const RATE = 0.3 // 0.6 made the spirals unstable; 0.1 was slow
const BATCH = 10

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

// Random starting weights, scaled to each layer's size (Glorot), so the
// neurons start out different from one another.
export function createNet(hidden: number[], rand: Rand = Math.random): Net {
  const sizes = [2, ...hidden, 1]
  const w: number[][][] = []
  const b: number[][] = []
  for (let l = 0; l + 1 < sizes.length; l++) {
    const a = Math.sqrt(6 / (sizes[l] + sizes[l + 1]))
    w.push(
      Array.from({ length: sizes[l + 1] }, () =>
        Array.from({ length: sizes[l] }, () => (rand() * 2 - 1) * a),
      ),
    )
    b.push(new Array(sizes[l + 1]).fill(0))
  }
  return { w, b }
}

// Every neuron's output for one point, layer by layer, starting with the
// inputs themselves. The last layer holds the single output.
export function forward(net: Net, x: number, y: number): number[][] {
  const acts = [[x, y]]
  const last = net.w.length - 1
  net.w.forEach((wl, l) => {
    const prev = acts[l]
    acts.push(
      wl.map((row, j) => {
        let z = net.b[l][j]
        for (let i = 0; i < row.length; i++) z += row[i] * prev[i]
        return l === last ? sigmoid(z) : Math.tanh(z)
      }),
    )
  })
  return acts
}

export const predict = (net: Net, x: number, y: number) =>
  forward(net, x, y).at(-1)![0]

// The average cross-entropy over the points: low when the net is sure and
// right, very high when it's sure and wrong.
export function loss(net: Net, pts: Point[]) {
  let sum = 0
  for (const p of pts) {
    const q = Math.min(1 - 1e-7, Math.max(1e-7, predict(net, p.x, p.y)))
    sum -= p.kind ? Math.log(q) : Math.log(1 - q)
  }
  return pts.length ? sum / pts.length : 0
}

export function accuracy(net: Net, pts: Point[]) {
  const right = pts.filter((p) => predict(net, p.x, p.y) > 0.5 === !!p.kind)
  return pts.length ? right.length / pts.length : 0
}

// How the loss changes with each weight and bias, averaged over the batch
// (backpropagation).
export function gradients(net: Net, batch: Point[]) {
  const dw = net.w.map((wl) => wl.map((row) => row.map(() => 0)))
  const db = net.b.map((bl) => bl.map(() => 0))
  for (const p of batch) {
    const acts = forward(net, p.x, p.y)
    let delta = [acts.at(-1)![0] - p.kind]
    for (let l = net.w.length - 1; l >= 0; l--) {
      const prev = acts[l]
      for (let j = 0; j < delta.length; j++) {
        db[l][j] += delta[j]
        for (let i = 0; i < prev.length; i++) dw[l][j][i] += delta[j] * prev[i]
      }
      if (l > 0) {
        const d = delta
        delta = prev.map(
          (a, i) =>
            (1 - a * a) * d.reduce((s, dj, j) => s + net.w[l][j][i] * dj, 0),
        )
      }
    }
  }
  const n = batch.length || 1
  return {
    dw: dw.map((wl) => wl.map((row) => row.map((v) => v / n))),
    db: db.map((bl) => bl.map((v) => v / n)),
  }
}

// One pass over the training points in a random order, a batch at a time.
// Changes the net in place.
export function epoch(
  net: Net,
  train: Point[],
  rate = RATE,
  rand: Rand = Math.random,
) {
  const order = [...train]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  for (let s = 0; s < order.length; s += BATCH) {
    const { dw, db } = gradients(net, order.slice(s, s + BATCH))
    net.w.forEach((wl, l) =>
      wl.forEach((row, j) => {
        row.forEach((_, i) => (row[i] -= rate * dw[l][j][i]))
        net.b[l][j] -= rate * db[l][j]
      }),
    )
  }
}

// Each neuron's output at every cell of an n-by-n grid over the map, row by
// row from the top, one array per neuron in layer order; the last is the
// output. Hidden neurons give -1 to 1, the output 0 to 1.
export function neuronMaps(net: Net, n: number): Float32Array[] {
  const count = net.w.reduce((s, wl) => s + wl.length, 0)
  const maps = Array.from({ length: count }, () => new Float32Array(n * n))
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const acts = forward(
        net,
        ((c + 0.5) / n) * 2 - 1,
        1 - ((r + 0.5) / n) * 2,
      )
      let k = 0
      for (let l = 1; l < acts.length; l++)
        for (const a of acts[l]) maps[k++][r * n + c] = a
    }
  }
  return maps
}
