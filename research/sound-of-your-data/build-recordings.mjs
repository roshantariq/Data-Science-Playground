// Cuts the downloaded recordings into short, even MP3 notes named by MIDI
// note number, plus tuning.json: how many cents each recording is off.
// Needs ffmpeg (on the PATH, or set FFMPEG to its path).
// Usage: node build-recordings.mjs <download folder> <out folder>
// The download folder holds one folder per instrument; see README.md.
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
const [raw, out] = process.argv.slice(2)
const SR = 44100
// seconds kept, and whether loudness is set by the sustain (held) or peak
const KIND = {
  clarinet: { len: 2.6, held: true },
  sax: { len: 2.6, held: true },
  trumpet: { len: 2.6, held: true },
  cello: { len: 2.6, held: true },
  organ: { len: 2.6, held: true },
  piano: { len: 2.2, held: false },
  marimba: { len: 1.3, held: false },
  harp: { len: 2.2, held: false },
  guitar: { len: 1.8, held: false, firstNote: true },
}
const NAMES = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
}
const midiOf = (n) => {
  const m = /^([A-G])(b|#)?(\d)$/.exec(n)
  if (!m) return null
  const shift = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return 12 * (+m[3] + 1) + NAMES[m[1]] + shift
}

const decode = (f) => {
  const buf = execFileSync(
    ffmpeg,
    ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'],
    { maxBuffer: 1 << 30 },
  )
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
}
const envelope = (x, win = 441) => {
  const e = new Float32Array(Math.floor(x.length / win))
  for (let k = 0; k < e.length; k++) {
    let s = 0
    for (let i = k * win; i < (k + 1) * win; i++) s += x[i] * x[i]
    e[k] = Math.sqrt(s / win)
  }
  return e // one value per 10 ms
}
// YIN pitch estimate over a window
function pitch(x, from, n = 4096) {
  const maxLag = Math.floor(SR / 50)
  const d = new Float32Array(maxLag)
  for (let L = 1; L < maxLag; L++) {
    let s = 0
    for (let i = from; i < from + n; i++) {
      const v = x[i] - x[i + L]
      s += v * v
    }
    d[L] = s
  }
  let run = 0
  const cm = new Float32Array(maxLag)
  cm[0] = 1
  for (let L = 1; L < maxLag; L++) {
    run += d[L]
    cm[L] = (d[L] * L) / run
  }
  for (let L = Math.floor(SR / 2500); L < maxLag - 1; L++)
    if (cm[L] < 0.15) {
      while (L + 1 < maxLag && cm[L + 1] < cm[L]) L++
      const a = cm[L - 1],
        b = cm[L],
        c = cm[L + 1]
      const shift = (a - c) / (2 * (a - 2 * b + c))
      return SR / (L + shift)
    }
  return null
}

// Evens out a held note's loudness after its first 0.3 s, so a loop of its
// middle doesn't pulse (some notes swell or fade as they're held). The
// loudness is measured over 250 ms, longer than a vibrato wobble.
function steady(y) {
  const env = envelope(y)
  const smooth = env.map((_, k) => {
    let s = 0
    let n = 0
    for (
      let j = Math.max(0, k - 12);
      j <= Math.min(env.length - 1, k + 12);
      j++
    ) {
      s += env[j]
      n++
    }
    return s / n
  })
  const sorted = [...smooth.slice(50, 240)].sort((a, b) => a - b)
  const target = sorted[Math.floor(sorted.length / 2)] // the median
  for (let i = Math.floor(0.3 * SR); i < y.length; i++) {
    const k = Math.min(smooth.length - 1, Math.floor(i / 441))
    const w = Math.min(1, (i / SR - 0.3) / 0.2) // ease in over 0.2 s
    const g = Math.max(0.5, Math.min(3, target / smooth[k]))
    y[i] *= 1 + (g - 1) * w
  }
}

rmSync(out, { recursive: true, force: true })
const report = []
const tuning = {}
for (const inst of readdirSync(raw)) {
  const kind = KIND[inst]
  mkdirSync(join(out, inst), { recursive: true })
  for (const file of readdirSync(join(raw, inst))) {
    const x = decode(join(raw, inst, file))
    const env = envelope(x)
    let peak = 0
    for (const v of env) peak = Math.max(peak, v)
    let on = env.findIndex((v) => v > peak * 0.05)
    const start = Math.max(0, on * 441 - 220)
    let end = start + Math.floor(kind.len * SR)
    if (kind.firstNote) {
      // stop before the next note in the run: the envelope rises sharply
      // again after falling
      let low = Infinity
      for (let k = on + 30; k < env.length; k++) {
        low = Math.min(low, env[k])
        if (env[k] > low * 3 && env[k] > peak * 0.1) {
          end = Math.min(end, k * 441 - 2000)
          break
        }
      }
    }
    end = Math.min(end, x.length)
    const y = x.slice(start, end)
    if (kind.held) steady(y)
    const fadeIn = 130,
      fadeOut = Math.floor(0.08 * SR)
    for (let i = 0; i < fadeIn; i++) y[i] *= i / fadeIn
    for (let i = 0; i < fadeOut; i++) y[y.length - 1 - i] *= i / fadeOut
    // loudness: held notes by the sustain's RMS, struck notes by the peak
    let gain
    if (kind.held) {
      let s = 0,
        n = 0
      for (let i = Math.floor(0.5 * SR); i < Math.min(y.length, 2 * SR); i++) {
        s += y[i] * y[i]
        n++
      }
      gain = 0.12 / Math.sqrt(s / n)
    } else {
      let p = 0
      for (const v of y) p = Math.max(p, Math.abs(v))
      gain = 0.7 / p
    }
    for (let i = 0; i < y.length; i++) y[i] *= gain
    const f = pitch(y, Math.floor((kind.held ? 0.6 : 0.15) * SR))
    const detected = f ? 69 + 12 * Math.log2(f / 440) : NaN
    // Note numbers: the organ and piano are numbered by key. The rest are
    // named by note, but some collections (the marimba, clarinet,
    // trumpet and cellos) name them an octave off, so the measured pitch
    // settles the octave.
    const base = file.replace(/\.\w+$/, '')
    const named = midiOf(base)
    const midi =
      inst === 'organ'
        ? 35 + +base
        : inst === 'piano'
          ? 21 + 2 * +base
          : named + 12 * Math.round((detected - named) / 12)
    const shape = []
    if (kind.held)
      for (let k = 0; k + 4410 <= y.length; k += 8820) {
        let q = 0
        for (let i = k; i < k + 4410; i++) q += y[i] * y[i]
        shape.push(Math.sqrt(q / 4410).toFixed(2))
      }
    // How far off the recording is, in cents, ignoring octave slips.
    const off = Number.isFinite(detected)
      ? ((((detected - midi) % 12) + 18) % 12) - 6
      : 0
    const cents = Math.abs(off) < 0.5 ? Math.round(off * 100) : 0
    ;(tuning[inst] ??= {})[midi] = cents
    const name = join(out, inst, `${midi}.mp3`)
    execFileSync(
      ffmpeg,
      [
        '-v',
        'error',
        '-f',
        'f32le',
        '-ar',
        String(SR),
        '-ac',
        '1',
        '-i',
        '-',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '80k',
        name,
      ],
      { input: Buffer.from(y.buffer) },
    )
    report.push(
      `${inst.padEnd(8)} ${file.padEnd(8)} midi ${midi}  measured ${detected.toFixed(2)} (${cents >= 0 ? '+' : ''}${cents} cents)  ${(y.length / SR).toFixed(2)} s  ${(statSync(name).size / 1024).toFixed(0)} KB  ${shape.join(' ')}`,
    )
  }
}
console.log(report.join('\n'))
writeFileSync(join(out, 'tuning.json'), JSON.stringify(tuning))
