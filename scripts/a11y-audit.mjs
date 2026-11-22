// Accessibility audit of the built site: runs axe-core on every page at phone
// and desktop widths in light and dark, checks for sideways scrolling, and
// tabs through key pages to check keyboard focus is visible.
// Run with `npm run audit:a11y`. Needs Chrome or Edge; set BROWSER to its
// path if it isn't found. Exits with 1 if anything is found.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { preview } from 'vite'

const PAGES = [
  '/',
  '/machines',
  '/feel',
  '/machines/overfitting',
  '/machines/gradient-descent',
  '/feel/typing-rhythm',
  '/feel/sound-of-your-data',
  '/about',
  '/privacy',
  '/no-such-page',
]
const TAB_PAGES = [
  '/',
  '/machines/overfitting',
  '/machines/gradient-descent',
  '/feel/typing-rhythm',
  '/feel/sound-of-your-data',
  '/about',
]
const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
]
const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]
const PORT = 9334
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const AXE = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
)

// Serve dist/ and start a headless browser on a throwaway profile.
const server = await preview({
  preview: { port: 4175, strictPort: true },
  logLevel: 'error',
})
const base = 'http://localhost:4175'
const exe = BROWSERS.find((b) => b && existsSync(b))
if (!exe) throw new Error('No Chrome or Edge found; set BROWSER to its path.')
const profile = mkdtempSync(join(tmpdir(), 'a11y-'))
const browser = spawn(
  exe,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)
let version
for (let i = 0; i < 50 && !version; i++) {
  await wait(200)
  version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
    (r) => r.json(),
    () => null,
  )
}

// A minimal Chrome DevTools Protocol client.
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
let sid
const pending = new Map()
const pageErrors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
  if (m.method === 'Runtime.exceptionThrown')
    pageErrors.push(m.params.exceptionDetails.text)
}
const send = (method, params = {}, session = sid) =>
  new Promise((r) => {
    pending.set(++id, r)
    ws.send(JSON.stringify({ id, method, params, sessionId: session }))
  })
const ev = async (expression) =>
  (
    await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
  ).result.result.value
const { targetId } = (
  await send('Target.createTarget', { url: 'about:blank' }, undefined)
).result
sid = (
  await send('Target.attachToTarget', { targetId, flatten: true }, undefined)
).result.sessionId
await send('Runtime.enable')
const go = async (path) => {
  await send('Page.navigate', { url: base + path })
  await wait(900)
}
const key = async (k) => {
  const ch =
    k === ' '
      ? { key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32 }
      : {
          key: k,
          code: 'Key' + k.toUpperCase(),
          text: k,
          windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0),
        }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...ch })
  await wait(40)
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    ...ch,
    text: undefined,
  })
  await wait(60)
}

const problems = []
async function audit(label) {
  await ev(AXE)
  const found =
    await ev(`axe.run(document, { runOnly: { type: 'tag', values: ${JSON.stringify(TAGS)} } })
    .then((r) => r.violations.map((v) => v.id + ' (' + v.impact + '): ' + v.help + ' -- ' + v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')))`)
  for (const f of found) problems.push(`${label}: ${f}`)
  const extra = await ev('document.documentElement.scrollWidth - innerWidth')
  if (extra > 0) problems.push(`${label}: scrolls sideways by ${extra}px`)
}

for (const mobile of [false, true])
  for (const scheme of ['light', 'dark']) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: mobile ? 360 : 1280,
      height: mobile ? 780 : 900,
      deviceScaleFactor: 1,
      mobile,
    })
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: scheme }],
    })
    const view = `${mobile ? 360 : 1280}px ${scheme}`
    for (const p of PAGES) {
      await go(p)
      await audit(`${view} ${p}`)
    }
    // Typing Rhythm's results: type a round of 5 sentences.
    await go('/feel/typing-rhythm')
    await ev(
      `[...document.querySelectorAll('.typing-bar button')].find((b) => b.textContent === '5').click()`,
    )
    for (let s = 0; s < 5; s++)
      for (const c of await ev(
        `document.querySelector('.typing-target').textContent`,
      ))
        await key(c)
    await wait(1200)
    await audit(`${view} typing results`)
  }

// Typing Rhythm on a touch-only phone shows the sample typists.
await send('Emulation.setDeviceMetricsOverride', {
  width: 360,
  height: 780,
  deviceScaleFactor: 1,
  mobile: true,
})
await send('Emulation.setTouchEmulationEnabled', {
  enabled: true,
  maxTouchPoints: 5,
})
await go('/feel/typing-rhythm')
for (const scheme of ['light', 'dark']) {
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: scheme }],
  })
  await audit(`360px ${scheme} typing samples`)
}
await send('Emulation.setTouchEmulationEnabled', { enabled: false })

// Tab through pages; each stop must show an outline, a shadow, or (for SVG
// shapes) a stroke that differs from its unfocused look.
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
})
for (const p of TAB_PAGES) {
  await go(p)
  for (let i = 0; i < 80; i++) {
    await send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
    })
    const stop = await ev(`(() => {
      const e = document.activeElement
      if (!e || e === document.body) return null
      const look = () => { const c = getComputedStyle(e); return [c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0, c.boxShadow !== 'none', c.stroke + c.strokeWidth] }
      const [outline, shadow, stroke] = look()
      let ok = outline || shadow
      if (!ok && e instanceof SVGElement) { e.blur(); ok = look()[2] !== stroke; e.focus() }
      return { ok, name: e.tagName.toLowerCase() + ' ' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40) }
    })()`)
    if (!stop) break
    if (!stop.ok) problems.push(`${p}: no visible focus on ${stop.name}`)
  }
}
for (const e of pageErrors) problems.push(`page error: ${e}`)

ws.close()
browser.kill()
await server.close()
console.log(
  problems.length ? problems.join('\n') : 'No accessibility problems found.',
)
// Best effort: the browser's helper processes can hold the throwaway
// profile open for a moment after it closes.
await wait(500)
try {
  rmSync(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 300,
  })
} catch {
  console.warn(`Couldn't remove the temporary browser profile at ${profile}.`)
}
process.exit(problems.length ? 1 : 0)
