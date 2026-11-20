import { useState } from 'react'
import { tileArt, type Shape } from './tileArt.ts'

function draw(s: Shape, i: number) {
  const cls = `art-${s.style}`
  if (s.kind === 'circle')
    return <circle key={i} className={cls} cx={s.x} cy={s.y} r={s.r} />
  if (s.kind === 'ellipse')
    return (
      <ellipse key={i} className={cls} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} />
    )
  if (s.kind === 'rect')
    return (
      <rect
        key={i}
        className={cls}
        x={s.x}
        y={s.y}
        width={s.w}
        height={s.h}
        rx={1}
      />
    )
  return <path key={i} className={s.dashed ? `${cls} dashed` : cls} d={s.d} />
}

// A tile's drawing, with fresh random data each time the page loads.
// Decorative: the tile's title and line already say what the exhibit is.
export function TileArt({ slug }: { slug: string }) {
  const [art] = useState(() => tileArt(slug))

  return (
    <svg className="tile-art" viewBox="0 0 160 90" aria-hidden="true">
      {art && (
        <>
          <g className="art-rest">{art.back.map(draw)}</g>
          <g className="art-full">{art.back.map(draw)}</g>
          <g className="art-marks">{art.marks.map(draw)}</g>
        </>
      )}
    </svg>
  )
}
