// The Ski Slope's 3D view, drawn with Three.js. Imperative on purpose: React
// owns the controls, this owns the canvas. It draws only when something
// changes (no constant animation loop), and takes every colour from the
// site's CSS variables so both themes work.
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  TOUCH,
  Vector2,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Landscape, Step } from './slopes.ts'

const RISE = 0.7 // how tall the landscape is drawn (its height runs 0 to 1)
const SEGMENTS = 96
const LINES = 16 // grid lines across the surface each way
const FIT_UP = 0.95
const FIT_ACROSS = 1.55
const BALL = 0.045
const DOT = 0.014
const MAX_DOTS = 400
const TAP_PX = 6 // a press that moves less than this is a tap, not a turn

const at = (x: number, y: number, z: number, lift = 0) =>
  [x, z * RISE + lift, y] as const

export type SlopeView = {
  setLandscape: (land: Landscape) => void
  setStart: (p: { x: number; y: number }) => void
  // The path so far; the ball sits on its last step.
  setPath: (steps: Step[]) => void
  dispose: () => void
}

// Returns null when the browser can't draw 3D (no WebGL).
export function createSlopeView(
  host: HTMLElement,
  onTap: (p: { x: number; y: number }) => void,
): SlopeView | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  host.appendChild(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(38, 1, 0.1, 20)
  camera.position.set(1.6, 1.55, 1.85)
  scene.add(new AmbientLight(0xffffff, 1.1))
  const sun = new DirectionalLight(0xffffff, 2.6)
  sun.position.set(-1.5, 3, 1)
  scene.add(sun)

  // The landscape: a grid lifted to the surface's height, shaded by height.
  const plane = new PlaneGeometry(2, 2, SEGMENTS, SEGMENTS)
  plane.rotateX(-Math.PI / 2)
  const count = plane.attributes.position.count
  plane.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(count * 3), 3),
  )
  const ground = new Mesh(
    plane,
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }),
  )
  scene.add(ground)

  // Grid lines draped over the surface, so its shape reads from any angle.
  const mesh = new LineSegments(new BufferGeometry(), new LineBasicMaterial())
  scene.add(mesh)

  const startRing = new Mesh(
    new RingGeometry(0.035, 0.055, 32),
    new MeshBasicMaterial({ side: DoubleSide }),
  )
  startRing.rotateX(-Math.PI / 2)
  scene.add(startRing)

  const ball = new Mesh(
    new SphereGeometry(BALL, 24, 16),
    new MeshLambertMaterial(),
  )
  scene.add(ball)

  const trail = new Line(new BufferGeometry(), new LineBasicMaterial())
  scene.add(trail)
  const dots = new InstancedMesh(
    new SphereGeometry(DOT, 10, 8),
    new MeshBasicMaterial(),
    MAX_DOTS,
  )
  dots.count = 0
  scene.add(dots)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, RISE * 0.35, 0)
  controls.enablePan = false
  controls.enableZoom = false
  controls.minPolarAngle = 0.25
  controls.maxPolarAngle = 1.35
  // Phones: one finger scrolls the page and taps; two fingers turn the view.
  controls.touches = { ONE: null, TWO: TOUCH.DOLLY_ROTATE }
  renderer.domElement.style.touchAction = 'pan-y'
  controls.update()

  let land: Landscape | null = null
  const draw = () => renderer.render(scene, camera)
  controls.addEventListener('change', draw)

  // Colours from the page, redone when the theme changes. The variables hold
  // light/dark pairs, so each is resolved through a hidden probe element,
  // whose computed colour is a plain rgb() value.
  const probe = document.createElement('span')
  probe.hidden = true
  host.appendChild(probe)
  const css = (name: string) => {
    probe.style.color = `var(${name})`
    return new Color(getComputedStyle(probe).color)
  }
  let low = new Color()
  let high = new Color()
  function paint() {
    low = css('--mark')
    high = css('--surface').lerp(css('--text-muted'), 0.55)
    const ink = css('--text')
    ;(ball.material as MeshLambertMaterial).color = ink
    ;(trail.material as LineBasicMaterial).color = ink
    ;(dots.material as MeshBasicMaterial).color = ink
    ;(startRing.material as MeshBasicMaterial).color = css('--feel-mark')
    ;(mesh.material as LineBasicMaterial).color = css('--surface')
    if (land) shade()
    draw()
  }

  function shade() {
    if (!land) return
    const pos = plane.attributes.position
    const col = plane.attributes.color
    const c = new Color()
    for (let i = 0; i < count; i++) {
      const z = land.height(pos.getX(i), pos.getZ(i))
      pos.setY(i, z * RISE)
      c.copy(low).lerp(high, Math.min(1, z * 1.6))
      col.setXYZ(i, c.r, c.g, c.b)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    plane.computeVertexNormals()
    plane.computeBoundingSphere()

    const lines: number[] = []
    const cut = (i: number) => -1 + (2 * i) / LINES
    const fine = (j: number) => -1 + (2 * j) / SEGMENTS
    for (let i = 0; i <= LINES; i++) {
      for (let j = 0; j < SEGMENTS; j++) {
        const [a, b, c] = [cut(i), fine(j), fine(j + 1)]
        lines.push(...at(a, b, land.height(a, b), 0.003))
        lines.push(...at(a, c, land.height(a, c), 0.003))
        lines.push(...at(b, a, land.height(b, a), 0.003))
        lines.push(...at(c, a, land.height(c, a), 0.003))
      }
    }
    mesh.geometry.dispose()
    mesh.geometry = new BufferGeometry()
    mesh.geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(lines), 3),
    )
  }

  const watch = new MutationObserver(paint)
  watch.observe(document.documentElement, { attributeFilter: ['data-theme'] })
  const scheme = window.matchMedia('(prefers-color-scheme: dark)')
  scheme.addEventListener('change', paint)

  const size = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = host
    if (!w || !h) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    // Step back just far enough for the whole landscape to fit: it reaches
    // about FIT_UP above and below the centre of view and FIT_ACROSS either
    // side, so narrow views (phones) stand further back.
    const up = (camera.fov * Math.PI) / 360
    const across = Math.atan(Math.tan(up) * camera.aspect)
    const away = camera.position.clone().sub(controls.target)
    away.setLength(
      Math.max(FIT_UP / Math.sin(up), FIT_ACROSS / Math.sin(across)),
    )
    camera.position.copy(controls.target).add(away)
    controls.update()
    draw()
  })
  size.observe(host)

  // A tap or click (not a drag) on the landscape moves the ball's start.
  const ray = new Raycaster()
  let down: { x: number; y: number; id: number } | null = null
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  const onUp = (e: PointerEvent) => {
    if (!down || down.id !== e.pointerId) return
    const far = Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_PX
    down = null
    if (far) return
    const box = renderer.domElement.getBoundingClientRect()
    ray.setFromCamera(
      new Vector2(
        ((e.clientX - box.left) / box.width) * 2 - 1,
        -((e.clientY - box.top) / box.height) * 2 + 1,
      ),
      camera,
    )
    const hit = ray.intersectObject(ground)[0]
    if (hit) onTap({ x: hit.point.x, y: hit.point.z })
  }
  const onCancel = () => (down = null)
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointerup', onUp)
  renderer.domElement.addEventListener('pointercancel', onCancel)

  paint()

  const m = new Matrix4()
  return {
    setLandscape(next) {
      land = next
      shade()
      draw()
    },
    setStart(p) {
      if (!land) return
      startRing.position.set(...at(p.x, p.y, land.height(p.x, p.y), 0.004))
      draw()
    },
    setPath(steps) {
      const last = steps[steps.length - 1]
      ball.position.set(...at(last.x, last.y, last.z, BALL * 0.9))
      const line = steps.flatMap((s) => at(s.x, s.y, s.z, 0.006))
      trail.geometry.dispose()
      trail.geometry = new BufferGeometry()
      trail.geometry.setAttribute(
        'position',
        new BufferAttribute(new Float32Array(line), 3),
      )
      dots.count = Math.min(steps.length, MAX_DOTS)
      for (let i = 0; i < dots.count; i++) {
        const s = steps[i]
        m.makeTranslation(...at(s.x, s.y, s.z, 0.006))
        dots.setMatrixAt(i, m)
      }
      dots.instanceMatrix.needsUpdate = true
      draw()
    },
    dispose() {
      watch.disconnect()
      scheme.removeEventListener('change', paint)
      size.disconnect()
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointercancel', onCancel)
      scene.traverse((o) => {
        if (
          o instanceof Mesh ||
          o instanceof Line ||
          o instanceof InstancedMesh
        ) {
          o.geometry.dispose()
          const mat = o.material
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
          else mat.dispose()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
      probe.remove()
    },
  }
}
