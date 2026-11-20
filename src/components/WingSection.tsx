import { Link } from 'react-router'
import { WINGS, wingCount, wingExhibits, type WingId } from '../exhibits.ts'
import { TileArt } from './TileArt.tsx'

// A wing's coloured header and its exhibit tiles. Only open exhibits link,
// and an open tile's title link covers the whole tile.
export function WingSection({
  wing,
  heading = 'h2',
}: {
  wing: WingId
  heading?: 'h1' | 'h2'
}) {
  const exhibits = wingExhibits(wing)
  const open = exhibits.filter((e) => e.open).length
  const Heading = heading
  const TileHeading = heading === 'h1' ? 'h2' : 'h3' // no skipped levels

  return (
    <section className={`wing wing-${wing}`}>
      <div className="wing-head">
        <Heading>
          {heading === 'h2' ? (
            <Link to={`/${wing}`}>{WINGS[wing].title}</Link>
          ) : (
            WINGS[wing].title
          )}
        </Heading>
        <div className="wing-meta">
          <p>{WINGS[wing].intro}</p>
          <span>{wingCount(exhibits.length, open)}</span>
        </div>
      </div>
      <ul className="tiles">
        {exhibits.map((e) => (
          <li key={e.slug} className="tile">
            <TileArt slug={e.slug} />
            <TileHeading>
              {e.open ? (
                <Link className="tile-link" to={`/${wing}/${e.slug}`}>
                  {e.title}
                </Link>
              ) : (
                e.title
              )}
            </TileHeading>
            <p>{e.line}</p>
            <span className={e.open ? 'status open' : 'status soon'}>
              {e.open ? 'Open' : 'Coming soon'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
