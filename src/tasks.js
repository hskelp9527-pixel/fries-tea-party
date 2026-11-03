import * as THREE from 'three/webgpu'
import { uv, vec3, float, smoothstep, max, abs, time, sin, uniform } from 'three/tsl'
import { scene, camera } from './scene.js'
import { RAPIER, world } from './physics.js'
import { model, addColliders } from './models.js'
import { things, gears, cups } from './garden.js'
import { player, act, walkTo, anim } from './player.js'
import { cast, chairs, standUp, sitDown } from './cast.js'
import { say, burst, ting } from './audio.js'
import { tween, wait } from './tweens.js'
import { underTable, grotto, hall, overlook, song as songSpot } from './layout.js'
import { stream, surface, TEA } from './liquids.js'
import { random } from './fields.js'
import { game } from './state.js'

// The tasks at each place. Each place first shows what Fries cannot do yet: a glint on every missing gear (the one
// under the table between the legs, the one on the hat rack's top hat high on the porch), a light and ticking
// behind the grotto's tiny arch; Fries plays `found` when he first spots one.
const rand = random(31)
const DEG = Math.PI / 180

// Glints: a soft star on each missing gear, kept a steady size on screen so it reads from far off; brighter for a
// big Fries on the overlook, who sees the whole garden.
const star = Fn => Fn
const glintMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
const p = uv().sub(0.5).mul(2)
const rays = max(smoothstep(0.12, 0, abs(p.x)).mul(smoothstep(1, 0, abs(p.y))), smoothstep(0.12, 0, abs(p.y)).mul(smoothstep(1, 0, abs(p.x))))
glintMaterial.colorNode = vec3(1, 0.85, 0.5).mul(rays.add(smoothstep(0.35, 0, p.length())).mul(sin(time.mul(4)).mul(0.3).add(0.9))).mul(3)
glintMaterial.depthTest = true
const glints = gears.map(g => {
  const s = new THREE.Sprite(glintMaterial)
  s.position.copy(g.pos)
  scene.add(s)
  return s
})
const ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })
const eye = new THREE.Vector3(), to = new THREE.Vector3(), view = new THREE.Vector3()
const visible = point => {
  eye.copy(player.feet).setY(player.feet.y + 1.1 * player.p.scale)
  to.subVectors(point, eye)
  const length = to.length()
  ray.origin = eye
  ray.dir = to.divideScalar(length)
  return world.castRay(ray, length - 0.05, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS) === null
}
const spotted = new Set()
function updateGlints() {
  const onOverlook = player.size === 'big' && Math.hypot(player.feet.x - overlook[0], player.feet.z - overlook[1]) < overlook[2]
  camera.getWorldDirection(view)
  gears.forEach((g, i) => {
    const s = glints[i]
    s.visible = !g.found
    if (g.found) return
    const d = camera.position.distanceTo(g.pos)
    s.scale.setScalar(Math.min(0.5, 0.012 * d) * (onOverlook ? 4 : 1))
    // Spotting it: in front of him, near enough for his size, nothing between.
    if (player.control && !spotted.has(g) && d < 9 * player.p.scale && to.subVectors(g.pos, camera.position).normalize().dot(view) > 0.85 && visible(g.pos)) {
      spotted.add(g)
      act('found')
    }
  })
}

