import { Link } from 'react-router'
import { Description } from '../components/Description.tsx'

export function About() {
  return (
    <article className="prose">
      <title>About – Data Science Playground</title>
      <Description text="Who made Data Science Playground, why it exists and how it's built." />
      <h1>About</h1>
      <p>
        Data Science Playground is a set of interactive exhibits about how
        machines learn and how data feels. Each one makes a single idea from
        data science something you can try for yourself.
      </p>
      <h2>Why it exists</h2>
      <p>
        Ideas like overfitting or gradient descent are easier to grasp by moving
        a slider and watching what breaks than by reading a definition.
      </p>
      <h2>Who made it</h2>
      <p>
        Built by Roshan Tariq. More of Roshan's work is on{' '}
        <a href="https://github.com/roshantariq">GitHub</a>.
      </p>
      <h2>How it's built</h2>
      <p>
        React and TypeScript, with the math written by hand. The code is open
        source on{' '}
        <a href="https://github.com/roshantariq/Data-Science-Playground">
          GitHub
        </a>{' '}
        under the MIT license.
      </p>
      <h2>Data</h2>
      <p>
        Typing Rhythm compares your typing with the 136M Keystrokes dataset from
        Aalto University: Vivek Dhakal, Anna Maria Feit, Per Ola Kristensson and
        Antti Oulasvirta,{' '}
        <a href="https://doi.org/10.1145/3173574.3174220">
          "Observations on Typing from 136 Million Keystrokes"
        </a>
        , CHI 2018. It is used here for non-commercial purposes with credit, as
        its licence asks.
      </p>
      <h2>Your data</h2>
      <p>
        Everything runs in your browser, and nothing you type, draw or upload is
        sent anywhere. Details are on the <Link to="/privacy">Privacy</Link>{' '}
        page.
      </p>
    </article>
  )
}
