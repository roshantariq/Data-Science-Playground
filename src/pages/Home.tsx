import { WingSection } from '../components/WingSection.tsx'

export function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <h1>See the math move</h1>
          <p>
            Pick an exhibit below. Each one is a{' '}
            <span className="nowrap">hands-on</span> experiment.
          </p>
        </div>
        <div className="placeholder">Animated preview of the exhibits</div>
      </section>
      <WingSection wing="machines" />
      <WingSection wing="feel" />
    </>
  )
}
