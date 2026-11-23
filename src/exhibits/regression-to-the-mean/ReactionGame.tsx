import { useEffect, useRef, useState } from 'react'
import { InfoTip } from '../../components/InfoTip.tsx'
import {
  changeAfter,
  coach,
  coachTally,
  extremes,
  luckTimes,
  mean,
  newBests,
  ROUNDS,
  slowerFaster,
  spread,
  TOO_SOON,
  TOP,
} from './game.ts'

type Phase = 'idle' | 'wait' | 'go' | 'early' | 'shown'

const PRAISE = ['Great one!', 'Nice and quick!', "That's the way!"]
const SCOLD = ['Bit slow. Focus!', 'Come on, sharpen up!', 'Stay with it!']
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)]
const times = (n: number) => `${n} ${n === 1 ? 'time' : 'times'}`

export function ReactionGame() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [rounds, setRounds] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [luck, setLuck] = useState<number[] | null>(null)
  const timer = useRef(0)
  const goAt = useRef<number | null>(null)
  const done = rounds.length >= ROUNDS

  // The green is on screen from the next frame; time from then.
  useEffect(() => {
    if (phase !== 'go') return
    const id = requestAnimationFrame((t) => (goAt.current = t))
    return () => cancelAnimationFrame(id)
  }, [phase])

  useEffect(() => {
    const t = timer
    return () => clearTimeout(t.current)
  }, [])

  function press(stamp: number) {
    if (done) return
    if (phase === 'wait') {
      clearTimeout(timer.current)
      setPhase('early')
    } else if (phase === 'go') {
      const t = goAt.current === null ? 0 : Math.round(stamp - goAt.current)
      if (t < TOO_SOON) return setPhase('early')
      const next = [...rounds, t]
      const v = coach(next, next.length - 1)
      setRounds(next)
      setNote(v === 'praise' ? pick(PRAISE) : v === 'scold' ? pick(SCOLD) : '')
      setPhase('shown')
    } else {
      goAt.current = null
      setPhase('wait')
      timer.current = window.setTimeout(
        () => setPhase('go'),
        1000 + Math.random() * 3000,
      )
    }
  }

  // Space (or Enter) plays too, unless another control has the focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat) return
      const t = e.target as HTMLElement
      if (t !== document.body && !t.classList.contains('rm-panel')) return
      e.preventDefault()
      press(e.timeStamp)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function again() {
    setRounds([])
    setLuck(null)
    setNote('')
    setPhase('idle')
  }

  const last = rounds.at(-1)
  const said =
    phase === 'idle'
      ? 'Tap here to start'
      : phase === 'wait'
        ? 'Wait for green…'
        : phase === 'go'
          ? 'Tap!'
          : phase === 'early'
            ? 'Too soon. Tap to try that round again.'
            : `${last} ms`
  const round =
    phase === 'idle' ? 1 : phase === 'shown' ? rounds.length : rounds.length + 1

  return (
    <div className="rm">
      <p className="rm-prompt">
        <b>Is your best round skill or luck?</b> Tap the panel as soon as it
        turns green. 30 rounds, and a coach will tell you how you're doing.
      </p>
      <div className="rm-count">
        <span>
          Round {round} of {ROUNDS}
        </span>
        <InfoTip about="the panel">
          Wait for green, then tap, click or press Space. Tapping early doesn't
          count; you just redo that round.
        </InfoTip>
      </div>
      <button
        type="button"
        className={`rm-panel ${phase}`}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          press(e.timeStamp)
        }}
      >
        <span className={phase === 'shown' ? 'rm-big' : undefined}>{said}</span>
        {phase === 'idle' && <small>(or press Space)</small>}
        {phase === 'shown' && note && <span>{note}</span>}
        {phase === 'shown' && !done && <small>Tap for the next round</small>}
      </button>
      <p className="visually-hidden" aria-live="assertive">
        {phase === 'shown' ? `${last} ms. ${note}` : said}
      </p>
      {rounds.length > 0 && <Chart rounds={rounds} luck={luck} done={done} />}
      {done && <Summary rounds={rounds} luck={luck} />}
      {done && (
        <div className="rm-end">
          {!luck && (
            <span className="info-row">
              <button
                type="button"
                className="split-go"
                onClick={() =>
                  setLuck(
                    luckTimes(
                      mean(rounds),
                      spread(rounds),
                      ROUNDS,
                      Math.random,
                    ),
                  )
                }
              >
                Play 30 rounds of pure luck
              </button>
              <InfoTip about="pure luck">
                A pretend player with no skill at all. Each time is a random
                roll with your average and spread. If it shows the same pattern,
                the pattern can't be skill.
              </InfoTip>
            </span>
          )}
          <button type="button" className="text-button" onClick={again}>
            Play again
          </button>
        </div>
      )}
    </div>
  )
}

