import { useEffect, useMemo, useRef, useState } from 'react'
import { column, COLUMNS, level } from './meters.ts'
import { pickSentences } from './sentences.ts'
import {
  roundStats,
  score,
  standing,
  STATS,
  type Key,
  type Sentence,
  type Stat,
} from './stats.ts'

const LENGTHS = [5, 10, 15, 20]
const NAMES: Record<Stat, string> = {
  speed: 'Speed',
  accuracy: 'Accuracy',
  steadiness: 'Steadiness',
  touch: 'Touch',
  rollover: 'Rollover',
  wordstarts: 'Word starts',
}

// Letters, space and Backspace are kept; any other key (Shift, arrows...) is
// a break, so no gap is measured across it.
const keyName = (key: string) =>
  /^[a-z]$/i.test(key)
    ? key.toLowerCase()
    : key === ' ' || key === 'Backspace'
      ? key
      : null

export function TypingRound() {
  const [round, setRound] = useState(() => pickSentences(10))
  const [done, setDone] = useState<Sentence[]>([])
  const [typed, setTyped] = useState('')
  const [measured, setMeasured] = useState(false)
  const [started, setStarted] = useState(false) // focus the box only once someone picks
  const input = useRef<HTMLInputElement>(null)
  // Key timings and letters stay in page memory only.
  const keys = useRef<Key[]>([])
  const held = useRef(new Map<string, NonNullable<Key>>()) // by e.code, until released
  const meters = useRef<HTMLSpanElement[]>([])

  // Kick a key's meter up, then let it fall back like a mixer's level meter.
  function kick(key: string, gap: number | null) {
    const el = meters.current[column(key)]
    if (!el) return
    const up = `scaleY(${level(gap)})`
    el.getAnimations().forEach((a) => a.cancel())
    if (matchMedia('(prefers-reduced-motion: reduce)').matches)
      el.style.transform = up
    else
      el.animate([{ transform: up }, { transform: 'scaleY(0)' }], {
        duration: 700,
        easing: 'ease-in',
        fill: 'forwards',
      })
  }
  const index = done.length
  const finished = index === round.length
  const target = round[index] ?? ''

  // Releases can land after a sentence moves on, so listen on the whole window.
  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      const k = held.current.get(e.code)
      if (k) k.up = e.timeStamp
      held.current.delete(e.code)
    }
    window.addEventListener('keyup', up)
    return () => window.removeEventListener('keyup', up)
  }, [])

  // At the end, wait (up to a second) for the last key to be released.
  useEffect(() => {
    if (!finished) return
    let tries = 0
    const check = () => {
      if (held.current.size === 0 || tries++ >= 20) setMeasured(true)
      else timer = setTimeout(check, 50)
    }
    let timer = setTimeout(check, 0)
    return () => clearTimeout(timer)
  }, [finished])

  const result = useMemo(() => {
    const s = measured ? roundStats(done) : null
    return s && { s, st: standing(s, round.length) }
  }, [measured, done, round.length])

  function start(n: number) {
    setRound(pickSentences(n))
    setDone([])
    setTyped('')
    setMeasured(false)
    keys.current = []
    held.current.clear()
    setStarted(true)
    input.current?.focus()
  }

  return (
    <div className="typing">
      <div className="typing-bar">
        <div role="group" aria-label="Sentences in a round">
          <span>Sentences</span>
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n === round.length}
              onClick={() => start(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p aria-live="polite">
          {finished
            ? `All ${round.length} sentences done`
            : `Sentence ${index + 1} of ${round.length}`}
        </p>
        <ol className="typing-dots" aria-hidden="true">
          {round.map((s, i) => (
            <li key={s} className={i < index ? 'done' : undefined} />
          ))}
        </ol>
      </div>

      {!finished ? (
        <section className="typing-card">
          <p
            className="typing-target"
            aria-label={`Sentence to type: ${target}`}
          >
            {[...target].map((c, i) => (
              <span
                key={i}
                className={
                  i < typed.length
                    ? typed[i].toLowerCase() === c
                      ? 'ok'
                      : 'wrong'
                    : i === typed.length
                      ? 'next'
                      : undefined
                }
              >
                {c}
              </span>
            ))}
          </p>
          <label htmlFor="typing">
            A round is {round.length} sentences. Each one moves on by itself
            when you finish it. Backspace is fine.
          </label>
          <input
            id="typing"
            ref={input}
            autoFocus={started}
            type="text"
            value={typed}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.repeat) return
              const name = keyName(e.key)
              if (!name) return void keys.current.push(null)
              const k = { key: name, down: e.timeStamp, up: NaN }
              const last = keys.current.findLast(Boolean)
              kick(name, last ? k.down - last.down : null)
              keys.current.push(k)
              held.current.set(e.code, k)
            }}
            onChange={(e) => {
              const v = e.target.value
              if (v.length < target.length) return setTyped(v)
              setDone([...done, { target, typed: v, keys: keys.current }])
              keys.current = []
              setTyped('')
            }}
          />
          <figure className="typing-meters">
            <div aria-hidden="true">
              {COLUMNS.map((c, i) => (
                <div key={c}>
                  <span>
                    <span ref={(el) => void (meters.current[i] = el!)} />
                  </span>
                  <small>{c}</small>
                </div>
              ))}
            </div>
            <figcaption>
              One meter per column of your keyboard. The quicker a key comes,
              the higher its meter jumps.
            </figcaption>
          </figure>
        </section>
      ) : (
        <section className="typing-card">
          {!measured ? (
            <p>Working out your stats…</p>
          ) : result ? (
            <>
              <p>Score: {Math.round(score(result.st))} out of 100</p>
              <ul>
                {STATS.map((k) => (
                  <li key={k}>
                    {NAMES[k]}: {result.s[k].toFixed(3)}, better than{' '}
                    {Math.round(result.st[k])}% of typists in the study
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>That round was too short to measure. Try another.</p>
          )}
          <button type="button" onClick={() => start(round.length)}>
            Type another round
          </button>
        </section>
      )}

      <p className="typing-note">
        Just for fun. Your rhythm says a lot about how you type, but it's no
        password. Nothing you type leaves your browser.
      </p>
    </div>
  )
}
