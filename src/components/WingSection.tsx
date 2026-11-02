import { Link } from 'react-router'
import { WINGS, wingExhibits, type WingId } from '../exhibits.ts'

// A wing's coloured header and its exhibit tiles. Only open exhibits link.
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

  return (
    <section className={`wing wing-${wing}`}>
      <div className="wing-head">
        <div>
          <Heading>
            {heading === 'h2' ? (
              <Link to={`/${wing}`}>{WINGS[wing].title}</Link>
            ) : (
              WINGS[wing].title
            )}
          </Heading>
          <p>{WINGS[wing].intro}</p>
        </div>
        <span>
          {exhibits.length} exhibits, {open} open
        </span>
      </div>
      <ul className="tiles">
        {exhibits.map((e) => (
          <li key={e.slug} className="tile">
            <div className="tile-art" aria-hidden="true" />
            <h3>
              {e.open ? (
                <Link to={`/${wing}/${e.slug}`}>{e.title}</Link>
              ) : (
                e.title
              )}
            </h3>
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
