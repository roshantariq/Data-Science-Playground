import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Spinner } from '../../components/Spinner.tsx'
import { play, type Player, type Style, type Tone } from './audio.ts'
import type { CsvResult } from './csv.worker.ts'
import {
  NOTE_INSTRUMENTS,
  SLIDE_INSTRUMENTS,
  type Instrument,
  type NoteInstrument,
  type SlideInstrument,
} from './instruments.ts'
import { CREDITS, load, type Recorded } from './recordings.ts'
import samples from './samples.json'
import {
  madeUp,
  MAX_BYTES,
  range,
  steps,
  TYPING,
  typingDataset,
  type Dataset,
} from './sound.ts'

const SPEEDS = [
  { name: 'Slow', perSecond: 4 },
  { name: 'Normal', perSecond: 8 },
  { name: 'Fast', perSecond: 16 },
]
const STYLES: { id: Style; name: string }[] = [
  { id: 'notes', name: 'Notes' },
  { id: 'slide', name: 'Slide' },
]
const PITCHES = [
  { name: 'Low', octave: -1 },
  { name: 'Middle', octave: 0 },
  { name: 'High', octave: 1 },
]
const UPLOAD = 'upload'
type Sound = { instrument: NoteInstrument | SlideInstrument; octave: number }

const FAILED: Record<string, string> = {
  size: 'That file is bigger than 5 MB. Try a smaller one.',
  rows: 'That file has more than 50,000 rows. Try a smaller one.',
  numbers:
    "No column in that file is mostly numbers, so there's nothing to play.",
  unreadable: "That file couldn't be read as a CSV.",
  instrument:
    "That instrument couldn't be loaded. Check your connection and try again.",
}

const listOf = (style: Style): readonly Instrument[] =>
  style === 'notes' ? NOTE_INSTRUMENTS : SLIDE_INSTRUMENTS
const recordingOf = (style: Style, id: string) =>
  listOf(style).find((i) => i.id === id)?.recording

const fmt = (v: number) =>
  Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : String(+v.toFixed(2))

