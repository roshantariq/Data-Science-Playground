import { useShowMore } from '../../components/ShowMore.tsx'

export function TryThis() {
  const more = useShowMore()
  return (
    <section className="panel">
      <h2>Try this</h2>
      <ul>
        <li>
          On <b>Checkerboard</b>, race with just 2 splits. The tree looks for
          the best single split, but here no one split helps much on its own.
          Can you beat it?
        </li>
        <li className={more.extra}>
          On <b>Diagonal</b>, how close can you follow the line? Straight splits
          can only make steps.
        </li>
        <li className={more.extra}>
          Allow 8 splits and race. Does the tree's training score climb while
          its test score doesn't?
        </li>
        <li className={more.extra}>
          On <b>Ring</b>, make your first split and race. Did the tree start the
          same way?
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
        Each split asks one yes-or-no question about a point, like "is x below
        4.2?", and sends it one way or the other. Together the questions make a{' '}
        <b>decision tree</b>. Each region at the bottom of it guesses whichever
        shape is most common inside it.
      </p>
      <p className={more.extra}>
        The real tree builds itself one split at a time. At each step it tries
        every possible split of every region and keeps the one that leaves the
        two sides least mixed, measured by <b>Gini impurity</b>. It never looks
        ahead, so it can miss a pair of splits that only pays off together.
      </p>
      <p className={more.extra}>
        Both of you learn from the <b>training</b> points and are scored on{' '}
        <b>test</b> points held back from the start. Splitting until every
        region holds one shape can score perfectly on training points and still
        lose on test points, because the last few splits chase noise. That's{' '}
        <b>overfitting</b>, the same idea as in the Overfitting Playground.
      </p>
      {more.button}
    </>
  )
}
