import { Description } from '../components/Description.tsx'

export function Privacy() {
  return (
    <article className="prose">
      <title>Privacy – Data Science Playground</title>
      <Description text="What each exhibit does with your data. No accounts, no cookies, and nothing leaves your browser." />
      <h1>Privacy</h1>
      <p>
        This site has no accounts and no server that stores your data.
        Everything an exhibit does happens in your browser.
      </p>
      <h2>What each part uses</h2>
      <ul>
        <li>
          <b>Theme choice:</b> saved in your browser so the site remembers it.
          Choosing System removes it.
        </li>
        <li>
          <b>Overfitting Playground:</b> the points you place stay in the page
          and are gone when you leave.
        </li>
        <li>
          <b>Gradient Descent Ski Slope:</b> where you drop the ball and the
          settings you pick stay in the page and are gone when you leave.
        </li>
        <li>
          <b>Typing Rhythm:</b> notes which key you press and when, to work out
          your stats. That stays in the page and is gone when you leave. Your
          best round is saved in your browser as its score and stats only, with
          no timings or letters, and "Delete my data" removes it.
        </li>
        <li>
          <b>Sound of Your Data:</b> a CSV file you upload is read in your
          browser and never sent anywhere. It's gone when you leave.
        </li>
      </ul>
      <h2>Visitor statistics</h2>
      <p>
        The site counts page visits with Cloudflare Web Analytics, which does
        not collect personal data.
      </p>
      <h2>Links</h2>
      <p>
        Links to exhibits never contain your data, so sharing a link shares
        nothing about you.
      </p>
    </article>
  )
}
