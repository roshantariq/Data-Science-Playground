import { useShowMore } from '../../components/ShowMore.tsx'

export function TryThis() {
  const more = useShowMore()
  return (
    <section className="panel">
      <h2>Try this</h2>
      <ul>
        <li>
          On <b>Two spirals</b>, go down to one hidden layer and train. How
          close does it get?
        </li>
        <li className={more.extra}>
          Tap a neuron in layer 1. Is its edge ever anything but a straight
          line?
        </li>
        <li className={more.extra}>
          On <b>Blobs</b>, set one layer with one neuron. Why is that enough?
        </li>
        <li className={more.extra}>
          On <b>Checkerboard</b>, train with 2 neurons in one layer, then 4.
          What changes?
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
        A neural network is built from small units called <b>neurons</b>. Each
        neuron in the first layer draws one straight line across the map and
        lights up on one side of it. The next layer mixes those lines into bends
        and curves. The <b>output</b> neuron turns the mix into a guess: circle
        or square.
      </p>
      <p className={more.extra}>
        It learns like the ball on the Ski Slope. After each small batch of
        points it nudges every weight a little downhill, so its guesses get less
        wrong. Working out which way to nudge each one is called{' '}
        <b>backpropagation</b>, and one pass over all the training points is an{' '}
        <b>epoch</b>.
      </p>
      <p className={more.extra}>
        More neurons can draw more complicated shapes, which is why the spirals
        need two layers. A big network can also bend around a few stray points.
        Watch the chart: if the <b>training</b> line keeps falling while the{' '}
        <b>test</b> line stalls or rises, that's <b>overfitting</b>.
      </p>
      {more.button}
    </>
  )
}
