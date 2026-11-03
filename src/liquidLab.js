import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { renderer } from './scene.js'
import { stream, surface, sheet, updateLiquids, liquidDebug, TEA } from './liquids.js'
import potURL from '../../tea_party/art/models/pink_teapot.glb?url'
import cupURL from '../../tea_party/art/models/teacup.glb?url'

// Visual contract: downward advection without post, attached spout, falling tail,
// contained fill, and identical local proportions/timing at 1x and 0.18x.
// Fixed procedural fields, resettable clocks, 0.02--4 m orbit envelope; target 16.7 ms.
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xcce9ef)
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.002, 30)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.minDistance = 0.02
controls.maxDistance = 4
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
const environment = pmrem.fromScene(room)
scene.environment = environment.texture
scene.environmentIntensity = 0.55
room.dispose(); pmrem.dispose()
scene.add(new THREE.HemisphereLight(0xe8f7ff, 0xc4ad7a, 2))
const sun = new THREE.DirectionalLight(0xffedce, 3)
sun.position.set(-2, 4, 2)
sun.castShadow = true
sun.shadow.mapSize.setScalar(2048)
Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.1, far: 8 })
sun.shadow.normalBias = 0.001
scene.add(sun)
function solid(geometry, colour, parent = scene) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55 }))
  mesh.castShadow = mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
const table = solid(new THREE.BoxGeometry(1.8, 0.05, 0.95), 0xd1a878)
table.position.y = -0.027
const ground = solid(new THREE.PlaneGeometry(20, 20), 0xc3d19b)
ground.rotation.x = -Math.PI / 2
ground.position.y = -0.8
for (const x of [-0.75, 0.75]) for (const z of [-0.35, 0.35]) {
  const leg = solid(new THREE.BoxGeometry(0.045, 0.75, 0.045), 0xa87a50)
  leg.position.set(x, -0.42, z)
}

const loader = new GLTFLoader()
const [potAsset, cupAsset] = await Promise.all([loader.loadAsync(potURL), loader.loadAsync(cupURL)])
function asset(source, parent) {
  const object = source.scene.clone(true)
  object.traverse(o => {
    if (o.name.endsWith('_collider')) o.visible = false
    if (o.isMesh) o.castShadow = o.receiveShadow = true
  })
  parent.add(object)
  return object
}
const demos = []
function pouringDemo(x, z, scale) {
  const root = new THREE.Group()
  root.position.set(x, 0, z)
  root.scale.setScalar(scale)
  scene.add(root)
  const pot = asset(potAsset, root), cup = asset(cupAsset, root)
  cup.position.set(0, 0, 0.21)
  const tea = surface(cup, new THREE.Vector3(0, 0.012, 0), 0.042, 0.061, { fill: 0, hot: true })
  const from = new THREE.Vector3(), to = new THREE.Vector3()
  // Positive X tips the +Z spout down. The mouth remains over the cup centre.
  function pose(tilt) {
    pot.rotation.x = tilt
    const offset = new THREE.Vector3(0, 0.20, 0.172).applyEuler(pot.rotation)
    pot.position.set(-offset.x, 0.26 - offset.y, 0.17 - offset.z)
    pot.updateMatrix()
    from.set(0, 0.20, 0.172).applyMatrix4(pot.matrix)
    to.set(0, tea.disc.position.y + 0.001, 0.21)
  }
  pose(0)
  const pour = stream(from, to, { parent: root, radius: 0.0045, height: 0, colour: TEA })
  const d = { time: 0, root, pour,
    reset() {
      d.time = 0; tea.set(0); tea.run.value = 0; pour.run.value = 0
      pose(0); pour.start(); pour.stop()
    },
    update(dt) {
      const previous = d.time
      d.time += dt
      const t = d.time
      const tilt = t < 1 ? THREE.MathUtils.smoothstep(t, 0, 1) * 0.85 : 0.85 * (1 - THREE.MathUtils.smoothstep(t, 5.6, 6.5))
      if (previous < 1 && t >= 1) pour.start()
      if (previous < 5.5 && t >= 5.5) pour.stop()
      tea.set(THREE.MathUtils.clamp((t - 1.25) / 4.25, 0, 1))
      // Once stopped the detached tail retains its last emitted trajectory.
      if (t <= 5.5) pose(tilt)
      else pot.rotation.x = tilt
    } }
  demos.push(d); d.reset()
  return d
}
const full = pouringDemo(-0.5, -0.09, 1)
const small = pouringDemo(-0.15, 0.2, 0.18)

