import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { EXHIBITS } from '../exhibits.ts'
import { tileArt, type Art } from './tileArt.ts'
import { ArtSvg } from './TileArt.tsx'

// How often every preview deals itself new random data.
const STEP_MS = 3200

type Frame = { id: number; arts: (Art | null)[] }

const deal = (id: number): Frame => ({
  id,
  arts: EXHIBITS.map((e) => tileArt(e.slug)),
})

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)')

// The home hero: every exhibit's drawing, all redrawn together with fresh
// random data. Open exhibits link to their page. It stops while the pointer
// or keyboard focus is on the grid, while it's off screen or the tab is
// hidden, and when the visitor presses Pause (until they press Play). With
// reduced motion on it shows still drawings and no button.
export function HeroPreview() {
  const [frames, setFrames] = useState<Frame[]>(() => [deal(0)])
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState({ hover: false, focus: false })
  const [still, setStill] = useState(() => reducedMotion().matches)
  const ref = useRef<HTMLUListElement>(null)
  const stopped = paused || held.hover || held.focus || still

  useEffect(() => {
    const query = reducedMotion()
    const change = () => setStill(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || stopped) return
    let onScreen = true
    let timer: number | undefined

    const tick = () =>
      setFrames((f) => {
        const last = f[f.length - 1]
        return [last, deal(last.id + 1)]
      })

    const sync = () => {
      const run = onScreen && document.visibilityState === 'visible'
      if (run && timer === undefined) timer = window.setInterval(tick, STEP_MS)
      if (!run && timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }

    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    })
    seen.observe(el)
    document.addEventListener('visibilitychange', sync)
    sync()

    return () => {
      seen.disconnect()
      document.removeEventListener('visibilitychange', sync)
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [stopped])

  const newest = frames[frames.length - 1].id

  return (
    <div className="hero-preview">
      <ul
        ref={ref}
        className="preview-grid"
        aria-label="Exhibit previews"
        onMouseEnter={() => setHeld((h) => ({ ...h, hover: true }))}
        onMouseLeave={() => setHeld((h) => ({ ...h, hover: false }))}
        onFocus={() => setHeld((h) => ({ ...h, focus: true }))}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget))
            setHeld((h) => ({ ...h, focus: false }))
        }}
      >
        {EXHIBITS.map((e, i) => {
          const art = frames.map((f) => (
            <ArtSvg
              key={f.id}
              art={f.arts[i]}
              className={
                newest === 0 ? undefined : f.id === newest ? 'is-in' : 'is-out'
              }
            />
          ))
          return (
            <li
              key={e.slug}
              className={`preview-cell wing-${e.wing}`}
              style={{ '--i': i } as CSSProperties}
              aria-hidden={e.open ? undefined : true}
            >
              {e.open ? (
                <Link
                  className="preview-link"
                  to={`/${e.wing}/${e.slug}`}
                  aria-label={e.title}
                >
                  {art}
                </Link>
              ) : (
                art
              )}
            </li>
          )
        })}
      </ul>
      {!still && (
        <button
          type="button"
          className="preview-pause"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Play previews' : 'Pause previews'}
        </button>
      )}
    </div>
  )
}
