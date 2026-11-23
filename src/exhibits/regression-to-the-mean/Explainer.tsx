import { useShowMore } from '../../components/ShowMore.tsx'

export function TryThis() {
  const more = useShowMore()
  return (
    <section className="panel">
      <h2>Try this</h2>
      <ul>
        <li>
          Play another 30 rounds. Is your best round still followed by a slower
          one?
        </li>
        <li className={more.extra}>
          Press <b>Play 30 rounds of pure luck</b>. Do its best rounds come back
          to average too?
        </li>
        <li className={more.extra}>
          Look at your slowest round. Was the next one faster?
        </li>
      </ul>
      {more.button}
    </section>
  )
}

export function Explainer() {
  const more = useShowMore()
  return (
    <>
      <p>
        Every round is part skill and part luck. Your skill stays about the same
        from one round to the next, and your luck doesn't. Your fastest rounds
        were fast partly because luck was on your side, so the next round, with
        ordinary luck, was usually slower. This is called{' '}
        <b>regression to the mean</b>: extreme results tend to be followed by
        ones closer to the average.
      </p>
      <p className={more.extra}>
        It's why praise seems to backfire and criticism seems to work. The
        psychologist Daniel Kahneman tells of flight instructors who were sure
        that praising a great landing made the next one worse. They were seeing
        regression to the mean. Francis Galton first noticed it in the 1880s,
        when the children of very tall parents tended to be shorter than their
        parents.
      </p>
      {more.button}
    </>
  )
}
