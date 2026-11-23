import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { InfoTip } from '../../components/InfoTip.tsx'
import { canSave, deleteBest, loadBest, saveBest } from './best.ts'
import {
  bars,
  mistakes,
  noteFreq,
  pauseLimit,
  pct,
  timings,
  type Bar,
} from './rhythm.ts'
import { score, type Sentence, type Stat, type Stats } from './stats.ts'

type Props = {
  sentences: Sentence[]
  stats: Stats
  standing: Stats
  onAgain?: () => void // left out for a sample typist: no best, no Try again
}

// Hexagon order, clockwise from the top; the first three make the score.
const SPOKES: [Stat, string][] = [
  ['speed', 'Speed'],
  ['accuracy', 'Accuracy'],
  ['steadiness', 'Steadiness'],
  ['touch', 'Touch'],
  ['rollover', 'Rollover'],
  ['wordstarts', 'Word starts'],
]

export function Results({ sentences, stats, standing, onAgain }: Props) {
  const { fixed, left } = mistakes(sentences)
  const p = (k: Stat) => <b>{pct(standing[k])}</b>
  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`
  const now = Math.round(score(standing))
  const sample = !onAgain
  const [prev] = useState(() => (sample ? null : loadBest())) // the best before this round
  const better = !prev || now > Math.round(prev.score)
  const [kept] = useState(canSave)
  const [deleted, setDeleted] = useState(false)
  useEffect(() => {
    if (!sample && better && kept) saveBest({ score: now, standing })
  }, [sample, better, kept, now, standing])
  const old = prev && Math.round(prev.score)

  return (
    <div className="results">
      <div className="results-top">
        <div className="results-stats">
          <section>
            <h2>Rhythm score</h2>
            <p className="score">{now}</p>
            <p>
              Made from Speed, Accuracy and Steadiness, out of 100. A round
              that's good at all three scores higher than one that's great at
              just one.
            </p>
            {!sample && (
              <p className="best" aria-live="polite">
                {deleted
                  ? 'Deleted. Nothing is saved now.'
                  : !kept
                    ? "Your browser won't let this page save anything, so your best round can't be kept."
                    : !prev
                      ? 'Saved as your best round so far.'
                      : better
                        ? `New best! Up from ${old}. The dashed outline is your old best.`
                        : `Your best is ${old}, shown as the dashed outline.`}
                {!deleted && kept && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteBest()
                      setDeleted(true)
                    }}
                  >
                    Delete my data
                  </button>
                )}
              </p>
            )}
          </section>
          <section>
            <h2>{sample ? 'In the score' : 'In your score'}</h2>
            <StatRow
              standing={standing}
              k="speed"
              text={<>Faster than {p('speed')} of typists in the study</>}
              note={`${Math.round(stats.speed)} words a minute`}
            />
            <StatRow
              standing={standing}
              k="accuracy"
              text={<>More accurate than {p('accuracy')}</>}
              note={`Backspace ${plural(fixed, 'time', 'times')}, ${plural(left, 'mistake', 'mistakes')} left in`}
            />
            <StatRow
              standing={standing}
              k="steadiness"
              text={<>Steadier than {p('steadiness')}</>}
              note="How even the gaps between your keys are, allowing for harder letter pairs"
            />
          </section>
          <section>
            <h2>
              {sample ? 'Their style' : 'Your style'}{' '}
              <small>not scored, no right answer</small>
            </h2>
            <StatRow
              standing={standing}
              k="touch"
              text={<>Holds keys more evenly than {p('touch')}</>}
              note="How alike your hold times are"
            />
            <StatRow
              standing={standing}
              k="rollover"
              text={
                <>Rolls into the next key more often than {p('rollover')}</>
              }
              note={`${pct(stats.rollover * 100)} of your keys went down before the last one came up`}
            />
            <StatRow
              standing={standing}
              k="wordstarts"
              text={<>Starts words more smoothly than {p('wordstarts')}</>}
              note="How little you slow down at the start of a word"
            />
          </section>
        </div>
        <Hexagon
          standing={standing}
          best={deleted ? undefined : prev?.standing}
        />
      </div>
      <Timeline sentences={sentences} sample={sample} />
      <div className="results-end">
        {onAgain && (
          <button type="button" onClick={onAgain}>
            Try again
          </button>
        )}
        <p>
          Compared with 162,042 typists from the 136M Keystrokes study (Dhakal
          et al., CHI 2018).
        </p>
      </div>
    </div>
  )
}

function StatRow(r: {
  k: Stat
  text: ReactNode
  note: string
  standing: Stats
}) {
  return (
    <div className="stat-row">
      <b>{SPOKES.find((s) => s[0] === r.k)![1]}</b>
      <span>
        {r.text}
        <small>{r.note}</small>
      </span>
      <div className="stat-bar" aria-hidden="true">
        <div style={{ width: `${r.standing[r.k]}%` }} />
      </div>
    </div>
  )
}

const C = 200
const R = 150
const at = (i: number, v: number) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 3
  return `${(C + R * v * Math.cos(a)).toFixed(1)},${(C + R * v * Math.sin(a)).toFixed(1)}`
}

function Hexagon({ standing, best }: { standing: Stats; best?: Stats }) {
  const shape = (s: Stats) =>
    SPOKES.map(([k], i) => at(i, s[k] / 100)).join(' ')
  const said = (s: Stats) =>
    SPOKES.map(([k, n]) => `${n} ${Math.floor(s[k])}`).join(', ')
  return (
    <figure className="hexagon">
      <svg
        viewBox="-150 0 700 400"
        role="img"
        aria-label={`Hexagon of your six stats: ${said(standing)}.${best ? ` Your best round, dashed: ${said(best)}.` : ''}`}
      >
        <g className="rings">
          {[1, 0.75, 0.5, 0.25].map((r) => (
            <polygon
              key={r}
              points={SPOKES.map((_, i) => at(i, r)).join(' ')}
            />
          ))}
          {SPOKES.map((_, i) => (
            <line
              key={i}
              x1={C}
              y1={C}
              x2={at(i, 1).split(',')[0]}
              y2={at(i, 1).split(',')[1]}
              className={i < 3 ? 'scored' : undefined}
            />
          ))}
        </g>
        <polygon className="this" points={shape(standing)} />
        {best && <polygon className="best" points={shape(best)} />}
        {SPOKES.map(([k, n], i) => {
          const [x, y] = at(i, 1.12).split(',').map(Number)
          const anchor =
            Math.abs(x - C) < 1 ? 'middle' : x > C ? 'start' : 'end'
          return (
            <text
              key={k}
              x={x}
              y={y + 6}
              textAnchor={anchor}
              className={i < 3 ? 'scored' : undefined}
            >
              {n} {Math.floor(standing[k])}
            </text>
          )
        })}
      </svg>
      <figcaption>
        Bold spokes make up the score. Further out means you beat more typists.
        {best && ' The dashed line is your best round.'}
      </figcaption>
    </figure>
  )
}

const W = 1130
const TOP = 44
const LOW = 74
const BAR = 22

function Timeline({
  sentences,
  sample,
}: {
  sentences: Sentence[]
  sample: boolean
}) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const limit = useMemo(() => pauseLimit(sentences), [sentences])
  const bs = useMemo(() => bars(sentences[i], limit), [sentences, i, limit])
  const end = Math.max(1, ...bs.map((b) => b.start + b.hold))
  const x = (ms: number) => 10 + (ms / end) * (W - 20)

  const stop = () => {
    void audio.current?.close()
    audio.current = null
    setPlaying(false)
  }
  // Stop when the sentence changes or the results close.
  useEffect(
    () => () => {
      void audio.current?.close()
      audio.current = null
      setPlaying(false)
    },
    [i],
  )

  function play() {
    const ctx = new AudioContext()
    audio.current = ctx
    const out = ctx.createGain()
    out.gain.value = 0.6
    out.connect(ctx.destination)
    const t0 = ctx.currentTime + 0.1
    for (const b of bs) {
      const f = noteFreq(b.key)
      if (!f) continue
      const s = t0 + b.start / 1000
      const e = s + Math.max(b.hold, 60) / 1000
      const vol = b.key === ' ' ? 0.1 : 0.3
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, s)
      g.gain.linearRampToValueAtTime(vol, s + 0.005)
      g.gain.setTargetAtTime(vol * 0.4, s + 0.005, 0.15) // fades while held, like a struck string
      g.gain.setTargetAtTime(0, e, 0.06) // and dies away when let go
      o.connect(g).connect(out)
      o.start(s)
      o.stop(e + 0.5)
    }
    setPlaying(true)
    setTimeout(() => audio.current === ctx && stop(), end + 700)
  }

  const pauses = bs.filter((b) => b.pause).length
  const rolls = bs.filter((b) => b.roll).length
  return (
    <section className="timeline">
      <div className="timeline-head">
        <h2>{sample ? 'Their' : 'Your'} rhythm, key by key</h2>
        <div>
          <button
            type="button"
            className="play"
            onClick={playing ? stop : play}
          >
            {playing ? 'Stop' : 'Play my rhythm'}
          </button>
          {/* Opens Sound of Your Data with the whole round's timings. */}
          <Link
            className="crossover"
            to="/feel/sound-of-your-data"
            state={{
              typing: {
                name: sample ? "A sample typist's typing" : 'Your typing',
                ...timings(sentences),
              },
            }}
          >
            Hear it as data
          </Link>
          <InfoTip about="Play my rhythm and Hear it as data">
            Play my rhythm plays this sentence back as notes, with the timing
            you typed it. Hear it as data opens your whole round in Sound of
            Your Data.
          </InfoTip>
          <span className="nav">
            <button
              type="button"
              aria-label="Previous sentence"
              disabled={i === 0}
              onClick={() => setI(i - 1)}
            >
              ‹
            </button>
            <span>
              Sentence {i + 1} of {sentences.length}
            </span>
            <button
              type="button"
              aria-label="Next sentence"
              disabled={i === sentences.length - 1}
              onClick={() => setI(i + 1)}
            >
              ›
            </button>
          </span>
        </div>
      </div>
      {/* Focusable so keyboard users can scroll it on narrow screens. */}
      <div
        className="timeline-scroll"
        tabIndex={0}
        role="region"
        aria-label="Rhythm timeline, scrolls sideways"
      >
        <svg
          viewBox={`0 0 ${W} 136`}
          role="img"
          aria-label={`Sentence ${i + 1} as ${bs.length} key bars over ${(end / 1000).toFixed(1)} seconds, with ${rolls} rollover keys and ${pauses} long pauses.`}
        >
          {bs.map((b, j) => (
            <Key key={j} b={b} x={x} />
          ))}
        </svg>
      </div>
      <p>
        Each bar is a key: its width is how long you held it, and the space
        before it is the gap since the last key. Bars on the lower line were
        pressed before the last key came up (rollover). Gold bars start a new
        word; light bars are spaces. Play turns each bar into a note: keys on
        the left of the keyboard play low, keys on the right play high.
      </p>
    </section>
  )
}

function Key({ b, x }: { b: Bar; x: (ms: number) => number }) {
  const left = x(b.start)
  const w = Math.max(2, x(b.start + b.hold) - left)
  const kind =
    b.key === ' '
      ? 'space'
      : b.key === 'Backspace'
        ? 'back'
        : b.wordStart
          ? 'start'
          : undefined
  return (
    <>
      {b.pause && (
        <text
          className="pause"
          x={x(b.start - b.gap / 2)}
          y={130}
          textAnchor="middle"
        >
          long pause
        </text>
      )}
      <rect
        className={kind}
        x={left}
        y={b.roll ? LOW : TOP}
        width={w}
        height={BAR}
      />
      {b.key !== ' ' && (
        <text
          x={left + w / 2}
          y={b.roll ? 114 : 32}
          textAnchor="middle"
          className={b.wordStart ? 'start' : undefined}
        >
          {b.key === 'Backspace' ? '⌫' : b.key}
        </text>
      )}
    </>
  )
}