// Open lathed vessels give the sheet a visible lip and a receiving basin.
function bowl(parent, radius, height) {
  const points = [[0, 0], [0.45, 0], [0.8, 0.3], [1, 1], [0.94, 1], [0.74, 0.35], [0.4, 0.12], [0, 0.12]]
    .map(([x, y]) => new THREE.Vector2(x * radius, y * height))
  return solid(new THREE.LatheGeometry(points, 96), 0xe6ddd0, parent)
}
const fountain = new THREE.Group()
fountain.position.set(0.39, 0, -0.03)
scene.add(fountain)
bowl(fountain, 0.25, 0.09)
const pedestal = solid(new THREE.CylinderGeometry(0.035, 0.055, 0.19, 32), 0xc7b7aa, fountain)
pedestal.position.y = 0.18
const upper = bowl(fountain, 0.135, 0.09)
upper.position.y = 0.23
const upperTea = surface(upper, new THREE.Vector3(0, 0.016, 0), 0.126, 0.09, { fill: 0.2 })
const lowerTea = surface(fountain, new THREE.Vector3(0, 0.02, 0), 0.214, 0.065, { fill: 0.3 })
const curtain = sheet(new THREE.Vector3(), 0.13, 0.32, 0.065, { parent: fountain, colour: TEA })
const feed = stream(new THREE.Vector3(-0.06, 0.47, -0.045), new THREE.Vector3(0, 0.305, 0), { parent: fountain, radius: 0.006, height: 0.005 })
const overflow = { time: 0,
  reset() {
    overflow.time = 0
    for (const s of [feed, curtain, upperTea, lowerTea]) { s.run.value = 0; s.frozen = true }
    feed.start(); feed.update(0)
  },
  update(dt) {
    overflow.time += dt
    const t = overflow.time, frozen = t < 2
    for (const s of [feed, curtain, upperTea, lowerTea]) s.frozen = frozen
    // Two seconds of suspended glass, then the same pieces resume their clocks.
    upperTea.set(0.2 + 0.8 * THREE.MathUtils.clamp((t - 2) / 2, 0, 1))
    lowerTea.set(0.3 + 0.7 * THREE.MathUtils.clamp((t - 4) / 5, 0, 1))
    curtain.set(t < 2 ? 1 : THREE.MathUtils.clamp((t - 3.8) / 0.4, 0, 1))
  } }
demos.push(overflow)
overflow.reset()

const panel = document.createElement('div')
panel.style.cssText = 'position:fixed;left:16px;top:12px;color:#342619;background:#fff9;padding:12px;font:14px/1.6 system-ui;pointer-events:none'
panel.textContent = 'Liquid lab | 1: full-size tea | 2: 0.18x tea | 3: frozen overflow | Space: pause | D: flow / normals | C: camera | Mouse: orbit / zoom'
document.body.append(panel)
document.getElementById('start').remove()
const metrics = document.createElement('div')
panel.append(metrics)
const bookmarks = [
  [[1.15, 0.95, 1.7], [0, 0.16, 0]],
  [[-0.06, 0.08, 0.35], [-0.15, 0.03, 0.23]],
  [[0.75, 0.48, 0.6], [0.39, 0.19, -0.03]],
]
let bookmark = -1, paused = false
function view() {
  bookmark = (bookmark + 1) % bookmarks.length
  camera.position.fromArray(bookmarks[bookmark][0]); controls.target.fromArray(bookmarks[bookmark][1]); controls.update()
}
view()
addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); paused = !paused }
  if (event.code === 'KeyD') liquidDebug.value = (liquidDebug.value + 1) % 3
  if (event.code === 'KeyC') view()
  if (['Digit1', 'Digit2', 'Digit3'].includes(event.code)) demos[Number(event.key) - 1].reset()
})
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() })
addEventListener('error', event => { metrics.textContent = event.message })
let last
renderer.setAnimationLoop(now => {
  const dt = last === undefined ? 0 : Math.min((now - last) / 1000, 0.05)
  last = now
  if (!paused) {
    for (const d of demos) d.update(dt)
    updateLiquids(dt)
  }
  controls.update()
  renderer.render(scene, camera)
  metrics.textContent = `${renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2'} | ${renderer.info.render.drawCalls} calls | ${renderer.info.render.triangles} triangles | ${paused ? 'Paused' : 'Running'} | No post`
})
