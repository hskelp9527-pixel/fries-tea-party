import * as THREE from 'three/webgpu'
import { uniform, uv, sin, fract, smoothstep, mix, pow, dot, float, vec3, normalView, normalLocal, positionLocal, positionViewDirection, positionWorld, cameraPosition } from 'three/tsl'
import { scene, SUN } from './scene.js'
import { awake, things } from './garden.js'
import { effects, syrup } from './layout.js'

// The liquid system: tea and syrup as glossy, translucent amber streams on falling arcs that thin as they fall
// and break into drops at the end, with splash rings and droplets where they land, and surfaces in cups, bowls
// and the basin that rise as they fill. Each liquid belongs to a world layer (`tea`, `syrup`): until its gear
// wakes the layer it hangs frozen like glass; live pours (a teapot pouring into Fries's cup) always run.
export const TEA = new THREE.Color(0.5, 0.2, 0.05), SYRUP = new THREE.Color(0.95, 0.5, 0.1)
const sun = uniform(SUN)
const clocks = { tea: uniform(0), syrup: uniform(0), live: uniform(0) }

// The look: more opaque at grazing angles, the low sun glowing through it; `mask` cuts it into drops or streaks.
function material(colour, mask = float(1)) {
  const m = new THREE.MeshPhysicalNodeMaterial({ color: colour, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  const fresnel = pow(float(1).sub(dot(normalView, positionViewDirection).abs().saturate()), 3)
  const through = pow(dot(cameraPosition.sub(positionWorld).normalize(), sun.negate()).saturate(), 2)
  m.opacityNode = mix(0.5, 0.95, fresnel).mul(mask)
  m.emissiveNode = vec3(colour).mul(through.mul(1.4).add(0.12))
  return m
}

// A stream's tube along its curve: rings thinning from `radius` at the lip to 45% where it lands (it speeds up as
// it falls); uv.x runs along it.
function tube(curve, radius, segments = 40, sides = 8) {
  const position = [], normal = [], uvs = [], index = []
  const frames = curve.computeFrenetFrames(segments)
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, p = curve.getPointAt(t), r = radius * (1 - 0.55 * Math.sqrt(t))
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a))
      position.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r)
      normal.push(n.x, n.y, n.z)
      uvs.push(t, j / sides)
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1
    index.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(index)
  return g
}

const ringGeometry = new THREE.RingGeometry(0.75, 1, 32).rotateX(-Math.PI / 2)
const dropGeometry = new THREE.SphereGeometry(1, 8, 6)
const streams = []

// A stream from `from` to `to` (Vector3s) over an arc `height` high, landing in a splash. Returns it, with
// remove() for a live pour.
export function stream(from, to, { height = 0.1, radius = 0.01, colour = TEA, layer = 'live' } = {}) {
  const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.35).setY(Math.max(from.y, to.y) + height), to)
  const run = clocks[layer], along = uv().x
  // Bulges travel down it; past 80% of its length it parts into drops.
  const travel = fract(along.mul(9).sub(run.mul(2.2)))
  const drops = smoothstep(0.8, 0.86, along).mul(smoothstep(0.45, 0.3, fract(along.mul(30).sub(run.mul(3.5)))))
  const m = material(colour, float(1).sub(drops))
  m.positionNode = positionLocal.add(normalLocal.mul(radius * 0.25).mul(sin(travel.mul(Math.PI * 2))))
  const body = new THREE.Mesh(tube(curve, radius), m)
  const rings = [0, 0.5].map(phase => {
    const fade = uniform(1), ring = new THREE.Mesh(ringGeometry, material(colour, fade))
    ring.position.copy(to)
    ring.userData = { phase, fade }
    return ring
  })
  const droplets = Array.from({ length: 5 }, (_, i) => {
    const d = new THREE.Mesh(dropGeometry, body.material)
    d.scale.setScalar(radius * 0.6)
    d.userData.angle = i * 1.26 + Math.random()
    d.userData.phase = Math.random()
    d.position.copy(to)
    return d
  })
  const group = new THREE.Group().add(body, ...rings, ...droplets)
  scene.add(group)
  const s = { group, rings, droplets, to, size: radius * 6, layer, remove: () => { group.removeFromParent(); streams.splice(streams.indexOf(s), 1) } }
  streams.push(s)
  return s
}

