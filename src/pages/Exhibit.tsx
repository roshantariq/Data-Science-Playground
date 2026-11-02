import { Link, useParams } from 'react-router'
import { EXHIBITS, WINGS, wingExhibits } from '../exhibits.ts'
import { NotFound } from './NotFound.tsx'

export function Exhibit() {
  const { wing, slug } = useParams()
  const exhibit = EXHIBITS.find(
    (e) => e.wing === wing && e.slug === slug && e.open,
  )
  if (!exhibit) return <NotFound />
  const wingTitle = WINGS[exhibit.wing].title

  return (
    <article className={`exhibit wing-${exhibit.wing}`}>
      <Link className="crumb" to={`/${exhibit.wing}`}>
        {wingTitle}
      </Link>
      <h1>{exhibit.title}</h1>
      <div className="placeholder">The exhibit goes here</div>
      <section className="panel">
        <h2>What just happened</h2>
        <p>
          Explains the idea in one paragraph once you have tried the exhibit.
        </p>
      </section>
      <nav className="wing-strip" aria-label={`Exhibits in ${wingTitle}`}>
        <Link to={`/${exhibit.wing}`}>Back to {wingTitle}</Link>
        <ol>
          {wingExhibits(exhibit.wing).map((e) => (
            <li
              key={e.slug}
              className={e === exhibit ? 'here' : undefined}
              aria-current={e === exhibit ? 'page' : undefined}
            >
              {e.open && e !== exhibit ? (
                <Link to={`/${e.wing}/${e.slug}`}>{e.title}</Link>
              ) : (
                <b>{e.title}</b>
              )}
              <span>
                {e === exhibit
                  ? 'You are here'
                  : e.open
                    ? 'Open'
                    : 'Coming soon'}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    </article>
  )
}
