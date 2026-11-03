import * as THREE from 'three/webgpu'
import { scene, camera } from './scene.js'
import { RAPIER, world } from './physics.js'
import { model, addColliders } from './models.js'
import { things, gears, glints, awake } from './garden.js'
import { player, act, walkTo, anim } from './player.js'
import { cast, standUp, sitDown, laySpoon } from './cast.js'
import { say, burst, ting, playing, heard } from './audio.js'
import { tween, wait } from './tweens.js'
import { underTable, grotto, hall, overlook, song as songSpot } from './layout.js'
import { stream, surface, TEA } from './liquids.js'
import { toHand, release } from './hands.js'
import { random } from './fields.js'
import { game } from './state.js'

// The tasks at each place. Each place first shows what Fries cannot do yet: a glint on every missing gear (the one
// high on the big tree's trunk, the one in the cottage hall), a light and ticking
// behind the grotto's tiny arch; Fries plays `found` when he first spots one.
const rand = random(31)
const DEG = Math.PI / 180

// Glints: a soft star on each missing gear, kept a steady size on screen so it reads from far off; brighter for a
// big Fries on the overlook, who sees the whole garden.
const ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })
const eye = new THREE.Vector3(), to = new THREE.Vector3(), view = new THREE.Vector3()
const visible = point => {
  eye.copy(camera.position)
  to.subVectors(point, eye)
  const length = to.length()
  to.divideScalar(length)
  ray.origin = eye.clone().addScaledVector(to, 0.35 * player.p.scale)
  ray.dir = to
  return world.castRay(ray, Math.max(0, length - 0.35 * player.p.scale - 0.05), true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS) === null
}
const treeGlint = glints[0].material, baseGlint = glints[1].material
const overlookGlint = baseGlint.clone()
overlookGlint.depthTest = false
overlookGlint.colorNode = baseGlint.colorNode.mul(1.8)
const spotted = new Set()
function updateGlints() {
  const onOverlook = player.size === 'big' && Math.hypot(player.feet.x - overlook[0], player.feet.z - overlook[1]) < overlook[2]
  camera.getWorldDirection(view)
  gears.forEach((g, i) => {
    const s = glints[i]
    s.visible = !g.found
    if (g.found) return
    const d = camera.position.distanceTo(g.pos)
    s.scale.setScalar((i === 0 ? Math.min(0.6, Math.max(0.12, 0.012 * d)) : Math.min(0.32, Math.max(0.06, 0.006 * d))) * (onOverlook ? 2.5 : 1))
    s.material = onOverlook ? overlookGlint : i === 0 ? treeGlint : baseGlint
    // Spotting it: in front of him, near enough for his size, nothing between.
    if (player.control && !spotted.has(g) && (onOverlook || d < 12) && to.subVectors(g.pos, camera.position).normalize().dot(view) > 0.85 && (onOverlook || visible(g.pos))) {
      spotted.add(g)
      act('found')
    }
  })
}

