import { useEffect, useRef, useState } from 'react'
import type { Point } from './fit.ts'
import {
  addPoint,
  HEIGHT,
  MAX_POINTS,
  movePoint,
  pointAt,
  randomPoints,
  removePoint,
  WIDTH,
} from './points.ts'

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
  const [points, setPoints] = useState<Point[]>(() => randomPoints())
  const [message, setMessage] = useState('')
  const [scale, setScale] = useState(1) // grid units per CSS pixel
  const svg = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)

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
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={6 * scale}
            tabIndex={0}
            aria-label={`Point ${i + 1}. Arrow keys move it, Delete removes it.`}
            onKeyDown={(e) => onKeyDown(e, i)}
          />
        ))}
      </svg>
      <div className="point-controls">
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
        <p aria-live="polite">
          {points.length} of {MAX_POINTS} points{message && `. ${message}`}
        </p>
      </div>
    </div>
  )
}
