import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { InfoTip } from '../../components/InfoTip.tsx'
import { PATTERNS, randomDots, type PatternId } from './data.ts'
import {
  accuracy,
  count,
  grow,
  H,
  halves,
  inBox,
  label,
  leaves,
  MAP,
  splitCount,
  splitLeaf,
  W,
  type Axis,
  type Box,
  type Dot,
  type Labelled,
  type Tree,
} from './tree.ts'

const U = 50 // drawing units per map unit: the map is drawn 500 by 300
const BUDGETS = [3, 5, 8]
const STEP = 0.1
const sx = (x: number) => x * U
const sy = (y: number) => (H - y) * U

const round = (v: number) => Math.round(v / STEP) * STEP
const mid = (b: Box, axis: Axis) =>
  round(axis === 'x' ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2)
const span = (b: Box, axis: Axis): [number, number] =>
  axis === 'x' ? [b.x0, b.x1] : [b.y0, b.y1]
const fixed = (v: number) => v.toFixed(1)

const shapes = ([a, b]: [number, number]) =>
  `${a} ${a === 1 ? 'circle' : 'circles'}, ${b} ${b === 1 ? 'square' : 'squares'}`
const pct = (v: number) => `${Math.round(v * 100)}%`

function Marker({ d }: { d: Dot }) {
  const cls = `${d.kind ? 'square' : 'circle'}${d.test ? ' test' : ''}`
  return d.kind ? (
    <rect
      className={cls}
      x={sx(d.x) - 6}
      y={sy(d.y) - 6}
      width={12}
      height={12}
    />
  ) : (
    <circle className={cls} cx={sx(d.x)} cy={sy(d.y)} r={6.5} />
  )
}

// The cut lines of a tree, each drawn across its own box.
function lines(t: Tree): string {
  if (!t.split) return ''
  const { axis, at, low, high } = t.split
  const b = t.box
  const here =
    axis === 'x'
      ? `M${sx(at)} ${sy(b.y0)}V${sy(b.y1)}`
      : `M${sx(b.x0)} ${sy(at)}H${sx(b.x1)}`
  return here + lines(low) + lines(high)
}

function boxes(t: Labelled): Labelled[] {
  return t.split ? [...boxes(t.split.low), ...boxes(t.split.high)] : [t]
}

type PlotProps = {
  tree: Labelled
  dots: Dot[]
  name: string
  picked?: string | null
  draft?: { axis: Axis; at: number } | null
  sides?: [number, number][] | null // counts on each side of the draft line
  onPick?: (path: string) => void
  svgRef?: React.Ref<SVGSVGElement>
  handlers?: React.SVGProps<SVGSVGElement>
}

function Plot({
  tree,
  dots,
  name,
  picked,
  draft,
  sides,
  onPick,
  svgRef,
  handlers,
}: PlotProps) {
  const paths = leaves(tree).map((l) => l.path)
  const cells = boxes(tree)
  const sel = picked != null ? cells[paths.indexOf(picked)] : null
  return (
    <svg
      ref={svgRef}
      className="split-plot"
      viewBox={`0 0 ${W * U} ${H * U}`}
      role="group"
      aria-label={name}
      {...handlers}
    >
      {cells.map((c, i) => (
        <rect
          key={paths[i]}
          className={`cell ${c.kind ? 'square' : 'circle'}${paths[i] === picked ? ' picked' : ''}`}
          x={sx(c.box.x0)}
          y={sy(c.box.y1)}
          width={sx(c.box.x1) - sx(c.box.x0)}
          height={sy(c.box.y0) - sy(c.box.y1)}
          {...(onPick && {
            tabIndex: 0,
            role: 'button',
            'aria-pressed': paths[i] === picked,
            'aria-label': `Region ${i + 1} of ${cells.length}: ${shapes(c.counts)}, guesses ${c.kind ? 'squares' : 'circles'}. Press Enter to split it.`,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPick(paths[i])
              }
            },
          })}
        />
      ))}
      <path className="cuts" d={lines(tree)} />
      {sel && (
        <rect
          className="outline"
          x={sx(sel.box.x0)}
          y={sy(sel.box.y1)}
          width={sx(sel.box.x1) - sx(sel.box.x0)}
          height={sy(sel.box.y0) - sy(sel.box.y1)}
        />
      )}
      {sel && draft && (
        <path
          className="draft"
          d={
            draft.axis === 'x'
              ? `M${sx(draft.at)} ${sy(sel.box.y0)}V${sy(sel.box.y1)}`
              : `M${sx(sel.box.x0)} ${sy(draft.at)}H${sx(sel.box.x1)}`
          }
        />
      )}
      <g aria-hidden="true">
        {dots.map((d, i) => (
          <Marker key={i} d={d} />
        ))}
      </g>
      <g aria-hidden="true">
        {cells.map((c, i) =>
          c === sel && draft && sides ? null : (
            <Count key={paths[i]} box={c.box} counts={c.counts} />
          ),
        )}
        {sel &&
          draft &&
          sides &&
          halves(sel.box, draft.axis, draft.at).map((b, i) => (
            <Count key={i} box={b} counts={sides[i]} />
          ))}
      </g>
    </svg>
  )
}

