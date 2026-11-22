import { useShowMore } from '../../components/ShowMore.tsx'

export function TryThis() {
  const more = useShowMore()
  return (
    <section className="panel">
      <h2>Try this</h2>
      <ul>
        <li>
          Play <b>Iris flowers</b>, petal length. Can you hear where one species
          ends and the next begins?
        </li>
        <li className={more.extra}>
          Play <b>New York temperatures</b> on Fast. Where does the summer peak?
        </li>
        <li className={more.extra}>
          Play the fares on <b>Titanic passengers</b>. Why do the loudest notes
          all come early?
        </li>
        <li className={more.extra}>
          Switch between <b>Notes</b> and <b>Slide</b>. Which one makes the
          outliers easier to hear?
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
        Each value became a note, in order from the first row to the last: the
        higher the value, the higher the note. Listening to data like this is
        called <b>sonification</b>.
      </p>
      <p className={more.extra}>
        A <b>trend</b> shows up as a tune that drifts up or down, and a
        repeating pattern as a rhythm. A value far from the rest jumps out as a
        louder note with a click: an <b>outlier</b>. Here a value counts as one
        when it's far out of line with the values just before and after it.
      </p>
      <p className={more.extra}>
        Sound helps where eyes are busy or can't help. A Geiger counter clicks
        faster near radiation, a hospital monitor beeps with every heartbeat,
        and astronomers have turned telescope images into sound so people who
        can't see them can still explore them.
      </p>
      {more.button}
    </>
  )
}
