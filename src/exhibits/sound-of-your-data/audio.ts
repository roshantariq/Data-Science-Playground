// Plays the steps with Web Audio, a little ahead of time so the timing stays
// even. Two styles to compare: Notes (one note per value on the five-note
// scale, like Typing Rhythm) and Slide (one tone gliding to each value),
// each with its own instruments. Outliers are louder in Notes, and both
// styles add a short sharp click. Everything then goes through bass and
// treble controls and a reverb, which can change while it plays.
import {
  glider,
  strike,
  type NoteInstrument,
  type SlideInstrument,
} from './instruments.ts'
import { noteFreq, range, slideFreq, type Step } from './sound.ts'

export type Style = 'notes' | 'slide'
// bass and treble in decibels (-12 to 12), reverb from 0 to 1
export type Tone = { bass: number; treble: number; reverb: number }
export type Player = { stop: () => void; setTone: (tone: Tone) => void }

const AHEAD = 0.2 // seconds of sound scheduled in advance

export function play({
  steps,
  from,
  style,
  instrument,
  octave,
  tone,
  perSecond,
  onStep,
  onEnd,
}: {
  steps: Step[]
  from: number
  style: Style
  instrument: NoteInstrument | SlideInstrument
  octave: number
  tone: Tone
  perSecond: number
  onStep: (i: number) => void
  onEnd: () => void
}): Player {
  const ctx = new AudioContext()
  const out = ctx.createGain()
  out.gain.value = 0.6
  const bass = ctx.createBiquadFilter()
  bass.type = 'lowshelf'
  bass.frequency.value = 250
  const treble = ctx.createBiquadFilter()
  treble.type = 'highshelf'
  treble.frequency.value = 3000
  const dry = ctx.createGain()
  const wet = ctx.createGain()
  const verb = ctx.createConvolver()
  verb.buffer = room(ctx.sampleRate)
  out.connect(bass).connect(treble)
  treble.connect(dry).connect(ctx.destination)
  treble.connect(verb).connect(wet).connect(ctx.destination)
  const setTone = (tone: Tone, t = ctx.currentTime) => {
    bass.gain.setTargetAtTime(tone.bass, t, 0.03)
    treble.gain.setTargetAtTime(tone.treble, t, 0.03)
    dry.gain.setTargetAtTime(1 - tone.reverb * 0.4, t, 0.03)
    wet.gain.setTargetAtTime(tone.reverb * 0.8, t, 0.03)
  }
  setTone(tone)

  const { lo, hi } = range(steps)
  const gap = 1 / perSecond
  const t0 = ctx.currentTime + 0.08
  const when = (i: number) => t0 + (i - from) * gap
  const timers: number[] = []
  const later = (fn: () => void, t: number) =>
    timers.push(
      window.setTimeout(fn, Math.max(0, (t - ctx.currentTime) * 1000)),
    )

  const glide =
    style === 'slide'
      ? glider(
          ctx,
          out,
          instrument as SlideInstrument,
          slideFreq(steps[from].value, lo, hi, octave),
          t0,
        )
      : null

  let next = from
  const schedule = () => {
    while (next < steps.length && when(next) < ctx.currentTime + AHEAD) {
      const i = next++
      const t = when(i)
      const s = steps[i]
      if (glide) glide(slideFreq(s.value, lo, hi, octave), t, gap / 4)
      else
        strike(
          ctx,
          out,
          instrument as NoteInstrument,
          noteFreq(s.value, lo, hi, octave),
          t,
          gap,
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

  return {
    stop: () => {
      window.clearInterval(tick)
      timers.forEach((t) => window.clearTimeout(t))
      void ctx.close()
    },
    setTone: (tone) => setTone(tone),
  }
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

// The reverb's room: two seconds of fading noise, a little different in
// each ear. Worked out once and kept.
let rooms: AudioBuffer | null = null
function room(sampleRate: number) {
  if (rooms?.sampleRate !== sampleRate) {
    const len = Math.floor(sampleRate * 2)
    rooms = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate })
    for (let c = 0; c < 2; c++) {
      const d = rooms.getChannelData(c)
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
    }
  }
  return rooms
}