// A region's training counts in its top-left corner, if it has room.
function Count({ box, counts }: { box: Box; counts: [number, number] }) {
  const w = sx(box.x1) - sx(box.x0)
  const h = sy(box.y0) - sy(box.y1)
  if (w < 84 || h < 30) return null
  return (
    <text className="count" x={sx(box.x0) + 8} y={sy(box.y1) + 22}>
      {counts[0]}
      <tspan className="circle"> ●</tspan> {counts[1]}
      <tspan className="square"> ■</tspan>
    </text>
  )
}

// The tree as yes/no questions, for the diagram under each map.
function Questions({ t }: { t: Labelled }) {
  if (!t.split)
    return (
      <span className="leaf">
        {t.counts[0] + t.counts[1] === 0
          ? `No points: guesses ${t.kind ? 'squares' : 'circles'}`
          : `${t.kind ? 'Squares' : 'Circles'} (${t.counts[t.kind]} of ${t.counts[0] + t.counts[1]})`}
      </span>
    )
  const { axis, at, low, high } = t.split
  return (
    <>
      <span className="ask">
        {axis} &lt; {fixed(at)}?
      </span>
      <ul>
        <li>
          <span className="said">Yes:</span> <Questions t={low} />
        </li>
        <li>
          <span className="said">No:</span> <Questions t={high} />
        </li>
      </ul>
    </>
  )
}

function Diagram({ title, t }: { title: string; t: Labelled }) {
  return (
    <figure className="tree-diagram">
      <figcaption>{title}</figcaption>
      <div className="tree-list">
        <Questions t={t} />
      </div>
    </figure>
  )
}

const randomPattern = () =>
  PATTERNS[Math.floor(Math.random() * PATTERNS.length)].id

