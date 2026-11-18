import { useId, useState } from 'react'
import { chartScale, type ErrorRow } from './errors.ts'

const W = 500
const H = 300
const LEFT = 16
const RIGHT = W - 16
const TOP = 16
const BOTTOM = H - 36
const MAX_DEGREE = 20

const x = (degree: number) =>
  LEFT + ((degree - 1) / (MAX_DEGREE - 1)) * (RIGHT - LEFT)

function describe(rows: ErrorRow[], degree: number): string {
  if (rows.length === 0) return 'No curve yet, so there are no errors to show.'
  const now = rows[degree - 1]
  const base = rows[0]
  const change = (a: number, b: number) => {
    const pct = Math.round((Math.abs(a - b) / (b || 1)) * 100)
    return pct === 0
      ? 'the same as'
      : `${pct}% ${a < b ? 'lower' : 'higher'} than`
  }
  const train = `training error is ${change(now.train, base.train)} at degree 1`
  const test =
    now.test === null || base.test === null
      ? 'there are no test points'
      : `test error is ${change(now.test, base.test)} at degree 1`
  return `Error chart. At degree ${degree}, ${train}, and ${test}.`
}

export function ErrorChart({
  rows,
  degree,
}: {
  rows: ErrorRow[]
  degree: number
}) {
  const [log, setLog] = useState(false)
  const switchId = useId()
  const scale = chartScale(rows, log)
  const y = (v: number) => TOP + scale.y(v) * (BOTTOM - TOP)
  const line = (values: number[]) =>
    'M' +
    values.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join('L')
  const tests = rows.every((r) => r.test !== null)
    ? rows.map((r) => r.test!)
    : []
  const top = y(Infinity)

  return (
    <figure className="error-chart">
      <figcaption>
        <span>
          {scale.offChart
            ? 'Test error went off the top. Turn on Log scale to see all of it.'
            : 'Error (lower is better)'}
        </span>
        <label htmlFor={switchId}>
          <input
            id={switchId}
            type="checkbox"
            checked={log}
            onChange={(e) => setLog(e.target.checked)}
          />{' '}
          Log scale
        </label>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={describe(rows, degree)}
      >
        <line className="axis" x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} />
        {[1, 5, 10, 15, 20].map((d) => (
          <text key={d} x={x(d)} y={H - 12} textAnchor="middle">
            {d}
          </text>
        ))}
        {rows.length > 0 && (
          <line
            className="now"
            x1={x(degree)}
            y1={TOP}
            x2={x(degree)}
            y2={BOTTOM}
          />
        )}
        {rows.length > 0 && (
          <path className="train" d={line(rows.map((r) => r.train))} />
        )}
        {tests.length > 0 && <path className="test" d={line(tests)} />}
        {rows.map((r) => (
          <circle
            key={`t${r.degree}`}
            className="train"
            cx={x(r.degree)}
            cy={y(r.train)}
            r={4}
          />
        ))}
        {tests.map((v, i) =>
          y(v) <= top ? (
            // Off the top: an arrow instead of a ring.
            <path
              key={`s${i}`}
              className="test off"
              d={`M${x(i + 1) - 6},${TOP + 8}L${x(i + 1)},${TOP - 2}L${x(i + 1) + 6},${TOP + 8}Z`}
            />
          ) : (
            <circle
              key={`s${i}`}
              className="test"
              cx={x(i + 1)}
              cy={y(v)}
              r={4}
            />
          ),
        )}
      </svg>
    </figure>
  )
}
