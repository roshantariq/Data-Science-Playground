import { useEffect, useMemo, useRef, useState } from 'react'
import { PATTERNS, randomPoints, type PatternId } from './data.ts'
import { paint, rgb } from './draw.ts'
import {
  accuracy,
  createNet,
  epoch,
  loss,
  neuronMaps,
  type Net,
  type Point,
} from './net.ts'

const N = 100 // cells across each map
const PER_FRAME = 2 // epochs per screen refresh
const SLOW = 500 // ms between redraws with reduced motion on
const S = 400 // drawing units across the points layer
const sx = (x: number) => ((x + 1) / 2) * S
const sy = (y: number) => ((1 - y) / 2) * S
const pct = (v: number) => `${Math.round(v * 100)}%`

type History = { train: number[]; test: number[] }
type Model = { net: Net; history: History }

const split = (pts: Point[]) => [
  pts.filter((p) => !p.test),
  pts.filter((p) => p.test),
]

// A network with fresh random weights, and its loss before any training.
function fresh(pts: Point[], layers: number, width: number): Model {
  const net = createNet(Array(layers).fill(width))
  const [train, test] = split(pts)
  return {
    net,
    history: { train: [loss(net, train)], test: [loss(net, test)] },
  }
}

// The theme's colours. The variables hold light/dark pairs, so each is
// resolved through a hidden probe element whose computed colour is a plain
// rgb() value.
function colours(probe: HTMLElement) {
  const css = (name: string) => {
    probe.style.color = `var(${name})`
    return rgb(getComputedStyle(probe).color)
  }
  return {
    surface: css('--surface'),
    circle: css('--machines-mark'),
    square: css('--feel-mark'),
    ink: css('--text'),
  }
}

// Paints the big map (the picked neuron, or the output) and then each small
// map, in the order their canvases appear on the page.
function paintAll(
  host: HTMLElement,
  probe: HTMLElement,
  maps: Float32Array[],
  picked: number | null,
) {
  const c = colours(probe)
  const out = maps.length - 1
  const [big, ...small] = Array.from(host.querySelectorAll('canvas'))
  const show = (cv: HTMLCanvasElement, i: number) => {
    const ctx = cv.getContext('2d')
    if (!ctx || !maps[i]) return
    if (i === out) paint(ctx, maps[i], N, c.surface, c.circle, c.square)
    else paint(ctx, maps[i], N, c.surface, null, c.ink)
  }
  show(big, picked ?? out)
  small.forEach(show)
}

function Marker({ p }: { p: Point }) {
  const cls = `${p.kind ? 'square' : 'circle'}${p.test ? ' test' : ''}`
  return p.kind ? (
    <rect
      className={cls}
      x={sx(p.x) - 4.5}
      y={sy(p.y) - 4.5}
      width={9}
      height={9}
    />
  ) : (
    <circle className={cls} cx={sx(p.x)} cy={sy(p.y)} r={5} />
  )
}

