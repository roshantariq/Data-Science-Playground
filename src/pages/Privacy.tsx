export function Privacy() {
  return (
    <article className="prose">
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
          <b>Typing DNA:</b> records how long you hold each key and the gaps
          between keys, never the letters you type. The timings stay in the page
          and are gone when you leave, unless you choose to save them in your
          browser. Saved timings can be deleted at any time.
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
