import { Link } from 'react-router'

export function NotFound() {
  return (
    <article className="prose">
      <h1>Page not found</h1>
      <p>
        This page doesn't exist, or its exhibit isn't open yet.{' '}
        <Link to="/">Back to the home page</Link>.
      </p>
    </article>
  )
}
