import { Link } from 'react-router'

export function About() {
  return (
    <article className="prose">
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
      <h2>Your data</h2>
      <p>
        Everything runs in your browser, and nothing you type, draw or upload is
        sent anywhere. Details are on the <Link to="/privacy">Privacy</Link>{' '}
        page.
      </p>
    </article>
  )
}
