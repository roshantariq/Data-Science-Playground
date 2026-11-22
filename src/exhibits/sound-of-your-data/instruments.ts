// The instruments. Most Notes ones are built from tones in the browser;
// the rest, and the Slide ones bar Simple tone, play real recordings (see
// recordings.ts). Notes instruments play one struck, plucked or blown note
// per value; Slide instruments hold one tone that glides from value to
// value.
import type { Recording } from './recordings.ts'

export type Instrument<Id = string> = {
  id: Id
  name: string
  recording?: Recording
}
export const NOTE_INSTRUMENTS = [
  { id: 'simple', name: 'Simple tone' },
  { id: 'piano', name: 'Piano' },
  { id: 'marimba', name: 'Marimba' },
  { id: 'pluck', name: 'Plucked string' },
  { id: 'guitar', name: 'Electric guitar' },
  { id: 'sax', name: 'Saxophone' },
  { id: 'rec-piano', name: 'Piano', recording: 'piano' },
  { id: 'rec-marimba', name: 'Marimba', recording: 'marimba' },
  { id: 'rec-harp', name: 'Harp', recording: 'harp' },
  { id: 'rec-guitar', name: 'Guitar', recording: 'guitar' },
  { id: 'rec-sax', name: 'Saxophone', recording: 'sax' },
] as const satisfies Instrument<string>[]
export const SLIDE_INSTRUMENTS = [
  { id: 'simple', name: 'Simple tone' },
  { id: 'clarinet', name: 'Clarinet', recording: 'clarinet' },
  { id: 'sax', name: 'Saxophone', recording: 'sax' },
  { id: 'trumpet', name: 'Trumpet', recording: 'trumpet' },
  { id: 'cello', name: 'Cellos', recording: 'cello' },
  { id: 'organ', name: 'Organ', recording: 'organ' },
] as const satisfies Instrument<string>[]
export type NoteInstrument = (typeof NOTE_INSTRUMENTS)[number]['id']
export type SlideInstrument = (typeof SLIDE_INSTRUMENTS)[number]['id']
export type BuiltNote = Exclude<NoteInstrument, `rec-${string}`>

// One note at time t. `gap` is the time until the next note; `vol` is
// louder for outliers.
export function strike(
  ctx: AudioContext,
  out: AudioNode,
  id: BuiltNote,
  f: number,
  t: number,
  gap: number,
  vol: number,
) {
  const g = ctx.createGain()
  g.connect(out)
  const env = g.gain
  env.setValueAtTime(0, t)
  if (id === 'piano') {
    // Bright at first, then mellowing as it rings.
    const o = osc(ctx, f, t, wave(ctx, [1, 0.5, 0.3, 0.15, 0.08, 0.04]))
    const lp = filter(ctx, 'lowpass', Math.min(f * 10, 12000))
    lp.frequency.setTargetAtTime(f * 3, t, 0.25)
    o.connect(lp).connect(g)
    env.linearRampToValueAtTime(vol * 0.7, t + 0.004)
    env.setTargetAtTime(0, t + 0.004, 0.4)
    o.stop(t + 2)
  } else if (id === 'marimba') {
    // A wooden bar: the note plus a quieter overtone four times higher.
    const o = osc(ctx, f, t)
    const over = osc(ctx, f * 4, t)
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.3, t)
    og.gain.setTargetAtTime(0, t, 0.04)
    o.connect(g)
    over.connect(og).connect(g)
    env.linearRampToValueAtTime(vol * 0.8, t + 0.003)
    env.setTargetAtTime(0, t + 0.003, 0.15)
    o.stop(t + 1)
    over.stop(t + 1)
  } else if (id === 'pluck' || id === 'guitar') {
    // A string (Karplus-Strong): a burst of noise fed round a short loop
    // that rings at the note's pitch and fades.
    const ring = id === 'guitar' ? 1.5 : 0.5
    const src = ctx.createBufferSource()
    const { buffer, rate } = string(ctx.sampleRate, f, ring)
    src.buffer = buffer
    src.playbackRate.value = rate
    if (id === 'guitar') {
      // Overdrive, then take the harsh top off, like a guitar amp.
      const drive = ctx.createWaveShaper()
      drive.curve = overdrive()
      src
        .connect(drive)
        .connect(filter(ctx, 'lowpass', 3000))
        .connect(g)
    } else src.connect(g)
    env.linearRampToValueAtTime(vol * (id === 'guitar' ? 0.55 : 1.5), t + 0.002)
    // Let it ring a little past the next note, then damp it.
    env.setTargetAtTime(0, t + Math.max(gap * 2, 0.4), 0.1)
    src.start(t)
  } else if (id === 'sax') {
    // A buzzy reed through a filter that opens as the note starts, with a
    // little vibrato.
    const len = Math.max(0.08, gap * 0.85)
    const o = osc(ctx, f, t, 'sawtooth')
    vibrato(ctx, o, t, 5, 8)
    const lp = filter(ctx, 'lowpass', f * 1.5, 4)
    lp.frequency.linearRampToValueAtTime(Math.min(f * 5, 8000), t + 0.06)
    o.connect(lp).connect(g)
    env.linearRampToValueAtTime(vol * 0.9, t + 0.03)
    env.setTargetAtTime(0, t + len, 0.04)
    o.stop(t + len + 0.3)
  } else {
    // Simple tone: a plucked triangle note, like Typing Rhythm's.
    const len = Math.min(0.3, gap * 0.9)
    const o = osc(ctx, f, t, 'triangle')
    o.connect(g)
    env.linearRampToValueAtTime(vol, t + 0.005)
    env.setTargetAtTime(0, t + len * 0.4, len / 3)
    o.stop(t + len + 0.3)
  }
}

