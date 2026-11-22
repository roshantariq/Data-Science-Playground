// Plays the steps with Web Audio, a little ahead of time so the timing stays
// even. Two styles to compare: Notes (one note per value on the five-note
// scale, like Typing Rhythm) and Slide (one tone gliding to each value).
// Outliers are louder in Notes, and both styles add a short sharp click.
import { noteFreq, range, slideFreq, type Step } from './sound.ts'

export type Style = 'notes' | 'slide'

const AHEAD = 0.2 // seconds of sound scheduled in advance

export function play({
  steps,
  from,
  style,
  perSecond,
  onStep,
  onEnd,
}: {
  steps: Step[]
  from: number
  style: Style
  perSecond: number
  onStep: (i: number) => void
  onEnd: () => void
}): () => void {
  const ctx = new AudioContext()
  const out = ctx.createGain()
  out.gain.value = 0.6
  out.connect(ctx.destination)
  const { lo, hi } = range(steps)
  const gap = 1 / perSecond
  const t0 = ctx.currentTime + 0.08
  const when = (i: number) => t0 + (i - from) * gap
  const timers: number[] = []
  const later = (fn: () => void, t: number) =>
    timers.push(
      window.setTimeout(fn, Math.max(0, (t - ctx.currentTime) * 1000)),
    )

  let glide: OscillatorNode | null = null
  if (style === 'slide') {
    glide = ctx.createOscillator()
    glide.type = 'sine'
    glide.frequency.setValueAtTime(slideFreq(steps[from].value, lo, hi), t0)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.22, t0 + 0.05)
    glide.connect(g).connect(out)
    glide.start(t0)
  }

  let next = from
  const schedule = () => {
    while (next < steps.length && when(next) < ctx.currentTime + AHEAD) {
      const i = next++
      const t = when(i)
      const s = steps[i]
      if (glide)
        glide.frequency.setTargetAtTime(slideFreq(s.value, lo, hi), t, gap / 4)
      else
        tone(
          ctx,
          out,
          noteFreq(s.value, lo, hi),
          t,
          Math.min(0.3, gap * 0.9),
          s.outlier ? 0.34 : 0.15,
        )
      if (s.outlier) click(ctx, out, t)
      later(() => onStep(i), t)
    }
    if (next >= steps.length) {
      window.clearInterval(tick)
      later(onEnd, when(steps.length))
    }
  }
  const tick = window.setInterval(schedule, 50)
  schedule()

  return () => {
    window.clearInterval(tick)
    timers.forEach((t) => window.clearTimeout(t))
    void ctx.close()
  }
}

// A plucked note that fades, like Typing Rhythm's.
function tone(
  ctx: AudioContext,
  out: AudioNode,
  f: number,
  t: number,
  len: number,
  vol: number,
) {
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.value = f
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.005)
  g.gain.setTargetAtTime(0, t + len * 0.4, len / 3)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + len + 0.3)
}

// The outlier accent: a short, bright click on top of the note.
function click(ctx: AudioContext, out: AudioNode, t: number) {
  const o = ctx.createOscillator()
  o.type = 'square'
  o.frequency.value = 1760
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.12, t + 0.002)
  g.gain.setTargetAtTime(0, t + 0.01, 0.015)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.12)
}
