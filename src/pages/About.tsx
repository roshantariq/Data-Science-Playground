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
      <p>
        Sound of Your Data plays three real datasets. Titanic passengers: data
        obtained from <a href="http://hbiostat.org/data">hbiostat.org/data</a>{' '}
        courtesy of the Vanderbilt University Department of Biostatistics
        (titanic3, Thomas Cason and Frank Harrell). Iris flowers: R. A. Fisher
        (1936), from the{' '}
        <a href="https://doi.org/10.24432/C56C76">
          UCI Machine Learning Repository
        </a>{' '}
        under CC BY 4.0. New York temperatures: NOAA's Global Historical
        Climatology Network Daily, Central Park station, which is in the public
        domain. The other sample series are made up.
      </p>
      <p>
        Its recorded instruments come from two free collections. Violin, organ,
        marimba and harp: Versilian Studios'{' '}
        <a href="https://github.com/sgossner/VSCO-2-CE">
          VSCO 2 Community Edition
        </a>
        , recorded by Sam Gossner and Simon Dalzell, released under CC0; the
        upright piano in it was recorded by Simon Dalzell of Ivy Audio.
        Saxophone and guitar: the{' '}
        <a href="https://theremin.music.uiowa.edu/MIS.html">
          University of Iowa Electronic Music Studios
        </a>
        ' Musical Instrument Samples, by Lawrence Fritts.
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