// Under the long table: crumbs on the floorcloth, and gear 1 on a saucer balanced on an upturned teacup, too high
// for a small Fries until the March Hare's huge hand lays a spoon down to it as a bridge.
const crumbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xc8955a, roughness: 0.9 }), 260)
const [cx0, cz0, cx1, cz1] = underTable.crumbs, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
for (let i = 0; i < crumbs.count; i++) {
  const size = 0.004 + rand() ** 3 * 0.014
  crumbs.setMatrixAt(i, m4.compose(new THREE.Vector3(cx0 + rand() * (cx1 - cx0), size * 0.5, cz0 + rand() * (cz1 - cz0)), q.setFromEuler(e.set(rand() * 6, rand() * 6, rand() * 6)), new THREE.Vector3(size, size * 0.7, size * 1.2)))
  crumbs.setColorAt(i, new THREE.Color().setHSL(0.08, 0.5, 0.35 + rand() * 0.3))
}
crumbs.receiveShadow = true
scene.add(crumbs)
const [ux, uz] = underTable.cup
const cup = model('teacup'), saucer = model('saucer')
cup.position.set(ux, 0.07, uz)
cup.rotation.x = Math.PI
saucer.position.set(ux, 0.09, uz)
saucer.rotation.x = Math.PI
scene.add(cup, saucer)
addColliders('teacup', cup)
addColliders('saucer', saucer)
const [low, high] = underTable.spoon.map(a => new THREE.Vector3(...a))
const spoon = model('spoon')
spoon.scale.setScalar(1.8)
const run = high.clone().sub(low), slope = Math.atan2(run.y, Math.hypot(run.x, run.z))
spoon.rotation.set(0, Math.atan2(-run.z, run.x), slope, 'YXZ')
const tabletop = new THREE.Vector3(ux + 0.9, 0.78, uz)
spoon.position.copy(tabletop)
scene.add(spoon)
let bridged = false
async function layBridge() {
  bridged = true
  say('SZ-05', cast.hare.object.position.distanceTo(player.feet))
  await tween(1.6, t => {
    const k = t * t * (3 - 2 * t)
    spoon.position.lerpVectors(tabletop, low, k)
    spoon.position.y += Math.sin(k * Math.PI) * 0.15
  })
  spoon.updateMatrixWorld(true)
  const middle = low.clone().lerp(high, 0.5), length = run.length()
  world.createCollider(RAPIER.ColliderDesc.cuboid(length / 2 + 0.03, 0.004, 0.025).setTranslation(middle.x, middle.y, middle.z).setRotation(spoon.quaternion))
}

// The grotto under the fountain's basin: a wet stone floor, syrup dripping from the basin's underside, moss, and
// a little valve with gear 2 jammed in its wheel, lit warm and ticking, which shows through the arch.
const fountain = things.fountain.position
const wet = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3d3c44, roughness: 0.12, metalness: 0.1 }))
wet.position.set(fountain.x, 0.004, fountain.z)
scene.add(wet)
const brass = new THREE.MeshStandardMaterial({ color: 0xc89a48, metalness: 0.8, roughness: 0.35 })
const [vx, vz] = grotto.valve
const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 10), brass)
pipe.position.set(vx + 0.045, 0.2, vz)
const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.005, 6, 20).rotateX(Math.PI / 2), brass)
wheel.position.set(vx + 0.045, 0.024, vz)
for (let k = 0; k < 4; k++) wheel.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.006).rotateY(k * Math.PI / 4), brass))
const lamp = new THREE.PointLight(0xffb060, 1.2, 1.8)
lamp.position.set(vx, 0.18, vz)
scene.add(pipe, wheel, lamp)
const moss = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 1 }), 40)
for (let i = 0; i < moss.count; i++) {
  const a = rand() * Math.PI * 2, r = 0.95 + rand() * 0.15, s = 0.02 + rand() * 0.04
  moss.setMatrixAt(i, m4.compose(new THREE.Vector3(fountain.x + Math.cos(a) * r, s * 0.3, fountain.z + Math.sin(a) * r), q.identity(), new THREE.Vector3(s, s * 0.35, s)))
}
scene.add(moss)
const drip = new THREE.MeshPhysicalMaterial({ color: 0xe8901c, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.85 })
const drips = Array.from({ length: 6 }, () => {
  const a = rand() * Math.PI * 2, r = rand() * 0.8
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4).scale(1, 1.6, 1), drip)
  d.userData = { x: fountain.x + Math.cos(a) * r, z: fountain.z + Math.sin(a) * r, phase: rand() }
  scene.add(d)
  return d
})
let ticking = 0

// The cottage's hall, at normal size: buttered tools, a clock with butter in it, a note.
const house = things.house
house.updateMatrixWorld(true)
for (const { model: name, at, rot = 0, scale = 1 } of hall) {
  const object = model(name)
  object.position.copy(house.localToWorld(new THREE.Vector3(...at)))
  object.rotation.y = house.rotation.y + rot * DEG
  object.scale.setScalar(scale)
  scene.add(object)
}

