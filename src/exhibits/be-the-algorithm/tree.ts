// Decision trees on a flat map of points: the map is cut into boxes by
// straight splits, and each box guesses the shape most common inside it.
// The same tree type holds your splits and the real tree's.

export const W = 10 // the map runs from 0 to 10 across
export const H = 6 // and from 0 to 6 up

export type Kind = 0 | 1 // 0 = circle, 1 = square
export type Dot = { x: number; y: number; kind: Kind; test: boolean }
export type Box = { x0: number; x1: number; y0: number; y1: number }
export type Axis = 'x' | 'y'

// A split asks "is x (or y) below `at`?": yes goes to `low`, no to `high`.
export type Tree = {
  box: Box
  split?: { axis: Axis; at: number; low: Tree; high: Tree }
}

export const MAP: Box = { x0: 0, x1: W, y0: 0, y1: H }

export const inBox = (d: Dot, b: Box) =>
  d.x >= b.x0 && d.x < b.x1 && d.y >= b.y0 && d.y < b.y1

// The two halves of a box cut at `at`.
export function halves(b: Box, axis: Axis, at: number): [Box, Box] {
  return axis === 'x'
    ? [
        { ...b, x1: at },
        { ...b, x0: at },
      ]
    : [
        { ...b, y1: at },
        { ...b, y0: at },
      ]
}

export type Leaf = { path: string; box: Box }

// Every box at the bottom of the tree, named by its path of 0s (yes) and
// 1s (no) from the top.
export function leaves(t: Tree, path = ''): Leaf[] {
  if (!t.split) return [{ path, box: t.box }]
  return [
    ...leaves(t.split.low, path + '0'),
    ...leaves(t.split.high, path + '1'),
  ]
}

export const splitCount = (t: Tree): number =>
  t.split ? 1 + splitCount(t.split.low) + splitCount(t.split.high) : 0

// Cuts the box at `path` in two.
export function splitLeaf(t: Tree, path: string, axis: Axis, at: number): Tree {
  if (!t.split) {
    if (path) return t
    const [lo, hi] = halves(t.box, axis, at)
    return {
      box: t.box,
      split: { axis, at, low: { box: lo }, high: { box: hi } },
    }
  }
  const s = t.split
  return {
    box: t.box,
    split:
      path[0] === '0'
        ? { ...s, low: splitLeaf(s.low, path.slice(1), axis, at) }
        : { ...s, high: splitLeaf(s.high, path.slice(1), axis, at) },
  }
}

export const count = (dots: Dot[]): [number, number] => {
  let a = 0
  for (const d of dots) if (d.kind === 0) a++
  return [a, dots.length - a]
}

// The most common shape; a tie or an empty box keeps the guess from above.
export function majority(dots: Dot[], fallback: Kind): Kind {
  const [a, b] = count(dots)
  return a > b ? 0 : b > a ? 1 : fallback
}

// What the tree guesses for one point, learning each box's guess from the
// training points that land in it.
export function predict(t: Tree, train: Dot[], d: Dot, fallback?: Kind): Kind {
  const here = train.filter((p) => inBox(p, t.box))
  const guess = majority(here, fallback ?? majority(train, 0))
  if (!t.split) return guess
  const { axis, at, low, high } = t.split
  return predict(d[axis] < at ? low : high, here, d, guess)
}

// The share of `dots` the tree gets right, from 0 to 1.
export function accuracy(t: Tree, train: Dot[], dots: Dot[]): number {
  if (!dots.length) return 0
  let right = 0
  for (const d of dots) if (predict(t, train, d) === d.kind) right++
  return right / dots.length
}

// Each box's guess and its training counts, for the tree diagram.
export type Labelled = Tree & {
  kind: Kind
  counts: [number, number]
  split?: { axis: Axis; at: number; low: Labelled; high: Labelled }
}

export function label(t: Tree, train: Dot[], fallback?: Kind): Labelled {
  const here = train.filter((p) => inBox(p, t.box))
  const kind = majority(here, fallback ?? majority(train, 0))
  const counts = count(here)
  if (!t.split) return { box: t.box, kind, counts }
  return {
    box: t.box,
    kind,
    counts,
    split: {
      ...t.split,
      low: label(t.split.low, here, kind),
      high: label(t.split.high, here, kind),
    },
  }
}

// Gini impurity times the number of points: 0 when a box holds one shape,
// highest when it's an even mix.
const mixed = (a: number, b: number) => {
  const n = a + b
  return n ? n - (a * a + b * b) / n : 0
}

type Best = { axis: Axis; at: number; gain: number }

// The split of one box that leaves its two sides least mixed. Cuts sit
// halfway between neighbouring points.
export function bestSplit(dots: Dot[]): Best | null {
  const [a, b] = count(dots)
  const before = mixed(a, b)
  let best: Best | null = null
  for (const axis of ['x', 'y'] as const) {
    const sorted = [...dots].sort((p, q) => p[axis] - q[axis])
    let la = 0
    let lb = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].kind === 0) la++
      else lb++
      const v = sorted[i][axis]
      const next = sorted[i + 1][axis]
      if (next === v) continue
      const gain = before - mixed(la, lb) - mixed(a - la, b - lb)
      if (gain > 1e-9 && (!best || gain > best.gain))
        best = { axis, at: (v + next) / 2, gain }
    }
  }
  return best
}

// The real tree: at each step it tries every split of every box and keeps
// the one that cuts the mix the most, up to `budget` splits. It stops early
// if no split helps.
export function grow(train: Dot[], budget: number): Tree {
  let tree: Tree = { box: MAP }
  for (let n = 0; n < budget; n++) {
    let pick: (Best & { path: string }) | null = null
    for (const leaf of leaves(tree)) {
      const b = bestSplit(train.filter((d) => inBox(d, leaf.box)))
      if (b && (!pick || b.gain > pick.gain)) pick = { ...b, path: leaf.path }
    }
    if (!pick) break
    tree = splitLeaf(tree, pick.path, pick.axis, pick.at)
  }
  return tree
}
