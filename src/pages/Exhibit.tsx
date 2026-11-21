import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router'
import { Description } from '../components/Description.tsx'
import { Spinner } from '../components/Spinner.tsx'
import { TileArt } from '../components/TileArt.tsx'
import { EXHIBITS, WINGS, nextExhibit, wingExhibits } from '../exhibits.ts'
import { Explainer, TryThis } from '../exhibits/overfitting/Explainer.tsx'
import { PointArea } from '../exhibits/overfitting/PointArea.tsx'
import {
  Explainer as TypingExplainer,
  TryThis as TypingTryThis,
} from '../exhibits/typing-rhythm/Explainer.tsx'
import { TypingRound } from '../exhibits/typing-rhythm/TypingRound.tsx'
import {
  Explainer as SlopeExplainer,
  TryThis as SlopeTryThis,
} from '../exhibits/gradient-descent/Explainer.tsx'
import { NotFound } from './NotFound.tsx'

// The Ski Slope brings Three.js, so its code loads only when its page opens.
const SkiSlope = lazy(() =>
  import('../exhibits/gradient-descent/SkiSlope.tsx').then((m) => ({
    default: m.SkiSlope,
  })),
)

export function Exhibit() {
  const { wing, slug } = useParams()
  const exhibit = EXHIBITS.find(
    (e) => e.wing === wing && e.slug === slug && e.open,
  )
  if (!exhibit) return <NotFound />
  const wingTitle = WINGS[exhibit.wing].title
  const next = nextExhibit(exhibit)

  return (
    <article className={`exhibit wing-${exhibit.wing}`}>
      <title>{`${exhibit.title} – Data Science Playground`}</title>
      <Description text={exhibit.line} />
      <Link className="crumb" to={`/${exhibit.wing}`}>
        {wingTitle}
      </Link>
      <h1>{exhibit.title}</h1>
      {exhibit.slug === 'overfitting' ? (
        <PointArea />
      ) : exhibit.slug === 'typing-rhythm' ? (
        <TypingRound />
      ) : exhibit.slug === 'gradient-descent' ? (
        <Suspense fallback={<Spinner />}>
          <SkiSlope />
        </Suspense>
      ) : (
        <div className="placeholder">The exhibit goes here</div>
      )}
      <div className="panels">
        <section className="panel">
          <h2>What just happened</h2>
          {exhibit.slug === 'overfitting' ? (
            <Explainer />
          ) : exhibit.slug === 'typing-rhythm' ? (
            <TypingExplainer />
          ) : exhibit.slug === 'gradient-descent' ? (
            <SlopeExplainer />
          ) : (
            <p>
              Explains the idea in one paragraph once you have tried the
              exhibit.
            </p>
          )}
        </section>
        {exhibit.slug === 'overfitting' && <TryThis />}
        {exhibit.slug === 'typing-rhythm' && <TypingTryThis />}
        {exhibit.slug === 'gradient-descent' && <SlopeTryThis />}
      </div>
      {next && (
        <section className="next-up" aria-labelledby="next-up-heading">
          <h2 id="next-up-heading">Next up</h2>
          <Link
            className={`next-card wing-${next.wing}`}
            to={`/${next.wing}/${next.slug}`}
          >
            <TileArt slug={next.slug} />
            <span className="next-text">
              <b>{next.title}</b>
              <span>{next.line}</span>
            </span>
          </Link>
        </section>
      )}
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
