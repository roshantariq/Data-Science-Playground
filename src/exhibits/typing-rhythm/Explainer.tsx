import { useShowMore } from '../../components/ShowMore.tsx'

export function TryThis() {
  const more = useShowMore()
  return (
    <section className="panel">
      <h2>Try this</h2>
      <ul>
        <li>
          Type a round at your normal pace, then another as fast as you can.
          What happens to Accuracy and Steadiness?
        </li>
        <li className={more.extra}>
          Press <b>Play my rhythm</b> and step to a sentence where you fixed a
          mistake. Can you hear the gap where you stopped?
        </li>
        <li className={more.extra}>
          Watch the meters while you type. Which column of your keyboard jumps
          highest?
        </li>
        <li className={more.extra}>
          Check your Rollover, then type a round letting go of each key before
          pressing the next. What happens to your speed?
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
        Every key you pressed left two times: when it went down and when it came
        up. On their own, those are just a long list of numbers. The page boiled
        them down to six, each one summing up part of how you type, and then
        compared each with about 162,000 typists from a study who typed
        sentences like these.
      </p>
      <p className={more.extra}>
        Turning raw data into a few telling numbers is called{' '}
        <b>feature extraction</b>. Most of the work is deciding what to measure
        and what to leave out. Speed counts only letters and spaces. Steadiness
        allows for letter pairs that are slow for everyone, so a hard stretch of
        keys doesn't count against you.
      </p>
      <p className={more.extra}>
        Together, the six numbers make a profile of how you type. Typing rhythm
        differs enough from person to person that it has been studied as a way
        to tell people apart, under the name <b>keystroke dynamics</b>. That's
        why this page keeps your timings in memory only, and saves nothing but
        your best score and stats.
      </p>
      {more.button}
    </>
  )
}