// A liquid surface in `parent`: a disc of `radius` at `centre` (in the parent's frame), raised by `fill` (0 to 1)
// from its y up to `top`. remove() takes it away.
export function surface(parent, centre, radius, top, { colour = TEA, fill = 1 } = {}) {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 32).rotateX(-Math.PI / 2), material(colour))
  disc.material.opacityNode = float(0.9)
  parent.add(disc)
  const s = { disc, set: f => disc.position.copy(centre).setY(centre.y + (top - centre.y) * f), remove: () => disc.removeFromParent() }
  s.set(fill)
  return s
}

// A thin sheet spilling over a round lip of `radius` at `top`, falling to `bottom` a little wider, in streaks.
function sheet(centre, radius, top, bottom, colour, layer) {
  const run = clocks[layer]
  const streaks = smoothstep(0.25, 0.6, sin(uv().x.mul(Math.PI * 2 * 23)).mul(0.5).add(0.5).add(sin(uv().x.mul(Math.PI * 2 * 7).add(uv().y.mul(4)).add(run.mul(1.3))).mul(0.25)))
  const m = material(colour, streaks.mul(mix(0.85, 0.5, uv().y.oneMinus())))
  m.positionNode = positionLocal.add(normalLocal.mul(sin(uv().y.mul(18).add(run.mul(6))).mul(0.006)))
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, top - bottom, 64, 10, true), m)
  mesh.position.copy(centre).setY((top + bottom) / 2)
  scene.add(mesh)
}

// Tea frozen mid-pour from the teapots into cups on the table.
for (const a of effects.teaArcs) stream(new THREE.Vector3(...a.from), new THREE.Vector3(...a.to), { height: a.height, radius: 0.011, colour: TEA, layer: 'tea' })

// The fountain: syrup from its teapots' spouts into the cup tier and the basin, sheets over the cup tier's lip,
// pools in the cup tier and the basin. Positions are in the fountain's frame, as [radius, height, angle].
const fountain = things.fountain
fountain.updateMatrixWorld(true)
const at = ([r, y, a]) => fountain.localToWorld(new THREE.Vector3(Math.sin(a * Math.PI / 180) * r, y, Math.cos(a * Math.PI / 180) * r))
for (const s of syrup.streams) stream(at(s.from), at(s.to), { height: s.height, radius: 0.02, colour: SYRUP, layer: 'syrup' })
for (const [radius, top, bottom] of syrup.sheets) sheet(at([0, 0, 0]), radius, top, bottom, SYRUP, 'syrup')
const pools = syrup.pools.map(([radius, low, high]) => surface(scene, at([0, low, 0]), radius, high, { colour: SYRUP, fill: 0 }))

// Golden syrup drops hanging in the air round the fountain; once the syrup wakes they fall into the basin.
const D = syrup.drops
const hanging = new THREE.InstancedMesh(dropGeometry, material(SYRUP), D.count)
const drips = Array.from({ length: D.count }, () => new THREE.Vector3(...D.center.map((c, i) => c + (Math.random() - 0.5) * D.size[i])))
const dripMatrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), dripSize = new THREE.Vector3(0.022, 0.03, 0.022)
function placeDrips() {
  drips.forEach((p, i) => hanging.setMatrixAt(i, dripMatrix.compose(p, turn, dripSize)))
  hanging.instanceMatrix.needsUpdate = true
}
placeDrips()
scene.add(hanging)

export function updateLiquids(dt) {
  if (awake.tea) clocks.tea.value += dt
  if (awake.syrup) {
    clocks.syrup.value += dt
    for (const p of pools) p.set(Math.min(1, clocks.syrup.value / 8))
    for (const p of drips) {
      p.y -= dt * 0.6
      if (p.y < D.center[1] - D.size[1] / 2) p.y = D.center[1] + D.size[1] / 2
    }
    placeDrips()
  }
  clocks.live.value += dt
  // Splashes: rings spreading and fading where each running stream lands, droplets hopping out of it.
  for (const s of streams) {
    const run = clocks[s.layer].value, running = s.layer === 'live' || awake[s.layer]
    for (const ring of s.rings) {
      const k = fract1(run * 1.6 + ring.userData.phase)
      ring.visible = running
      ring.scale.setScalar(s.size * (0.3 + k))
      ring.userData.fade.value = 1 - k
    }
    for (const d of s.droplets) {
      const k = fract1(run * 1.4 + d.userData.phase), a = d.userData.angle
      d.visible = running
      d.position.copy(s.to).add(new THREE.Vector3(Math.cos(a) * s.size * k, s.size * 2.2 * k * (1 - k), Math.sin(a) * s.size * k))
    }
  }
}
const fract1 = x => x - Math.floor(x)
