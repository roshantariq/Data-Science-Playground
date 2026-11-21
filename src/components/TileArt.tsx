import { useState } from 'react'
import { tileArt, type Art, type Shape } from './tileArt.ts'

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

// A tile's drawing, with fresh random data each time the page loads. If the
// same drawing is reused for another exhibit (React keeps it when a link
// swaps the page's contents), it draws the new exhibit instead.
export function TileArt({ slug }: { slug: string }) {
  const [drawn, setDrawn] = useState(() => ({ slug, art: tileArt(slug) }))
  if (drawn.slug !== slug) setDrawn({ slug, art: tileArt(slug) })
  return <ArtSvg art={drawn.slug === slug ? drawn.art : null} />
}

// One drawing, shared by the tiles and the hero preview. Decorative: the
// title beside it, or the link around it, says what the exhibit is.
export function ArtSvg({
  art,
  className,
}: {
  art: Art | null
  className?: string
}) {
  return (
    <svg
      className={className ? `tile-art ${className}` : 'tile-art'}
      viewBox="0 0 160 90"
      aria-hidden="true"
    >
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
