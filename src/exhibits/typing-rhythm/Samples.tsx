import { useMemo, useState } from 'react'
import { Results } from './Results.tsx'
import { SAMPLES } from './samples.ts'
import { roundStats, standing } from './stats.ts'

export type Reason = 'touch' | 'keys' | 'timer'

const NOTICE: Record<Reason, [string, string]> = {
  touch: [
    "Phones can't time your keys well",
    "On-screen keyboards report key presses late and unevenly, so your rhythm wouldn't be measured fairly. Try it on a computer. For now, explore these typists.",
  ],
  keys: [
    "This keyboard doesn't say which keys you press",
    "It sends text without naming the keys, as on-screen keyboards and some input tools do, so your rhythm can't be measured. Try it with a physical keyboard. For now, explore these typists.",
  ],
  timer: [
    'Your browser blurs key timings',
    "To protect your privacy, it rounds the time of every key press (Firefox's fingerprinting protection and Tor do this), so your rhythm can't be measured fairly. For now, explore these typists.",
  ],
}

// Shown instead of a round when this device can't time keys fairly.
export function Samples({
  reason,
  onType,
}: {
  reason: Reason
  onType?: () => void
}) {
  const [i, setI] = useState(0)
  const { sentences } = SAMPLES[i]
  const [stats, st] = useMemo(() => {
    const s = roundStats(sentences)!
    return [s, standing(s, sentences.length)]
  }, [sentences])
  const [title, text] = NOTICE[reason]
  return (
    <>
      <section className="typing-card">
        <h2>{title}</h2>
        <p>{text}</p>
        {onType && (
          <button type="button" onClick={onType}>
            I have a keyboard, let me type
          </button>
        )}
      </section>
      <div className="typing-bar">
        <div role="group" aria-label="Sample typists">
          {SAMPLES.map((s, j) => (
            <button
              key={s.name}
              type="button"
              aria-pressed={j === i}
              onClick={() => setI(j)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <p>
          Admin Round is a real round typed on a laptop. The other three are
          computer-generated.
        </p>
      </div>
      <Results key={i} sentences={sentences} stats={stats} standing={st} />
    </>
  )
}