// Training and test loss after each epoch, thinned to at most about 250
// points per line. No numbers on the axis, as in the Overfitting chart.
function LossChart({ history }: { history: History }) {
  const { train, test } = history
  const W = 500
  const H = 200
  const PAD = 12
  const step = Math.max(1, Math.ceil(train.length / 250))
  const idx: number[] = []
  for (let i = 0; i < train.length; i += step) idx.push(i)
  if (idx.at(-1) !== train.length - 1) idx.push(train.length - 1)
  const top = Math.max(0.1, ...idx.map((i) => Math.max(train[i], test[i])))
  const span = Math.max(100, train.length - 1)
  const x = (i: number) => PAD + (i / span) * (W - 2 * PAD)
  const y = (v: number) => PAD + (1 - v / top) * (H - 2 * PAD)
  const line = (vs: number[]) =>
    'M' + idx.map((i) => `${x(i).toFixed(1)},${y(vs[i]).toFixed(1)}`).join('L')
  const last = train.length - 1
  return (
    <figure className="nn-chart">
      <figcaption>
        <span>Loss at each epoch (lower is better)</span>
        <span className="nn-key" aria-hidden="true">
          <span className="train">Training</span>
          <span className="test">Test</span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Loss chart. After ${last} ${last === 1 ? 'epoch' : 'epochs'}, training loss is ${train[last].toFixed(2)} and test loss is ${test[last].toFixed(2)}.`}
      >
        <line
          className="axis"
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
        />
        <path className="train" d={line(train)} />
        <path className="test" d={line(test)} />
      </svg>
    </figure>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  less,
  more,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  less: string
  more: string
  onChange: (v: number) => void
}) {
  return (
    <div className="tree-bar" role="group" aria-label={label}>
      <span>{label}</span>
      <button
        type="button"
        aria-label={less}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output className="nn-value">{value}</output>
      <button
        type="button"
        aria-label={more}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

export function NetPeek() {
  const [pattern, setPattern] = useState<PatternId>('spirals')
  const [points, setPoints] = useState(() => randomPoints('spirals'))
  const [layers, setLayers] = useState(2)
  const [width, setWidth] = useState(6)
  const [model, setModel] = useState(() => fresh(points, 2, 6))
  const [running, setRunning] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [theme, setTheme] = useState(0) // bumped when the theme changes
  const host = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLSpanElement>(null)

  const [train, test] = useMemo(() => split(points), [points])
  const maps = useMemo(() => neuronMaps(model.net, N), [model])
  const right = useMemo(
    () => [accuracy(model.net, train), accuracy(model.net, test)],
    [model, train, test],
  )
  const epochs = model.history.train.length - 1

  useEffect(() => {
    const bump = () => setTheme((t) => t + 1)
    const watch = new MutationObserver(bump)
    watch.observe(document.documentElement, { attributeFilter: ['data-theme'] })
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', bump)
    return () => {
      watch.disconnect()
      scheme.removeEventListener('change', bump)
    }
  }, [])

  useEffect(() => {
    paintAll(host.current!, probe.current!, maps, picked)
  }, [maps, picked, theme])

  // Training: a few epochs per screen refresh on a copy of the network,
  // handed back to be drawn. With reduced motion on, it's handed back only
  // twice a second.
  useEffect(() => {
    if (!running) return
    const slow = matchMedia('(prefers-reduced-motion: reduce)').matches
    const net = structuredClone(model.net)
    const h = {
      train: [...model.history.train],
      test: [...model.history.test],
    }
    const start = performance.now()
    let id = 0
    const tick = (t: number) => {
      for (let i = 0; i < PER_FRAME; i++) {
        epoch(net, train)
        h.train.push(loss(net, train))
        h.test.push(loss(net, test))
      }
      if (!slow || t - start >= SLOW) setModel({ net, history: h })
      else id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [running, model, train, test])

  // Any change to the data or the network stops training and starts again.
  const rebuild = (pts: Point[], l: number, w: number) => {
    setRunning(false)
    setPicked(null)
    setModel(fresh(pts, l, w))
  }
  const newPoints = (id: PatternId) => {
    const pts = randomPoints(id)
    setPattern(id)
    setPoints(pts)
    rebuild(pts, layers, width)
  }

  const neurons = Array.from({ length: layers }, (_, l) =>
    Array.from({ length: width }, (_, j) => l * width + j),
  )
  const where = (i: number, layer = 'layer') =>
    `${layer} ${Math.floor(i / width) + 1}, neuron ${(i % width) + 1}`

  return (
    <div className="nn" ref={host}>
      <span ref={probe} hidden />
      <p className="nn-prompt">
        <b>Teach a network to tell circles from squares.</b> Press <b>Train</b>{' '}
        and watch the shading change as it learns. Each small map is one neuron.
        Tap one to see it on the big map.
      </p>
      <div className="nn-bars">
        <div className="tree-bar" role="group" aria-label="Pattern">
          <span>Pattern</span>
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === pattern}
              onClick={() => newPoints(p.id)}
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() => newPoints(pattern)}
          >
            New points
          </button>
        </div>
        <Stepper
          label="Hidden layers"
          value={layers}
          min={1}
          max={3}
          less="Remove a layer"
          more="Add a layer"
          onChange={(v) => {
            setLayers(v)
            rebuild(points, v, width)
          }}
        />
        <Stepper
          label="Neurons in each layer"
          value={width}
          min={1}
          max={8}
          less="Remove a neuron from each layer"
          more="Add a neuron to each layer"
          onChange={(v) => {
            setWidth(v)
            rebuild(points, layers, v)
          }}
        />
      </div>

      <div className="nn-main">
        <p className="nn-showing">
          {picked === null ? (
            'Showing the whole network'
          ) : (
            <>
              Showing {where(picked)}{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => setPicked(null)}
              >
                Back to the whole network
              </button>
            </>
          )}
        </p>
        <div
          className="nn-map"
          role="img"
          aria-label="Map of the points, circles and squares, shaded by how sure the network is of each shape."
        >
          <canvas width={N} height={N} />
          <svg viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
            {points.map((p, i) => (
              <Marker key={i} p={p} />
            ))}
          </svg>
        </div>
        <p className="nn-note">
          Darker shading means the network is more sure.
        </p>
      </div>

      <div className="nn-run">
        <button
          type="button"
          className="split-go"
          onClick={() => setRunning(!running)}
        >
          {running ? 'Pause' : 'Train'}
        </button>
        {epochs > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={() => rebuild(points, layers, width)}
          >
            Start over
          </button>
        )}
        <p className="nn-status">
          {epochs === 0 && !running
            ? 'Epoch 0. Press Train to start.'
            : `Epoch ${epochs}. Training points right: ${pct(right[0])}. Test points right: ${pct(right[1])}.`}
        </p>
      </div>

      <div className="nn-side">
        <div className="nn-neurons">
          {neurons.map((row, l) => (
            <div key={l} className="nn-layer">
              <h2>Layer {l + 1}</h2>
              <div className="nn-row">
                {row.map((i) => (
                  <button
                    key={i}
                    type="button"
                    className="nn-neuron"
                    aria-pressed={picked === i}
                    aria-label={`${where(i, 'Layer')}. Shows where it lights up. Press to see it on the big map.`}
                    onClick={() => setPicked(picked === i ? null : i)}
                  >
                    <canvas width={N} height={N} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="nn-layer">
            <h2>Output</h2>
            <div className="nn-row">
              <button
                type="button"
                className="nn-neuron"
                aria-pressed={picked === null}
                aria-label="Output, the whole network. Press to see it on the big map."
                onClick={() => setPicked(null)}
              >
                <canvas width={N} height={N} />
              </button>
            </div>
          </div>
        </div>
        <LossChart history={model.history} />
      </div>
    </div>
  )
}
