import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/* A small "i" beside a control. Its note shows on hover with a mouse, on Tab
   with a keyboard (Esc hides it), and on tap on a phone, where tapping
   anywhere else closes it. 'auto' leaves it to hover and focus. */
type Mode = 'auto' | 'open' | 'hidden'

export function InfoTip({
  about,
  children,
}: {
  about: string
  children: ReactNode
}) {
  const id = useId()
  const [mode, setMode] = useState<Mode>('auto')
  const box = useRef<HTMLSpanElement>(null)
  const note = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (mode === 'auto') return
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setMode('auto')
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [mode])

  // Shift the note sideways if it would run off the side of the screen, and
  // show it below the "i" if there's no room above.
  const place = () => {
    const n = note.current
    if (!n) return
    n.style.setProperty('--shift', '0px')
    delete n.dataset.below
    if (n.getBoundingClientRect().top < 8) n.dataset.below = ''
    const r = n.getBoundingClientRect()
    const w = document.documentElement.clientWidth
    const shift =
      r.left < 8 ? 8 - r.left : r.right > w - 8 ? w - 8 - r.right : 0
    n.style.setProperty('--shift', `${shift}px`)
  }

  return (
    <span
      ref={box}
      className={`info-tip ${mode}`}
      onPointerEnter={place}
      onPointerLeave={() => mode === 'hidden' && setMode('auto')}
    >
      <button
        type="button"
        className="info-i"
        aria-label={`About ${about}`}
        aria-describedby={id}
        onFocus={place}
        onBlur={() => setMode('auto')}
        onClick={() => {
          place()
          setMode(mode === 'open' ? 'hidden' : 'open')
        }}
        onKeyDown={(e) => e.key === 'Escape' && setMode('hidden')}
      >
        i
      </button>
      <span ref={note} id={id} role="tooltip" className="info-note">
        {children}
      </span>
    </span>
  )
}
