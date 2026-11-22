// Real instruments: short recordings of single notes, each fetched the first
// time its instrument is picked. A note plays from the recording nearest in
// pitch, sped up or slowed down to land on the right note. How the files
// were made: research/sound-of-your-data/README.md.
import type { Glider } from './instruments.ts'
import tuning from './recordings/tuning.json'

export type Recording =
  'piano' | 'marimba' | 'harp' | 'guitar' | 'sax' | 'violin' | 'organ'
// Sustained instruments: their notes stop when the next one starts, and in
// Slide they loop for as long as needed.
const HELD: Recording[] = ['sax', 'violin', 'organ']

export const CREDITS: Record<Recording, string> = {
  piano:
    'Upright piano recorded by Simon Dalzell of Ivy Audio, from Versilian Studios’ VSCO 2 Community Edition (CC0).',
  marimba: 'Versilian Studios’ VSCO 2 Community Edition (CC0).',
  harp: 'Versilian Studios’ VSCO 2 Community Edition (CC0).',
  violin: 'Versilian Studios’ VSCO 2 Community Edition (CC0).',
  organ: 'Versilian Studios’ VSCO 2 Community Edition (CC0).',
  sax: 'University of Iowa Electronic Music Studios, Musical Instrument Samples.',
  guitar:
    'University of Iowa Electronic Music Studios, Musical Instrument Samples.',
}

const FILES = import.meta.glob<string>('./recordings/*/*.mp3', {
  query: '?url',
  import: 'default',
  eager: true,
})

// One recorded note; `pitch` is its exact pitch as a MIDI note number.
type Note = { pitch: number; buffer: AudioBuffer }
export type Recorded = { id: Recording; notes: Note[] }

const loads = new Map<Recording, Promise<Recorded>>()
export function load(id: Recording): Promise<Recorded> {
  let p = loads.get(id)
  if (!p) {
    const ctx = new OfflineAudioContext(1, 1, 44100) // only for decoding
    const cents: Record<string, number> = tuning[id]
    p = Promise.all(
      Object.entries(FILES)
        .filter(([path]) => path.split('/')[2] === id)
        .map(async ([path, url]) => {
          const midi = Number(path.split('/')[3].replace('.mp3', ''))
          const res = await fetch(url)
          if (!res.ok) throw new Error(`${url}: ${res.status}`)
          const buffer = await ctx.decodeAudioData(await res.arrayBuffer())
          return { pitch: midi + cents[midi] / 100, buffer }
        }),
    ).then((notes) => ({ id, notes: notes.sort((a, b) => a.pitch - b.pitch) }))
    // A failed load can be tried again.
    p.catch(() => loads.delete(id))
    loads.set(id, p)
  }
  return p
}

const midiOf = (f: number) => 69 + 12 * Math.log2(f / 440)
const nearest = (notes: Note[], m: number) =>
  notes.reduce((a, b) =>
    Math.abs(b.pitch - m) < Math.abs(a.pitch - m) ? b : a,
  )
const rate = (n: Note, m: number) => 2 ** ((m - n.pitch) / 12)

// One note at time t, like `strike` in instruments.ts.
export function strikeRecorded(
  ctx: AudioContext,
  out: AudioNode,
  rec: Recorded,
  f: number,
  t: number,
  gap: number,
  vol: number,
) {
  const m = midiOf(f)
  const n = nearest(rec.notes, m)
  const src = ctx.createBufferSource()
  src.buffer = n.buffer
  src.playbackRate.value = rate(n, m)
  const g = ctx.createGain()
  src.connect(g).connect(out)
  const held = HELD.includes(rec.id)
  g.gain.setValueAtTime(vol * (held ? 4.5 : 1.35), t)
  // Held notes stop as the next begins; struck ones ring on a little.
  if (held) g.gain.setTargetAtTime(0, t + Math.max(0.08, gap * 0.85), 0.05)
  else g.gain.setTargetAtTime(0, t + Math.max(gap * 3, 0.6), 0.15)
  src.start(t)
}

// Where each recording loops when held: a stretch of its steady middle,
// with its end blended into the part before the loop starts so the jump
// back can't be heard.
const LOOP = { start: 0.6, end: 2.4, blend: 0.3 }
const looped = new WeakMap<AudioBuffer, AudioBuffer>()
function loopable(b: AudioBuffer) {
  let l = looped.get(b)
  if (!l) {
    l = new AudioBuffer({
      length: b.length,
      sampleRate: b.sampleRate,
      numberOfChannels: 1,
    })
    const x = b.getChannelData(0)
    const y = l.getChannelData(0)
    y.set(x)
    const sr = b.sampleRate
    const s = Math.floor(LOOP.start * sr)
    const e = Math.floor(LOOP.end * sr)
    const n = Math.floor(LOOP.blend * sr)
    for (let i = 0; i < n; i++) {
      const w = i / n
      y[e - n + i] =
        x[e - n + i] * Math.sqrt(1 - w) + x[s - n + i] * Math.sqrt(w)
    }
    looped.set(b, l)
  }
  return l
}

// A held recorded note that glides, like `glider` in instruments.ts. When
// the pitch moves well past the current recording, it fades over to the
// nearer one.
export function gliderRecorded(
  ctx: AudioContext,
  out: AudioNode,
  rec: Recorded,
  f: number,
  t: number,
): Glider {
  const all = ctx.createGain()
  all.gain.value = 0.75
  all.connect(out)
  let m = midiOf(f)
  const voice = (n: Note, t: number, from: number, offset: number) => {
    const src = ctx.createBufferSource()
    src.buffer = loopable(n.buffer)
    src.loop = true
    src.loopStart = LOOP.start
    src.loopEnd = LOOP.end
    src.playbackRate.setValueAtTime(rate(n, from), t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(1, t + 0.06)
    src.connect(g).connect(all)
    src.start(t, offset)
    return { n, src, g }
  }
  let now = voice(nearest(rec.notes, m), t, m, 0)
  return {
    to: (f, t, speed) => {
      const next = midiOf(f)
      const n = nearest(rec.notes, next)
      if (
        n !== now.n &&
        Math.abs(next - now.n.pitch) - Math.abs(next - n.pitch) > 1
      ) {
        now.g.gain.setTargetAtTime(0, t, 0.03)
        now.src.stop(t + 0.3)
        now = voice(n, t, m, LOOP.start - 0.2)
      }
      now.src.playbackRate.setTargetAtTime(rate(now.n, next), t, speed)
      m = next
    },
    release: (t) => all.gain.setTargetAtTime(0, t, 0.08),
  }
}