// The tea service, at the table once the first gear is back: the Hatter gets up and conducts three teapots that
// float over the table in front of Fries; one at a time, in time, a teapot tilts and pours, and Fries steps (A and
// D) to hold his cup under it. Six pours: a catch fills the cup a little more, a miss splashes on the cloth.
const LANES = [-0.42, 0, 0.42], POURS = 6
const pots = ['teapot', 'pink_teapot', 'blue_teapot']
export const teaService = {
  pos: new THREE.Vector3(...songSpot.fries.pos), label: 'Hold out a cup for the tea service',
  can: () => game.gears >= 1 && player.size === 'normal' && teaService.pos.distanceTo(player.feet) < 1,
  use: () => serve(),
}
let lane = 1, serving = false
addEventListener('keydown', e => {
  if (!serving) return
  if (e.code === 'KeyA') lane = Math.max(0, lane - 1)
  if (e.code === 'KeyD') lane = Math.min(2, lane + 1)
})
async function serve() {
  serving = true
  player.control = false
  const spot = new THREE.Vector3(...songSpot.fries.pos), across = new THREE.Vector3(0, 0, 1)
  const at = k => spot.clone().addScaledVector(across, LANES[k])
  await walkTo(at(1).toArray(), 90)
  player.cinematic = true
  camera.fov = 55
  camera.updateProjectionMatrix()
  camera.position.set(spot.x - 1.6, 1.7, spot.z + 0.5)
  camera.lookAt(spot.x + 0.8, 0.9, spot.z)
  act('reach')
  await wait(3.9)
  anim.hold('reach')
  const held = cups[5], home = held.position.clone(), tea = surface(held, new THREE.Vector3(0, 0.02, 0), 0.034, 0.06, { fill: 0 })
  const hatterChair = cast.hatter.chair
  await standUp('hatter')
  cast.hatter.doing = 'conduct'
  const potHome = pots.map(n => ({ object: things[n], pos: things[n].position.clone(), rot: things[n].rotation.y }))
  const over = k => at(k).add(new THREE.Vector3(0.65, 1.05, 0))
  cast.hatter.aim = over(1)
  await Promise.all(potHome.map(({ object }, k) => {
    object.rotation.y = -90 * DEG
    return tween(1.2, t => object.position.lerpVectors(potHome[k].pos, over(k), t * t * (3 - 2 * t)))
  }))
  let caught = 0
  for (let n = 0; n < POURS; n++) {
    const k = Math.floor(rand() * 3), pot = potHome[k].object
    const stepTo = lane
    await tween(0.3, () => {
      player.feet.lerp(at(lane), 0.25)
      held.position.copy(player.feet).add(new THREE.Vector3(0.42, 0.95, 0))
    })
    cast.hatter.aim = over(k)
    await tween(0.45, t => { pot.rotation.z = -0.8 * t })
    const spout = pot.localToWorld(new THREE.Vector3(0, 0.2, 0.172)), landing = at(k).add(new THREE.Vector3(0.42, 0.98, 0))
    const pour = stream(spout, landing, { height: 0.02, radius: 0.007, colour: TEA })
    await tween(0.6, () => {
      player.feet.lerp(at(lane), 0.25)
      held.position.copy(player.feet).add(new THREE.Vector3(0.42, 0.95, 0))
    })
    pour.remove()
    if (lane === k) {
      caught++
      ting(1100 + caught * 120)
      tea.set(caught / POURS)
    } else {
      burst(5, 0.6)
      const splash = stream(landing.clone().setY(landing.y + 0.05), landing.clone().setY(0.77), { height: 0, radius: 0.004, colour: TEA })
      wait(0.6).then(() => splash.remove())
    }
    await tween(0.35, t => { pot.rotation.z = -0.8 * (1 - t) })
    await wait(0.6 + stepTo * 0)
  }
  document.getElementById('hud').textContent = `Tea service ${caught}/${POURS}`
  await Promise.all(potHome.map(({ object, pos, rot }) => {
    const from = object.position.clone()
    object.rotation.z = 0
    return tween(1, t => object.position.lerpVectors(from, pos, t)).then(() => { object.rotation.y = rot })
  }))
  cast.hatter.doing = null
  cast.hatter.aim = null
  tea.remove()
  held.position.copy(home)
  anim.hold('reach', false)
  await sitDown('hatter', hatterChair)
  player.cinematic = false
  player.control = true
  serving = false
}

export function updateTasks(dt, clock) {
  updateGlints()
  // The spoon bridge, the first time a small Fries comes near the cup under the table.
  if (!bridged && player.size === 'small' && Math.hypot(player.feet.x - ux, player.feet.z - uz) < 0.6) layBridge()
  // The grotto ticks while gear 2 is still in its valve.
  const near = Math.hypot(player.feet.x - vx, player.feet.z - vz)
  if (!gears[1].found && near < 5 && (ticking -= dt) < 0) {
    ticking = 1
    burst(7, 0.35 * (1 - near / 5))
  }
  for (const d of drips) {
    const k = (clock * 0.7 + d.userData.phase) % 1
    d.position.set(d.userData.x, 0.41 - 0.4 * k * k, d.userData.z)
  }
}