export function SplitArea() {
  const [pattern, setPattern] = useState<PatternId>(randomPattern)
  const [dots, setDots] = useState(() => randomDots(pattern))
  const [budget, setBudget] = useState(5)
  const [history, setHistory] = useState<Tree[]>([{ box: MAP }])
  const [picked, setPicked] = useState<string | null>(null)
  const [axis, setAxis] = useState<Axis>('x')
  const [at, setAt] = useState(W / 2)
  const [raced, setRaced] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef<number | null>(null)
  const result = useRef<HTMLDivElement>(null)
  const sliderId = useId()

  const train = useMemo(() => dots.filter((d) => !d.test), [dots])
  const test = useMemo(() => dots.filter((d) => d.test), [dots])
  const mine = history[history.length - 1]
  const used = splitCount(mine)
  const left = budget - used
  const mineLabelled = useMemo(() => label(mine, train), [mine, train])
  const theirs = useMemo(
    () => (raced ? grow(train, used) : null),
    [raced, train, used],
  )
  const theirsLabelled = useMemo(
    () => theirs && label(theirs, train),
    [theirs, train],
  )
  const box =
    picked != null
      ? leaves(mine).find((l) => l.path === picked)?.box
      : undefined
  const [lo, hi] = box ? span(box, axis) : [0, 0]
  const canCut = !!box && hi - lo >= 2 * STEP
  const sides = box
    ? halves(box, axis, at).map((b) => count(train.filter((d) => inBox(d, b))))
    : null

  // A touch that starts on the picked region drags the line instead of
  // scrolling the page.
  useEffect(() => {
    const el = svg.current!
    const stop = (e: TouchEvent) => {
      if (dragging.current !== null) e.preventDefault()
    }
    el.addEventListener('touchstart', stop, { passive: false })
    el.addEventListener('touchmove', stop, { passive: false })
    return () => {
      el.removeEventListener('touchstart', stop)
      el.removeEventListener('touchmove', stop)
    }
  }, [])

  const pick = (path: string, a = axis) => {
    const b = leaves(mine).find((l) => l.path === path)!.box
    setPicked(path)
    setAt(mid(b, a))
  }

  const toMap = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: H - ((e.clientY - r.top) / r.height) * H,
    }
  }
  const place = (p: { x: number; y: number }) => {
    if (!box) return
    const v = axis === 'x' ? p.x : p.y
    setAt(Math.min(hi - STEP, Math.max(lo + STEP, round(v))))
  }

  const reset = () => {
    setHistory([{ box: MAP }])
    setPicked(null)
    setRaced(false)
  }
  const newData = (id: PatternId) => {
    setPattern(id)
    setDots(randomDots(id))
    reset()
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || raced || left <= 0) return
    const p = { ...toMap(e), kind: 0 as const, test: false }
    if (box && inBox(p, box)) {
      dragging.current = e.pointerId
      e.currentTarget.setPointerCapture(e.pointerId)
      place(p)
      return
    }
    const leaf = leaves(mine).find((l) => inBox(p, l.box))
    if (leaf) pick(leaf.path)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current === e.pointerId) place(toMap(e))
  }
  const endDrag = () => (dragging.current = null)

  const cut = () => {
    if (!box || !canCut) return
    setHistory([...history, splitLeaf(mine, picked!, axis, at)])
    setPicked(null)
  }

  // The training score as it is, or as it would be with the line placed.
  const trial = canCut ? splitLeaf(mine, picked!, axis, at) : mine
  const score = accuracy(trial, train, train)
  const placing = !raced && !!box && left > 0

  const startRace = () => {
    setRaced(true)
    setPicked(null)
    requestAnimationFrame(() =>
      result.current?.scrollIntoView({ block: 'nearest' }),
    )
  }

  const words =
    axis === 'x' ? (['Left', 'Right'] as const) : (['Bottom', 'Top'] as const)

  const you = accuracy(mine, train, test)
  const them = theirs ? accuracy(theirs, train, test) : 0
  const verdict =
    you > them
      ? 'You beat the tree.'
      : you < them
        ? 'The tree wins this one.'
        : "It's a draw."

  return (
    <div className="split-area">
      <p className="split-prompt">
        <b>Split the circles from the squares.</b> Tap a region, slide the line
        to where it divides them best, then press <b>Split</b>. When you're
        done, race a real decision tree on test points that neither of you has
        seen.
      </p>
      <div className="split-bars">
        <div className="tree-bar" role="group" aria-label="Pattern">
          <span>Pattern</span>
          <InfoTip about="Pattern">
            Sets how the circles and squares are laid out. Blobs is the easiest
            to split with straight lines. Ring and Checkerboard are harder. New
            points draws the same pattern again.
          </InfoTip>
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === pattern}
              onClick={() => newData(p.id)}
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() => newData(pattern)}
          >
            New points
          </button>
        </div>
        <div className="tree-bar" role="group" aria-label="Splits allowed">
          <span>Splits allowed</span>
          <InfoTip about="Splits allowed">
            How many cuts you get. The real tree gets the same number, so the
            race is fair. Changing it starts over.
          </InfoTip>
          {BUDGETS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n === budget}
              onClick={() => {
                setBudget(n)
                reset()
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="split-mine">
        <h3>Your splits</h3>
        <Plot
          tree={mineLabelled}
          dots={raced ? dots : train}
          name={`Your map, with ${used} ${used === 1 ? 'split' : 'splits'}. Tap a region to split it, then drag the line.`}
          picked={raced ? null : picked}
          draft={canCut ? { axis, at } : null}
          sides={canCut ? sides : null}
          onPick={raced || left <= 0 ? undefined : (p) => pick(p)}
          svgRef={svg}
          handlers={{
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
          }}
        />
      </div>
      <div className="split-theirs">
        <h3>The real tree's splits</h3>
        {theirsLabelled ? (
          <Plot
            tree={theirsLabelled}
            dots={dots}
            name={`The real tree's map, with ${splitCount(theirs!)} splits.`}
          />
        ) : (
          <p className="split-waiting">Shows here after the race.</p>
        )}
      </div>
      <div className="split-controls">
        {placing && (
          <>
            <div className="tree-bar" role="group" aria-label="Line direction">
              <span>Cut</span>
              <InfoTip about="Cut">
                Left and right cuts with an up-and-down line. Top and bottom
                cuts with a level line. A decision tree can only cut straight
                across, never at an angle.
              </InfoTip>
              {(['x', 'y'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={a === axis}
                  onClick={() => {
                    setAxis(a)
                    setAt(mid(box, a))
                  }}
                >
                  {a === 'x' ? 'Left and right' : 'Top and bottom'}
                </button>
              ))}
            </div>
            {canCut ? (
              <div className="split-slider">
                <label htmlFor={sliderId}>
                  {axis} &lt; {fixed(at)}
                </label>
                <InfoTip about="the slider and Split">
                  Slide to move the line, then press Split to cut the region in
                  two. Each side takes the shape that most of its points have.
                </InfoTip>
                <input
                  id={sliderId}
                  type="range"
                  min={round(lo + STEP)}
                  max={round(hi - STEP)}
                  step={STEP}
                  value={at}
                  onChange={(e) => setAt(Number(e.target.value))}
                />
                <button type="button" className="split-go" onClick={cut}>
                  Split
                </button>
              </div>
            ) : (
              <p className="split-note">
                This region is too thin to cut this way.
              </p>
            )}
            {sides && canCut && (
              <p className="visually-hidden" aria-live="polite">
                {words[0]}: {shapes(sides[0])}. {words[1]}: {shapes(sides[1])}.
              </p>
            )}
          </>
        )}
        {!raced && (
          <p className="split-score" aria-live="polite">
            Training points right: {pct(score)}
          </p>
        )}
        <div className="split-count">
          <p>
            {raced
              ? `You used ${used} of ${budget} splits.`
              : left > 0
                ? `${used} of ${budget} splits used.${box ? '' : ' Tap a region to split it.'}`
                : `All ${budget} splits used. Race the tree, or undo one.`}
          </p>
          {!raced && used > 0 && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setHistory(history.slice(0, -1))
                setPicked(null)
              }}
            >
              Undo
            </button>
          )}
          {used > 0 && (
            <button type="button" className="text-button" onClick={reset}>
              {raced ? 'Try again' : 'Start over'}
            </button>
          )}
        </div>
        {!raced && used > 0 && (
          <div className="info-row">
            <button type="button" className="split-race" onClick={startRace}>
              Race the tree
            </button>
            <InfoTip about="Race the tree">
              A real decision tree makes the same number of splits. It picks
              each one by how cleanly it separates the shapes (its Gini
              impurity). Then you're both scored on test points neither of you
              has seen.
            </InfoTip>
          </div>
        )}
      </div>
      <div ref={result} className="split-result" aria-live="polite">
        {raced && theirs && (
          <>
            <p>
              <b>{verdict}</b> On the {test.length} test points, you got{' '}
              {pct(you)} right and the tree got {pct(them)}.
            </p>
            <p>
              On the {train.length} training points you could both see: you{' '}
              {pct(accuracy(mine, train, train))}, the tree{' '}
              {pct(accuracy(theirs, train, train))}.
              {splitCount(theirs) < used &&
                ` The tree stopped after ${splitCount(theirs)}: no further split helped it.`}
            </p>
          </>
        )}
      </div>
      <div className="split-diagrams">
        <Diagram title="Your tree" t={mineLabelled} />
        {theirsLabelled && <Diagram title="The real tree" t={theirsLabelled} />}
      </div>
    </div>
  )
}