export function SoundOfData() {
  const [made] = useState(() => madeUp()) // new made-up data each load
  // Timings handed over by Typing Rhythm's link, if any. They live only in
  // this page's memory: the hand-over is then cleared, so a refresh starts
  // as normal.
  const location = useLocation()
  const navigate = useNavigate()
  const [typing] = useState(() =>
    typingDataset((location.state as { typing?: unknown } | null)?.typing),
  )
  useEffect(() => {
    if (location.state) void navigate('.', { replace: true, state: null })
  }, [location.state, navigate])
  const [upload, setUpload] = useState<Dataset | null>(null)
  const [id, setId] = useState(typing ? TYPING : 'nyc')
  const [col, setCol] = useState(0)
  const [style, setStyle] = useState<Style>('notes')
  const [speed, setSpeed] = useState(1)
  const [instrument, setInstrument] = useState<{
    notes: NoteInstrument
    slide: SlideInstrument
  }>({ notes: 'simple', slide: 'simple' })
  const [pitch, setPitch] = useState(1)
  const [tone, setTone] = useState<Tone>({ bass: 0, treble: 0, reverb: 0.2 })
  const [pos, setPos] = useState(-1) // the step being played, -1 before the start
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false) // a recording is downloading
  const [problem, setProblem] = useState('')
  const player = useRef<Player | null>(null)
  const ticket = useRef(0) // a newer start or a stop cancels a pending one
  const file = useRef<HTMLInputElement>(null)
  const dataId = useId()
  const colId = useId()
  const instrumentId = useId()
  const bassId = useId()
  const trebleId = useId()
  const reverbId = useId()

  const all: Dataset[] = [
    ...samples,
    ...made,
    ...(typing ? [typing] : []),
    ...(upload ? [upload] : []),
  ]
  const data = all.find((d) => d.id === id) ?? all[0]
  const column = data.columns[Math.min(col, data.columns.length - 1)]
  const s = steps(column.values)
  const { lo, hi } = range(s)

  const halt = () => {
    ticket.current++
    player.current?.stop()
    player.current = null
    setPlaying(false)
    setLoading(false)
  }
  useEffect(() => () => player.current?.stop(), [])

  // Changing what plays starts again from the beginning.
  const choose = (next: () => void) => {
    halt()
    setPos(-1)
    next()
  }

  const start = async (
    sound: Sound = {
      instrument: instrument[style],
      octave: PITCHES[pitch].octave,
    },
  ) => {
    const my = ++ticket.current
    const from = pos < 0 || pos >= s.length - 1 ? 0 : pos + 1
    const rec = recordingOf(style, sound.instrument)
    let recording: Recorded | null = null
    if (rec) {
      setLoading(true)
      try {
        recording = await load(rec)
      } catch {
        if (my === ticket.current) {
          setLoading(false)
          setProblem(FAILED.instrument)
        }
        return
      }
      if (my !== ticket.current) return
      setLoading(false)
    }
    setPlaying(true)
    player.current = play({
      steps: s,
      from,
      style,
      ...sound,
      recording,
      tone,
      perSecond: SPEEDS[speed].perSecond,
      onStep: setPos,
      onEnd: () => {
        player.current = null
        setPlaying(false)
      },
    })
  }

  // A new instrument or pitch carries on from the same place.
  const retune = (sound: Sound) => {
    if (!player.current && !loading) return
    player.current?.stop()
    player.current = null
    void start(sound)
  }
  const changeTone = (t: Partial<Tone>) => {
    const next = { ...tone, ...t }
    setTone(next)
    player.current?.setTone(next)
  }
  const instruments = listOf(style)
  const recording = recordingOf(style, instrument[style])
  const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

  const read = async (f: File) => {
    setProblem('')
    if (f.size > MAX_BYTES) return setProblem(FAILED.size)
    const text = await f.text()
    const worker = new Worker(new URL('./csv.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<CsvResult>) => {
      worker.terminate()
      if (!e.data.ok) return setProblem(FAILED[e.data.reason])
      const columns = e.data.columns
      choose(() => {
        setUpload({ id: UPLOAD, name: f.name.slice(0, 60), columns })
        setId(UPLOAD)
        setCol(0)
      })
    }
    worker.onerror = () => {
      worker.terminate()
      setProblem(FAILED.unreadable)
    }
    worker.postMessage(text)
  }

  const out = s.filter((x) => x.outlier).length
  const grouped = column.values.length > s.length
  const values = column.values
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }

  return (
    <div className="sound">
      <div className="sound-pick">
        <label htmlFor={dataId}>Data</label>
        <select
          id={dataId}
          value={data.id}
          onChange={(e) =>
            choose(() => {
              setId(e.target.value)
              setCol(0)
            })
          }
        >
          <optgroup label="Real data">
            {samples.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Made-up data">
            {made.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </optgroup>
          {typing && (
            <optgroup label="From Typing Rhythm">
              <option value={TYPING}>{typing.name}</option>
            </optgroup>
          )}
          {upload && (
            <optgroup label="Your file">
              <option value={UPLOAD}>{upload.name}</option>
            </optgroup>
          )}
        </select>
        {data.columns.length > 1 && (
          <>
            <label htmlFor={colId}>Column</label>
            <select
              id={colId}
              value={col}
              onChange={(e) => choose(() => setCol(Number(e.target.value)))}
            >
              {data.columns.map((c, i) => (
                <option key={i} value={i}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}
        <button type="button" onClick={() => file.current?.click()}>
          Upload a CSV
        </button>
        <input
          ref={file}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void read(f)
          }}
        />
      </div>
      {problem && (
        <p className="sound-problem" role="alert">
          {problem}
        </p>
      )}

      <BarChart steps={s} lo={lo} hi={hi} pos={pos} name={column.name} />
      <p className="sound-summary">
        {values.length.toLocaleString()} values
        {grouped ? `, played as ${s.length} groups` : ''}. Lowest {fmt(min)},
        highest {fmt(max)}.{' '}
        {out === 0
          ? 'No outliers.'
          : `${out} ${out === 1 ? 'outlier, marked with a dot' : 'outliers, marked with dots'}.`}
      </p>

      <div className="sound-controls">
        <div role="group" aria-label="Sound">
          <span>Sound</span>
          {STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              aria-pressed={style === st.id}
              onClick={() => choose(() => setStyle(st.id))}
            >
              {st.name}
            </button>
          ))}
        </div>
        <div className="sound-field">
          <label htmlFor={instrumentId}>Instrument</label>
          <select
            id={instrumentId}
            value={instrument[style]}
            onChange={(e) => {
              const id = e.target.value as Sound['instrument']
              setInstrument({ ...instrument, [style]: id })
              setProblem('')
              const rec = recordingOf(style, id)
              if (rec) load(rec).catch(() => {}) // start downloading now
              retune({ instrument: id, octave: PITCHES[pitch].octave })
            }}
          >
            {[
              { label: 'Built from tones', recorded: false },
              { label: 'Recordings', recorded: true },
            ].map((group) => (
              <optgroup key={group.label} label={group.label}>
                {instruments
                  .filter((ins) => !!ins.recording === group.recorded)
                  .map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div role="group" aria-label="Speed">
          <span>Speed</span>
          {SPEEDS.map((sp, i) => (
            <button
              key={sp.name}
              type="button"
              aria-pressed={speed === i}
              onClick={() => choose(() => setSpeed(i))}
            >
              {sp.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="sound-play"
          disabled={loading}
          onClick={playing ? halt : () => void start()}
        >
          {loading ? (
            <Spinner />
          ) : playing ? (
            'Pause'
          ) : pos >= 0 && pos < s.length - 1 ? (
            'Resume'
          ) : (
            'Play'
          )}
        </button>
      </div>
      <div className="sound-tone">
        <div role="group" aria-label="Pitch">
          <span>Pitch</span>
          {PITCHES.map((p, i) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={pitch === i}
              onClick={() => {
                setPitch(i)
                retune({ instrument: instrument[style], octave: p.octave })
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="sound-field">
          <label htmlFor={bassId}>Bass {signed(tone.bass)}</label>
          <input
            id={bassId}
            type="range"
            min={-12}
            max={12}
            value={tone.bass}
            aria-valuetext={signed(tone.bass)}
            onChange={(e) => changeTone({ bass: Number(e.target.value) })}
          />
        </div>
        <div className="sound-field">
          <label htmlFor={trebleId}>Treble {signed(tone.treble)}</label>
          <input
            id={trebleId}
            type="range"
            min={-12}
            max={12}
            value={tone.treble}
            aria-valuetext={signed(tone.treble)}
            onChange={(e) => changeTone({ treble: Number(e.target.value) })}
          />
        </div>
        <div className="sound-field">
          <label htmlFor={reverbId}>
            Reverb {Math.round(tone.reverb * 100)}%
          </label>
          <input
            id={reverbId}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={tone.reverb}
            aria-valuetext={`${Math.round(tone.reverb * 100)}%`}
            onChange={(e) => changeTone({ reverb: Number(e.target.value) })}
          />
        </div>
      </div>
      {data.credit && <p className="sound-credit">Data: {data.credit}</p>}
      {recording && (
        <p className="sound-credit">Recording: {CREDITS[recording]}</p>
      )}
    </div>
  )
}

const W = 600
const H = 150
const TOP = 14 // room for the outlier dots

// One thin bar per step, outliers marked with a dot, and a line at the step
// being played.
function BarChart({
  steps: s,
  lo,
  hi,
  pos,
  name,
}: {
  steps: { value: number; outlier: boolean }[]
  lo: number
  hi: number
  pos: number
  name: string
}) {
  const w = W / s.length
  const h = (v: number) =>
    Math.max(2, Math.min(1, Math.max(0, (v - lo) / (hi - lo))) * (H - TOP))
  return (
    <figure className="sound-chart">
      <figcaption>{name}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Bar chart of ${name}, one bar per ${s.length === 400 ? 'group of values' : 'value'}, in order.`}
      >
        {s.map((x, i) => (
          <rect
            key={i}
            className={i === pos ? 'now' : undefined}
            x={i * w + w * 0.15}
            y={H - h(x.value)}
            width={Math.max(w * 0.7, 0.6)}
            height={h(x.value)}
          />
        ))}
        {s.map((x, i) =>
          x.outlier ? (
            <circle
              key={`o${i}`}
              className="outlier"
              cx={i * w + w / 2}
              cy={H - h(x.value) - 6}
              r={4}
            />
          ) : null,
        )}
        {pos >= 0 && (
          <line
            className="playhead"
            x1={pos * w + w / 2}
            y1={0}
            x2={pos * w + w / 2}
            y2={H}
          />
        )}
      </svg>
    </figure>
  )
}