// Under the long table: cross the hanging fringe and crumbs to an upturned cup.
// The Hare bridges the gap from its saucer down to the "eat me" cake between the legs.
const crumbShape = new THREE.SphereGeometry(1, 10, 8)
const crumbVertices = crumbShape.attributes.position
for (let i = 0; i < crumbVertices.count; i++) {
  const x = crumbVertices.getX(i), y = crumbVertices.getY(i), z = crumbVertices.getZ(i)
  const lobe = 1 + 0.1 * Math.sin(x * 7 + z * 5) * Math.sin(y * 6 - x * 3)
  crumbVertices.setXYZ(i, x * lobe, y * lobe, z * lobe)
}
crumbShape.computeVertexNormals()
const crumbs = new THREE.InstancedMesh(crumbShape, new THREE.MeshStandardMaterial({ color: 0xfff5df, roughness: 0.94 }), 260)
const icing = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: 0xffb1c4, roughness: 0.55 }), 52)
const sponge = [0xf4c97b, 0xffe2a7, 0xe8ba78, 0xf7db9f].map(colour => new THREE.Color(colour))
const [cx0, cz0, cx1, cz1] = underTable.crumbs, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
const icingPatch = new THREE.Matrix4().compose(new THREE.Vector3(0.15, 0.96, 0.1), new THREE.Quaternion(), new THREE.Vector3(0.46, 0.17, 0.35))
const icingMatrix = new THREE.Matrix4()
for (let i = 0; i < crumbs.count; i++) {
  const size = 0.0025 + rand() ** 3 * 0.011
  crumbs.setMatrixAt(i, m4.compose(new THREE.Vector3(cx0 + rand() * (cx1 - cx0), size * 0.6, cz0 + rand() * (cz1 - cz0)), q.setFromEuler(e.set(rand() * 0.5, rand() * 6, rand() * 0.5)), new THREE.Vector3(size, size * 0.7, size * 1.2)))
  crumbs.setColorAt(i, sponge[i % sponge.length])
  if (i % 5 === 0) icing.setMatrixAt(i / 5, icingMatrix.multiplyMatrices(m4, icingPatch))
}
crumbs.receiveShadow = icing.receiveShadow = true
scene.add(crumbs, icing)
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
const run = high.clone().sub(low), middle = low.clone().lerp(high, 0.5)
let bridged = false
async function layBridge() {
  bridged = true
  const spoon = model('spoon')
  const bounds = new THREE.Box3().setFromObject(spoon), size = bounds.getSize(new THREE.Vector3())
  const scale = run.length() / size.z
  spoon.scale.setScalar(scale)
  await laySpoon(middle, spoon, new THREE.Vector3(...underTable.hare))
  // The spoon's long axis is +Z. Centre it over the gap from the saucer to the floor.
  spoon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), run.clone().normalize())
  spoon.position.copy(middle).sub(bounds.getCenter(new THREE.Vector3()).multiplyScalar(scale).applyQuaternion(spoon.quaternion))
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.035, 0.004, run.length() / 2 + 0.02)
    .setTranslation(middle.x, middle.y, middle.z).setRotation(spoon.quaternion))
  say('SZ-05', cast.hare.object.position.distanceTo(player.feet))
  ting(1700)
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
const mantel = new THREE.Mesh(new THREE.BoxGeometry(...hall.mantel.size), new THREE.MeshStandardMaterial({ color: 0x68452f, roughness: 0.85 }))
mantel.position.set(...hall.mantel.pos)
mantel.castShadow = mantel.receiveShadow = true
house.add(mantel)
for (const { model: name, at, rot = 0, scale = 1 } of hall.props) {
  const object = model(name)
  object.position.copy(house.localToWorld(new THREE.Vector3(...at)))
  object.rotation.y = house.rotation.y + rot * DEG
  object.scale.setScalar(scale)
  scene.add(object)
}

// A handwritten note gives the Dormouse's clue somewhere the player can read it at normal size.
const paper = document.createElement('canvas')
paper.width = 768
paper.height = 512
const ink = paper.getContext('2d')
ink.fillStyle = '#eddbab'
ink.fillRect(0, 0, paper.width, paper.height)
ink.fillStyle = '#553c24'
ink.font = '36px Georgia'
;['The best butter!', 'No bread-knives in the works.', 'The Dormouse was muttering:', '"Crawl into the cracked', 'fountain foot..."'].forEach((line, i) => ink.fillText(line, 36, 72 + i * 78))
const note = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.32), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(paper), roughness: 0.9 }))
note.position.copy(house.localToWorld(new THREE.Vector3(...hall.note)))
note.rotation.y = house.rotation.y
scene.add(note)
export const hallNote = {
  pos: note.position, label: 'Read the butter-stained note',
  can: () => player.size === 'normal' && note.position.distanceTo(player.feet.clone().add(new THREE.Vector3(0, 1.1, 0))) < 1,
  use: async () => {
    player.control = false
    document.getElementById('task-hint').textContent = 'The best butter! No bread-knives in the works. The Dormouse mutters...'
    await say('EX-06')
    document.getElementById('task-hint').textContent = ''
    player.control = true
  },
}
export function insideHall() {
  const p = house.worldToLocal(player.feet.clone()), [x, y, z] = hall.centre
  return player.size === 'normal' && Math.abs(p.x - x) < hall.halfWidth && Math.abs(p.z - z) < hall.depth && Math.abs(p.y - y) < 0.35
}

