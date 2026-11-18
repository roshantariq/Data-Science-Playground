export type Point = { x: number; y: number }

const MAX_DEGREE = 20

/** Highest degree these points can support: distinct x values minus one, capped at 20. */
export function maxDegree(points: Point[]): number {
  return Math.min(MAX_DEGREE, new Set(points.map((p) => p.x)).size - 1)
}

/** Least squares polynomial fit. Returns a function that predicts y from x. */
export function fitPolynomial(
  points: Point[],
  degree: number,
): (x: number) => number {
  if (!Number.isInteger(degree) || degree < 1 || degree > maxDegree(points)) {
    throw new RangeError(`Degree ${degree} is not supported by these points`)
  }
  // Rescale x to [-1, 1] and use Chebyshev polynomials as the basis:
  // far better conditioned than raw powers of x at high degrees.
  const xs = points.map((p) => p.x)
  const min = Math.min(...xs)
  const half = (Math.max(...xs) - min) / 2
  const scale = (x: number) => (x - min) / half - 1
  const basis = (x: number) => {
    const t = scale(x)
    const row = [1, t]
    for (let k = 2; k <= degree; k++) row.push(2 * t * row[k - 1] - row[k - 2])
    return row.slice(0, degree + 1)
  }
  const coefficients = leastSquares(
    points.map((p) => basis(p.x)),
    points.map((p) => p.y),
  )
  return (x) => basis(x).reduce((sum, b, k) => sum + b * coefficients[k], 0)
}

/** Root mean square error of the predictions. */
export function rmse(points: Point[], predict: (x: number) => number): number {
  const total = points.reduce((sum, p) => sum + (predict(p.x) - p.y) ** 2, 0)
  return Math.sqrt(total / points.length)
}

/** Solves min |Ac - b| with Householder QR (more stable than the normal equations). */
function leastSquares(A: number[][], b: number[]): number[] {
  const m = A.length
  const n = A[0].length
  for (let k = 0; k < n; k++) {
    let norm = 0
    for (let i = k; i < m; i++) norm += A[i][k] ** 2
    norm = Math.sqrt(norm)
    const alpha = A[k][k] > 0 ? -norm : norm
    const v = A.slice(k).map((row) => row[k])
    v[0] -= alpha
    const vv = v.reduce((s, vi) => s + vi * vi, 0)
    if (vv === 0) continue
    const reflect = (
      get: (i: number) => number,
      set: (i: number, x: number) => void,
    ) => {
      let dot = 0
      for (let i = k; i < m; i++) dot += v[i - k] * get(i)
      const f = (2 * dot) / vv
      for (let i = k; i < m; i++) set(i, get(i) - f * v[i - k])
    }
    for (let j = k; j < n; j++)
      reflect(
        (i) => A[i][j],
        (i, x) => (A[i][j] = x),
      )
    reflect(
      (i) => b[i],
      (i, x) => (b[i] = x),
    )
  }
  const c = new Array<number>(n).fill(0)
  for (let k = n - 1; k >= 0; k--) {
    let sum = b[k]
    for (let j = k + 1; j < n; j++) sum -= A[k][j] * c[j]
    c[k] = sum / A[k][k]
  }
  return c
}
