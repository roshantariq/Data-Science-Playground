import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createSlopeView, type SlopeView } from './scene.ts'
import {
  LANDSCAPES,
  landscape,
  roll,
  type Landscape,
  type LandscapeId,
  type Roll,
} from './slopes.ts'

// Learning rates on the slider, slow to wild. 1 is about the fastest pace
// that still settles; past 2 the ball bounces (see slopes.ts).
const RATES = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.3, 1.6, 2, 2.4]
const STEP_MS = 60

// A random start well away from the lowest point.
function randomStart(land: Landscape) {
  for (;;) {
    const p = { x: Math.random() * 1.8 - 0.9, y: Math.random() * 1.8 - 0.9 }
    if (Math.hypot(p.x - land.lowest.x, p.y - land.lowest.y) > 0.8) return p
  }
}

const still = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function result(r: Roll) {
  const n = r.steps.length - 1
  if (r.outcome === 'lowest') return `Reached the lowest point in ${n} steps.`
  if (r.outcome === 'stuck')
    return `Settled in a dip after ${n} steps, but it isn't the lowest point.`
  if (r.outcome === 'bouncing')
    return `Still bouncing after ${n} steps. The learning rate is too high for it to settle.`
  return `Still rolling after ${n} steps. It ran out of time before reaching the bottom.`
}

export function SkiSlope() {
  const [id, setId] = useState<LandscapeId>('bowl')
  const [land, setLand] = useState(() => landscape('bowl'))
  const [start, setStart] = useState(() => randomStart(land))
  const [rate, setRate] = useState(3)
  const [momentum, setMomentum] = useState(0)
  const [run, setRun] = useState<Roll | null>(null)
  const [shown, setShown] = useState(0) // steps of the run drawn so far
  const [noView, setNoView] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<SlopeView | null>(null)
  const rateId = useId()
  const momentumId = useId()

  const rolling = run !== null && shown < run.steps.length - 1
  const name = LANDSCAPES.find((l) => l.id === id)!.name

  // Any change puts the ball back at its start.
  const reset = () => {
    setRun(null)
    setShown(0)
  }

  useEffect(() => {
    if (!host.current) return
    const v = createSlopeView(host.current, (p) => {
      setStart(p)
      setRun(null)
      setShown(0)
    })
    if (!v) {
      setNoView(true)
      return
    }
    view.current = v
    return () => {
      v.dispose()
      view.current = null
    }
  }, [])

  useEffect(() => {
    view.current?.setLandscape(land)
  }, [land])

  useEffect(() => {
    const v = view.current
    if (!v) return
    v.setStart(start)
    const z = land.height(start.x, start.y)
    v.setPath(run ? run.steps.slice(0, shown + 1) : [{ ...start, z }])
  }, [land, start, run, shown])

  // Roll one step at a time.
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setShown((s) => s + 1), STEP_MS)
    return () => window.clearTimeout(t)
  }, [rolling, shown])

  const go = () => {
    const r = roll(land, start, RATES[rate], momentum)
    setRun(r)
    setShown(still() ? r.steps.length - 1 : 0)
  }

  const pick = (next: LandscapeId) => {
    const l = landscape(next)
    setId(next)
    setLand(l)
    setStart(randomStart(l))
    reset()
  }

  const status = !run
    ? 'Tap or click the slope to move the ball, then press Roll.'
    : rolling
      ? `Rolling… step ${shown}`
      : result(run)

  return (
    <div className="slope">
      <div className="slope-bar" role="group" aria-label="Landscape">
        <span>Landscape</span>
        {LANDSCAPES.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={l.id === id}
            onClick={() => pick(l.id)}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="slope-view">
        <div
          ref={host}
          className="slope-canvas"
          role="img"
          aria-label={`3D view of the ${name} landscape, with the ball${run ? "'s path down it" : ' at its start'}. Drag to turn it, or use two fingers on a phone.`}
        />
        {noView && (
          <p className="slope-fallback">
            Your browser can't show 3D here. The chart below still shows each
            roll.
          </p>
        )}
      </div>
      <div className="slope-controls">
        <label htmlFor={rateId}>Learning rate {RATES[rate]}</label>
        <input
          id={rateId}
          type="range"
          min={0}
          max={RATES.length - 1}
          value={rate}
          aria-valuetext={String(RATES[rate])}
          onChange={(e) => {
            setRate(Number(e.target.value))
            reset()
          }}
        />
        <label htmlFor={momentumId}>Momentum {momentum.toFixed(2)}</label>
        <input
          id={momentumId}
          type="range"
          min={0}
          max={0.95}
          step={0.05}
          value={momentum}
          aria-valuetext={momentum.toFixed(2)}
          onChange={(e) => {
            setMomentum(Number(e.target.value))
            reset()
          }}
        />
        <div className="slope-buttons">
          <button type="button" onClick={go} disabled={rolling}>
            Roll
          </button>
          <button
            type="button"
            onClick={() => {
              setStart(randomStart(land))
              reset()
            }}
          >
            New start
          </button>
        </div>
      </div>
      <p className="slope-status" aria-live="polite">
        {status}
      </p>
      <HeightChart run={run} shown={shown} />
    </div>
  )
}

const W = 500
const H = 160
const PAD = 12

// The ball's height at each step: a falling line that flattens out when it
// settles, a saw-tooth when it bounces.
function HeightChart({ run, shown }: { run: Roll | null; shown: number }) {
  const steps = useMemo(
    () => (run ? run.steps.slice(0, shown + 1) : []),
    [run, shown],
  )
  const last = Math.max(steps.length - 1, 1)
  const span = Math.max(run ? run.steps.length - 1 : 1, 20)
  const x = (i: number) => PAD + (i / span) * (W - 2 * PAD)
  const y = (z: number) => PAD + (1 - z) * (H - 2 * PAD)
  const d = steps.length
    ? 'M' +
      steps.map((s, i) => `${x(i).toFixed(1)},${y(s.z).toFixed(1)}`).join('L')
    : ''
  const label = !run
    ? 'Height chart. No roll yet.'
    : `Height chart. The ball started at ${Math.round(steps[0].z * 100)}% of the way up and is at ${Math.round(steps[last]?.z * 100 || 0)}% after ${steps.length - 1} steps.`
  return (
    <figure className="slope-chart">
      <figcaption>Height of the ball at each step (lower is better)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line
          className="axis"
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
        />
        {d && <path className="height" d={d} />}
      </svg>
    </figure>
  )
}
