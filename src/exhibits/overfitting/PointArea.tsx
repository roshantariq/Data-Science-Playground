import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { InfoTip } from '../../components/InfoTip.tsx'
import { ErrorChart } from './ErrorChart.tsx'
import { errorCurve } from './errors.ts'
import { fitPolynomial, maxDegree, type Point } from './fit.ts'
import { judge, message as verdictText } from './spot.ts'
import { fitSurface } from './surface.ts'
import {
  addPoint,
  curvePoints,
  HEIGHT,
  MAX_POINTS,
  movePoint,
  newSplit,
  pointAt,
  randomPoints,
  removePoint,
  type Sample,
  WIDTH,
} from './points.ts'

const Mark = ({ test }: { test: boolean }) => (
  <svg className="mark" viewBox="0 0 12 12" aria-hidden="true">
    <circle className={test ? 'test' : undefined} cx="6" cy="6" r="4" />
  </svg>
)

const DRAG_START_PX = 6
const KEY_STEP = 10

type Gesture = {
  id: number
  index: number // point under the pointer, or -1
  startX: number
  startY: number
  moved: boolean
}

export function PointArea() {
  const [points, setPoints] = useState<Sample[]>(() => randomPoints())
  const [message, setMessage] = useState('')
  const [scale, setScale] = useState(1) // grid units per CSS pixel
  const svg = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const result = useRef<HTMLParagraphElement>(null)
  const [degree, setDegree] = useState(1)
  const sliderId = useId()
  // The curve is fitted to training points only; test points are hidden
  // from it. The slider stops at what the training points can support, and
  // the chosen degree comes back once there are enough points again.
  const training = useMemo(() => points.filter((p) => !p.test), [points])
  const tests = points.length - training.length
  const cap = maxDegree(training)
  const shown = Math.max(1, Math.min(degree, cap))
  const curve = useMemo(() => {
    if (cap < 1) return ''
    const line = curvePoints(fitPolynomial(training, shown))
    return (
      'M' + line.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')
    )
  }, [training, shown, cap])
  const errors = useMemo(() => errorCurve(points, cap), [points, cap])
  // A Check answers for these exact points and degree; any change hides it.
  const [checked, setChecked] = useState<{
    points: Sample[]
    degree: number
  } | null>(null)
  const canCheck = judge(errors, shown) !== null
  const verdict =
    checked?.points === points && checked.degree === shown
      ? judge(errors, shown)
      : null
  const said = verdict && verdictText(verdict)

  useEffect(() => {
    const el = svg.current!
    const observer = new ResizeObserver(() => setScale(WIDTH / el.clientWidth))
    observer.observe(el)
    // A touch that starts on a point drags it instead of scrolling the page.
    const stopScroll = (e: TouchEvent) => {
      if (gesture.current && gesture.current.index >= 0) e.preventDefault()
    }
    el.addEventListener('touchstart', stopScroll, { passive: false })
    el.addEventListener('touchmove', stopScroll, { passive: false })
    return () => {
      observer.disconnect()
      el.removeEventListener('touchstart', stopScroll)
      el.removeEventListener('touchmove', stopScroll)
    }
  }, [])

  const toGrid = (e: React.PointerEvent): Point => {
    const box = svg.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / box.width) * WIDTH,
      y: ((e.clientY - box.top) / box.height) * HEIGHT,
    }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const radius = (e.pointerType === 'touch' ? 22 : 10) * scale
    const index = pointAt(points, toGrid(e), radius)
    gesture.current = {
      id: e.pointerId,
      index,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    if (index >= 0) e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > DRAG_START_PX)
      g.moved = true
    if (g.moved && g.index >= 0) {
      const index = g.index
      setPoints((ps) => movePoint(ps, index, toGrid(e)))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    if (!g || g.id !== e.pointerId || g.moved) return
    if (g.index >= 0) {
      setPoints((ps) => removePoint(ps, g.index))
      setMessage('')
    } else if (points.length >= MAX_POINTS) {
      setMessage(`Maximum ${MAX_POINTS} points`)
    } else {
      setPoints((ps) => addPoint(ps, toGrid(e)))
    }
  }

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const p = points[index]
    const moves: Record<string, Point> = {
      ArrowLeft: { x: p.x - KEY_STEP, y: p.y },
      ArrowRight: { x: p.x + KEY_STEP, y: p.y },
      ArrowUp: { x: p.x, y: p.y - KEY_STEP },
      ArrowDown: { x: p.x, y: p.y + KEY_STEP },
    }
    if (moves[e.key]) {
      e.preventDefault()
      setPoints(movePoint(points, index, moves[e.key]))
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      setPoints(removePoint(points, index))
      // Keep keyboard focus on a neighbouring point.
      requestAnimationFrame(() => {
        const circles = svg.current?.querySelectorAll('circle')
        circles?.[Math.min(index, circles.length - 1)]?.focus()
      })
    }
  }

  return (
    <div className="point-area">
      <p className="spot-prompt">
        <b>Where does it go wrong?</b> Slide to where the curve starts chasing
        the wobble instead of the shape, then press <b>Check</b>.
      </p>
      <svg
        ref={svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label="Point area. Click to add a point, click a point to remove it, drag to move it."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (gesture.current = null)}
      >
        {curve && <path className="curve" d={curve} />}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={6 * scale}
            className={p.test ? 'test' : undefined}
            tabIndex={0}
            role="button"
            aria-label={`${p.test ? 'Test' : 'Training'} point ${i + 1}. Arrow keys move it, Delete removes it.`}
            onKeyDown={(e) => onKeyDown(e, i)}
          />
        ))}
      </svg>
      <ErrorChart rows={errors} degree={shown} best={verdict?.best} />
      <div className="point-controls">
        <label htmlFor={sliderId}>Degree {cap >= 1 ? shown : '–'}</label>
        <InfoTip about="Degree">
          Degree sets how much the curve can bend. Degree 1 is a straight line.
          Push it high enough and the curve passes through every training point,
          and that's when it starts missing the test points.
        </InfoTip>
        <input
          id={sliderId}
          type="range"
          min={1}
          max={Math.max(1, cap)}
          value={shown}
          disabled={cap < 1}
          onChange={(e) => setDegree(Number(e.target.value))}
        />
        <div className="point-buttons">
          <button
            type="button"
            disabled={!canCheck}
            onClick={() => {
              setChecked({ points, degree: shown })
              // On short screens the answer lands below the fold; bring it up.
              requestAnimationFrame(() =>
                result.current?.scrollIntoView({ block: 'nearest' }),
              )
            }}
          >
            Check
          </button>
          <InfoTip about="Check">
            Press it when you think the curve has started to overfit. It tells
            you how close you were.
          </InfoTip>
          <button
            type="button"
            onClick={() => {
              setPoints(randomPoints())
              setMessage('')
            }}
          >
            Random data
          </button>
          <button
            type="button"
            onClick={() => {
              setPoints([])
              setMessage('')
            }}
          >
            Clear
          </button>
          <button type="button" onClick={() => setPoints(newSplit(points))}>
            New split
          </button>
          <InfoTip about="New split">
            New split picks a different 30% of the points to hold back as test
            points. The curve is only ever fitted to the training points.
          </InfoTip>
        </div>
        <p aria-live="polite">
          <Mark test={false} /> {training.length} training, <Mark test={true} />{' '}
          {tests} test ({points.length} of {MAX_POINTS})
          {message && `. ${message}`}
        </p>
      </div>
      <p ref={result} className="spot-result" aria-live="polite">
        {said && (
          <>
            <b>{said.title}</b> {said.text}
          </>
        )}
      </p>
      {cap < 20 && (
        <p className="degree-note">
          {cap < 1
            ? 'Needs at least 2 training points to draw a curve. Add points.'
            : `${cap + 1} training points allow up to degree ${cap}. Add points to go higher.`}
        </p>
      )}
      {cap >= 1 && (
        <p className="crossover">
          {/* Opens the Ski Slope on this curve's training error. */}
          <Link
            to="/machines/gradient-descent"
            state={{ fit: fitSurface(training, shown) }}
          >
            See how it got there
          </Link>
        </p>
      )}
    </div>
  )
}