function Summary({
  rounds,
  luck,
}: {
  rounds: number[]
  luck: number[] | null
}) {
  const fast = changeAfter(rounds, extremes(rounds, TOP, true))
  const slow = changeAfter(rounds, extremes(rounds, TOP, false))
  const c = coachTally(rounds)
  const lucky = luck && changeAfter(luck, extremes(luck, TOP, true))
  return (
    <div className="rm-summary" aria-live="polite">
      <p>
        <b>
          After your {TOP} fastest rounds, you were {slowerFaster(fast)} on
          average. After your {TOP} slowest, you were {slowerFaster(slow)}.
        </b>
      </p>
      <p>
        The coach praised you {times(c.praised)}, and you got slower{' '}
        {c.slowerAfter} of those times. It told you off {times(c.scolded)}, and
        you got faster {c.fasterAfter} of those times. Praise didn't make you
        worse and telling off didn't help. Your best rounds had some luck in
        them, and luck doesn't last.
      </p>
      {lucky !== null && (
        <p>
          {lucky > 0 && 'Pure luck shows the same pattern. '}After its {TOP}{' '}
          fastest rounds, it was {slowerFaster(lucky)} on average. It rolled its
          times at random, with your average and spread.
        </p>
      )}
    </div>
  )
}

const W = 600
const H = 260
const PAD = 16
const TOPPAD = 30

// A line between two dots, stopping short of both so the arrowhead shows.
function arrow(x1: number, y1: number, x2: number, y2: number) {
  const d = Math.hypot(x2 - x1, y2 - y1) || 1
  const [ux, uy] = [(x2 - x1) / d, (y2 - y1) / d]
  return { x1: x1 + ux * 8, y1: y1 + uy * 8, x2: x2 - ux * 7, y2: y2 - uy * 7 }
}

function Chart({
  rounds,
  luck,
  done,
}: {
  rounds: number[]
  luck: number[] | null
  done: boolean
}) {
  const all = [...rounds, ...(luck ?? [])]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const span = Math.max(40, hi - lo)
  const x = (i: number) => PAD + (i / (ROUNDS - 1)) * (W - 2 * PAD)
  // Lower is faster: quick rounds sit near the bottom.
  const y = (v: number) =>
    H - PAD - ((v - lo + span * 0.05) / (span * 1.1)) * (H - PAD - TOPPAD)
  const line = (vs: number[]) =>
    'M' + vs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('L')
  const avg = mean(rounds)

  // While playing: the latest new best, and the round after it.
  const best = newBests(rounds).at(-1)
  const after = best !== undefined ? rounds[best + 1] : undefined
  // Picked out in colour, each with an arrow to the round after it: at the
  // end the fastest rounds, while playing the latest best.
  const fastest = done
    ? extremes(rounds, TOP, true)
    : best !== undefined
      ? [best]
      : []
  const first = rounds.indexOf(Math.min(...rounds))
  const label = (i: number, text: string) => {
    const tx = Math.min(W - PAD, Math.max(PAD, x(i)))
    // Runs right from dots in the left half and left from the rest, so it
    // fits even at the bigger phone text size.
    const anchor = tx < W / 2 ? 'start' : 'end'
    return (
      <text
        className="rm-label"
        x={tx}
        y={y(rounds[i]) - 12}
        textAnchor={anchor}
      >
        {text}
      </text>
    )
  }

  return (
    <figure className="nn-chart rm-chart">
      <figcaption>
        <span>Your reaction time each round (lower is faster)</span>
        {luck && (
          <span className="nn-key" aria-hidden="true">
            <span className="train">You</span>
            <span className="test">Pure luck</span>
          </span>
        )}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Chart of your ${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'}. Average ${Math.round(avg)} ms. Fastest ${rounds[first]} ms${first + 1 < rounds.length ? `, then ${rounds[first + 1]} ms the round after` : ''}.`}
      >
        <defs>
          <marker
            id="rm-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path className="rm-head" d="M0,0L10,5L0,10z" />
          </marker>
        </defs>
        <line
          className="axis"
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
        />
        <line
          className="rm-avg"
          x1={PAD}
          y1={y(avg)}
          x2={W - PAD}
          y2={y(avg)}
        />
        {luck && <path className="test" d={line(luck)} />}
        <path className="train" d={line(rounds)} />
        {fastest
          .filter((i) => i + 1 < rounds.length)
          .map((i) => (
            <line
              key={i}
              className="rm-arrow"
              {...arrow(x(i), y(rounds[i]), x(i + 1), y(rounds[i + 1]))}
              markerEnd="url(#rm-arrow)"
            />
          ))}
        {rounds.map((v, i) => (
          <circle
            key={i}
            className={fastest.includes(i) ? 'rm-fast' : 'rm-dot'}
            cx={x(i)}
            cy={y(v)}
            r={fastest.includes(i) ? 6 : 4}
          />
        ))}
        {/* Drawn after the lines, so its outline keeps it readable. */}
        <text
          className="rm-avg-label"
          x={W - PAD}
          y={y(avg) - 6}
          textAnchor="end"
        >
          Your average
        </text>
        {!done &&
          best !== undefined &&
          (after === undefined
            ? label(best, 'Your best so far')
            : label(
                best + 1,
                `Next round: ${slowerFaster(after - rounds[best])}`,
              ))}
      </svg>
    </figure>
  )
}