// Six pours on the explore track's audio clock. A/D slides Fries and the cup along the table edge.
const LANES = [-0.42, 0, 0.42], POURS = 6, BEAT = 60 / 108
const pots = ['teapot', 'pink_teapot', 'blue_teapot']
export const teaService = {
  pos: new THREE.Vector3(...songSpot.fries.pos), label: 'Hold out a cup for the tea service',
  can: () => game.gears >= 1 && player.size === 'normal' && teaService.pos.distanceTo(player.feet) < 0.8,
  use: () => serve(),
}
let lane = 1, serving = false, cupTea, servedCup
const spot = new THREE.Vector3(...songSpot.fries.pos)
const at = k => spot.clone().add(new THREE.Vector3(0, 0, LANES[k]))
addEventListener('keydown', e => {
  if (!serving || e.repeat) return
  if (e.code === 'KeyA') lane = Math.max(0, lane - 1)
  if (e.code === 'KeyD') lane = Math.min(2, lane + 1)
})
const musicBeat = () => (heard() - playing.awake.start) / BEAT
async function untilBeat(beat) {
  while (musicBeat() < beat) await wait(0.01)
}
async function serve() {
  player.control = false
  lane = 1
  await walkTo(at(1).toArray(), 90)
  player.cinematic = true
  camera.fov = 55
  camera.updateProjectionMatrix()
  camera.position.set(spot.x - 1.6, 1.7, spot.z + 0.5)
  camera.lookAt(spot.x + 0.6, 0.95, spot.z)
  servedCup = model('teacup')
  servedCup.position.copy(spot).add(new THREE.Vector3(0.42, 0.95, 0))
  scene.add(servedCup)
  act('reach')
  await toHand(servedCup, { clip: 'reach', grip: [0, 0.05, 0.007] })
  await wait(3.4)
  anim.hold('reach')
  release(servedCup)
  cupTea = surface(servedCup, new THREE.Vector3(0, 0.02, 0), 0.034, 0.06, { fill: 0 })
  const chair = cast.hatter.chair
  await standUp('hatter')
  cast.hatter.doing = 'conduct'
  const homes = pots.map(name => ({ object: things[name], position: things[name].position.clone(), rotation: things[name].rotation.clone() }))
  const spouts = [new THREE.Vector3(0, 0.117, 0.134), new THREE.Vector3(0, 0.2, 0.172), new THREE.Vector3(0, 0.2, 0.172)]
  const landing = k => at(k).add(new THREE.Vector3(0.42, 0.98, 0))
  const targets = homes.map(({ object }, k) => {
    object.rotation.set(0, -Math.PI / 2, 0)
    return landing(k).add(new THREE.Vector3(0.05, 0.42, 0)).sub(spouts[k].clone().applyEuler(object.rotation))
  })
  cast.hatter.aim = targets[1]
  await Promise.all(homes.map(({ object, position }, k) => tween(1, t => object.position.lerpVectors(position, targets[k], t))))
  serving = true
  document.getElementById('task-hint').textContent = 'A / D  Move your cup under the pouring teapot'
  let caught = 0
  const first = Math.ceil(musicBeat()) + 2
  for (let n = 0; n < POURS; n++) {
    const k = Math.floor(rand() * 3), pot = homes[k].object, beat = first + n * 4
    cast.hatter.aim = targets[k]
    cast.hatter.anim.play('conduct', true)
    await untilBeat(beat - 1)
    await tween(BEAT, t => { pot.rotation.x = 0.8 * t })
    const target = landing(k), spout = pot.localToWorld(spouts[k].clone())
    const pour = stream(spout, target, { height: 0.02, radius: 0.007, colour: TEA })
    await untilBeat(beat + 1)
    pour.remove()
    if (servedCup.position.distanceTo(target) < 0.13) {
      caught++
      ting(1100 + caught * 120)
      cupTea.set(caught / POURS)
    } else {
      burst(5, 0.6)
      const miss = stream(target, target.clone().setY(0.78), { height: 0, radius: 0.007, colour: TEA })
      await wait(BEAT)
      miss.remove()
    }
    document.getElementById('task-hint').textContent = `A / D  Move your cup - Tea caught ${caught}/${POURS}`
    await tween(BEAT, t => { pot.rotation.x = 0.8 * (1 - t) })
  }
  serving = false
  await Promise.all(homes.map(({ object, position, rotation }) => {
    const from = object.position.clone()
    return tween(1, t => object.position.lerpVectors(from, position, t)).then(() => object.rotation.copy(rotation))
  }))
  cast.hatter.doing = null
  cast.hatter.aim = null
  cupTea.remove()
  servedCup.removeFromParent()
  anim.hold('reach', false)
  await sitDown('hatter', chair)
  document.getElementById('task-hint').textContent = ''
  player.cinematic = false
  player.control = true
}

export function updateTasks(dt, clock) {
  updateGlints()
  if (serving) {
    player.feet.lerp(at(lane), Math.min(1, dt * 12))
    servedCup.position.copy(player.feet).add(new THREE.Vector3(0.42, 0.95, 0))
  }
  // The spoon bridge, the first time a small Fries comes near the cup under the table.
  if (!bridged && player.control && player.size === 'small' && Math.hypot(player.feet.x - ux, player.feet.z - uz) < 0.6) layBridge()
  // The grotto ticks while gear 2 is still in its valve.
  const near = Math.hypot(player.feet.x - vx, player.feet.z - vz)
  if (!gears[1].found && near < 5 && (ticking -= dt) < 0) {
    ticking = 1
    burst(7, 0.35 * (1 - near / 5))
  }
  for (const d of drips) {
    const k = ((awake.syrup ? clock * 0.7 : 0) + d.userData.phase) % 1
    d.position.set(d.userData.x, 0.41 - 0.4 * k * k, d.userData.z)
  }
}
