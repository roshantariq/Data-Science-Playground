import { useShowMore } from '../../components/ShowMore.tsx'

export function TryThis() {
  const more = useShowMore()
  return (
    <section className="panel">
      <h2>Try this</h2>
      <ul>
        <li>
          Pick <b>Narrow valley</b>, set the learning rate to 2 and press{' '}
          <b>Roll</b>. Why does the ball zig-zag across the valley?
        </li>
        <li className={more.extra}>
          On <b>Two valleys</b>, drop the ball in the shallower dip. Can more
          momentum carry it out?
        </li>
        <li className={more.extra}>
          On <b>Bowl</b>, set the learning rate as low as it goes. How many
          steps does it take now?
        </li>
        <li className={more.extra}>
          On <b>Bumpy</b>, roll from the same start with momentum 0 and then
          0.9. Where does each one end up?
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
        The landscape is a loss surface. Each spot on it is one choice of a
        model's settings, and its height is how wrong the model is with them, so
        the lowest point is the best choice. The ball is the model learning: at
        each step it feels the slope under it and moves downhill.
      </p>
      <p className={more.extra}>
        How far it moves each step is the <b>learning rate</b>. Too small and it
        creeps. Too big and it overshoots the bottom and bounces from wall to
        wall. <b>Momentum</b> lets the ball keep some of its speed from the step
        before, which carries it along a gentle valley floor and sometimes over
        a small bump.
      </p>
      <p className={more.extra}>
        The ball only feels the slope right under it. It can't see the whole
        map, so it can settle in a dip that isn't the lowest one, called a{' '}
        <b>local minimum</b>. Real models learn the same way, with thousands of
        settings instead of two. It's called <b>gradient descent</b>.
      </p>
      {more.button}
    </>
  )
}
