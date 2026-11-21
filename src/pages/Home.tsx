import { HeroPreview } from '../components/HeroPreview.tsx'
import { WingSection } from '../components/WingSection.tsx'

export function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <h1>See the math move</h1>
          <p>
            Play with the ideas behind data science. Pick an exhibit and try an
            idea yourself.
          </p>
        </div>
        <HeroPreview />
      </section>
      <WingSection wing="machines" />
      <WingSection wing="feel" />
    </>
  )
}