// One held tone, starting at t at pitch f. `to` glides it to a new pitch;
// `release` fades it out.
export type Glider = {
  to: (f: number, t: number, speed: number) => void
  release: (t: number) => void
}
export function glider(
  ctx: AudioContext,
  out: AudioNode,
  f: number,
  t: number,
): Glider {
  const g = ctx.createGain()
  g.connect(out)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.22, t + 0.08)
  const o = osc(ctx, f, t)
  o.connect(g)
  return {
    to: (f, t, speed) => o.frequency.setTargetAtTime(f, t, speed),
    release: (t) => g.gain.setTargetAtTime(0, t, 0.08),
  }
}

function osc(
  ctx: AudioContext,
  f: number,
  t: number,
  type: OscillatorType | PeriodicWave = 'sine',
) {
  const o = ctx.createOscillator()
  if (type instanceof PeriodicWave) o.setPeriodicWave(type)
  else o.type = type
  o.frequency.setValueAtTime(f, t)
  o.start(t)
  return o
}

function filter(ctx: AudioContext, type: BiquadFilterType, f: number, q = 0.7) {
  const b = ctx.createBiquadFilter()
  b.type = type
  b.frequency.value = f
  b.Q.value = q
  return b
}

// Wobbles the pitch by `cents` (a hundredth of a semitone), `rate` times a
// second.
function vibrato(
  ctx: AudioContext,
  o: OscillatorNode,
  t: number,
  rate: number,
  cents: number,
) {
  const lfo = osc(ctx, rate, t)
  const depth = ctx.createGain()
  depth.gain.value = cents
  lfo.connect(depth).connect(o.detune)
  o.addEventListener('ended', () => lfo.stop())
}

// A tone made of the note (first number) and its overtones.
function wave(ctx: AudioContext, amps: number[]) {
  const real = new Float32Array(amps.length + 1)
  const imag = Float32Array.from([0, ...amps])
  return ctx.createPeriodicWave(real, imag)
}

// Strings are worked out once per pitch and kept. A buffer can be played in
// any audio context with the same sample rate.
const strings = new Map<string, { buffer: AudioBuffer; rate: number }>()
function string(sampleRate: number, f: number, ring: number) {
  const key = `${sampleRate} ${f.toFixed(2)} ${ring}`
  let s = strings.get(key)
  if (!s) {
    const n = Math.max(2, Math.floor(sampleRate / f - 0.5)) // loop length
    const len = Math.floor(sampleRate * 1.6)
    const buffer = new AudioBuffer({ length: len, sampleRate })
    const y = buffer.getChannelData(0)
    for (let i = 0; i < n; i++) y[i] = Math.random() * 2 - 1
    // Each trip round the loop loses a little, so it fades over `ring`
    // seconds; averaging neighbours softens it as it fades, like a string.
    const keep = Math.exp(-1 / (f * ring))
    for (let i = n; i < len; i++)
      y[i] = keep * 0.5 * (y[i - n] + (i > n ? y[i - n - 1] : 0))
    // The loop's pitch is sampleRate / (n + 0.5); play it back at the rate
    // that lands it exactly on f.
    s = { buffer, rate: (f * (n + 0.5)) / sampleRate }
    strings.set(key, s)
  }
  return s
}

let curve: Float32Array<ArrayBuffer> | null = null
function overdrive() {
  if (!curve) {
    curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++)
      curve[i] = Math.tanh(5 * ((i / (curve.length - 1)) * 2 - 1))
  }
  return curve
}
