import * as THREE from 'three/webgpu'
import { scene, webgpu } from './scene.js'
import { model, glow, addColliders } from './models.js'
import * as layout from './layout.js'
import { game } from './state.js'
import { wind } from './plants.js'

const DEG = Math.PI / 180

function place({ model: name, pos, rot = 0, scale = 1, solid = true, boxes = false }) {
  const object = model(name)
  object.position.set(...pos)
  object.rotation.y = rot * DEG
  object.scale.setScalar(scale)
  scene.add(object)
  if (solid) addColliders(name, object, boxes)
  return object
}

// The first object placed for each model name: things.hatter, things.big_tree, ...
export const things = {}
const onTable = new Map()
for (const entry of layout.placed) {
  const object = place(entry)
  things[entry.model] ??= object
  if (entry.onTable || entry.on) onTable.set(entry, object)
}

// Pushes a point sideways out of the room kept clear around the cast and Fries's song spot, `margin` further.
export function keepOut(p, margin) {
  for (const [x, z, r, bottom, top] of layout.keepClear) {
    const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), clear = r + margin
    if (d < clear && p.y > bottom - margin && p.y < top + margin) {
      p.x = x + dx / d * clear
      p.z = z + dz / d * clear
    }
  }
}

// The mean of an object's width, height and depth.
export const meanSize = object => new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).toArray().reduce((a, b) => a + b) / 3
glow(things.book_page, 0xfff0b0, 2)

// Doors on their hinges: `pivot` turns about the hinge, positive inwards; `colliders` keep a closed door solid.
// `front` is a point a step in front of the closed door.
export const doors = Object.fromEntries(Object.entries(layout.doors).map(([name, { in: host, hinge, scale }]) => {
  const pivot = new THREE.Group(), door = model('tree_door')
  if (typeof hinge === 'string') things[host].getObjectByName(hinge).add(pivot)
  else things[host].add(pivot.translateX(hinge[0]).translateY(hinge[1]).translateZ(hinge[2]))
  door.scale.set(...scale)
  door.position.x = 0.655 * scale[0]
  pivot.add(door)
  things[host].updateMatrixWorld(true)
  const front = door.localToWorld(new THREE.Vector3(0, 0, 0.9))
  return [name, { pivot, door, colliders: addColliders('tree_door', door), front }]
}))

// Hands at six o'clock on a face: the minute hand up, the hour hand down. `centre` is the pivot in the face's
// frame and `length` the minute hand's length in metres.
function hands(face, centre, length) {
  const minute = model('clock_hand'), hour = model('clock_hand')
  for (const hand of [minute, hour]) {
    hand.position.set(...centre)
    face.add(hand)
  }
  minute.scale.setScalar(length / 0.18)
  hour.scale.setScalar(length * 0.65 / 0.18)
  hour.rotation.z = Math.PI
  return { minute, hour }
}
hands(things.pocket_watch, [0, 0.026, 0.014], 0.02)

// Hung from the big tree on a chain from the ring on top (`ring` metres up) to the nearest point of a branch
// above it, the object moved under that point.
const chain = new THREE.MeshStandardMaterial({ color: 0x3a3028, metalness: 0.6, roughness: 0.5 })
const wood = []
things.big_tree.updateMatrixWorld(true)
things.big_tree.traverse(o => {
  if (!o.isMesh) return
  const position = o.geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld)
    if (p.y > 2.5) wood.push(p)
  }
})
function hang(object, ring) {
  const top = object.position.y + ring
  let branch, best = Infinity
  for (const p of wood) {
    const d = Math.hypot(p.x - object.position.x, p.z - object.position.z)
    if (p.y > top + 0.3 && d < best) { best = d; branch = p }
  }
  object.position.x = branch.x
  object.position.z = branch.z
  const length = branch.y - top
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, length, 4).translate(0, ring + length / 2, 0), chain)
  link.castShadow = true
  object.add(link)
}

export const cups = layout.tableCups.map(pos => place({ model: 'teacup', pos, solid: false }))

export const clocks = layout.clocks.map(({ pos, rot }) => {
  const clock = place({ model: 'hanging_clock', pos, rot, solid: false })
  hang(clock, 0.7)
  return hands(clock, [0, 0.26, 0.066], 0.13)
})

for (const pos of layout.lanterns) {
  const lantern = place({ model: 'lantern', pos, solid: false })
  glow(lantern, 0xffb050, 3)
  hang(lantern, 0.4)
}

// Candle flames, flickering.
const flames = []
scene.traverse(o => { if (o.isMesh && o.name.startsWith('flame')) flames.push(o) })
for (const flame of flames) glow(flame, 0xffa040, 4)

export const gears = layout.gears.map(g => {
  const object = place({ model: 'gear', pos: g.pos, solid: false })
  glow(object, 0xffb030, 1.2)
  return { ...g, object, pos: new THREE.Vector3(...g.pos), found: false }
})

export const drinks = layout.drinks.map(d => {
  const object = place({ ...d, solid: false })
  return { ...d, object, pos: new THREE.Vector3(...d.pos).setY(d.pos[1] + 0.05), home: object.position.clone() }
})

// Everything standing on the table, which dances in the final chorus: { object, home, turn, seed, size, on }, where
// `on` is the prop it stands on.
const tableObjects = [...cups, ...onTable.values(), ...drinks.filter(d => d.onTable).map(d => d.object)]
export const tableProps = tableObjects.map(object => ({
  object, home: object.position.clone(), turn: object.rotation.y, seed: Math.random() * 100, size: meanSize(object),
}))
const tableProp = object => tableProps.find(p => p.object === object)
for (const [entry, object] of onTable) if (entry.on) tableProp(object).on = tableProp(things[entry.on])

// Layers of the world that each gear wakes: 'tea', 'syrup', 'flowers'.
export const awake = {}
export function wake(layer) {
  awake[layer] = true
}

// Tea and syrup frozen mid-pour in glossy arcs that catch the light, each with droplets that hang on it and
// run along it once its layer wakes.
const drop = new THREE.IcosahedronGeometry(1, 1)
const shine = colour => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.4, roughness: 0.15, transparent: true, opacity: 0.85 })
function arc({ from, to, height }, radius, material) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
  const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(Math.max(a.y, b.y) + 2 * height), b)
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 8), material))
  const drops = [0, 1, 2].map(i => {
    const mesh = new THREE.Mesh(drop, material)
    mesh.scale.setScalar(radius * 1.8)
    mesh.position.copy(curve.getPoint((i + 0.5) / 3))
    scene.add(mesh)
    return mesh
  })
  return { curve, drops }
}
const teaArcs = layout.effects.teaArcs.map(a => arc(a, 0.012, shine(0xb5652a)))
const syrupArcs = layout.effects.syrupArcs.map(a => arc(a, 0.025, shine(0xe8a830)))
const flow = (arcs, time, speed) => arcs.forEach(({ curve, drops }) => drops.forEach((d, i) => curve.getPoint((time * speed + i / 3) % 1, d.position)))

// Golden syrup drops hanging in the air round the fountain; once the syrup wakes they fall into the basin.
const D = layout.effects.syrupDrops
const syrupDrops = new THREE.InstancedMesh(drop, shine(0xf0b838), D.count)
const drips = Array.from({ length: D.count }, () => new THREE.Vector3(...D.center.map((c, i) => c + (Math.random() - 0.5) * D.size[i])))
const dripMatrix = new THREE.Matrix4(), dripTurn = new THREE.Quaternion(), dripSize = new THREE.Vector3(0.03, 0.03, 0.03)
function placeDrips() {
  drips.forEach((p, i) => syrupDrops.setMatrixAt(i, dripMatrix.compose(p, dripTurn, dripSize)))
  syrupDrops.instanceMatrix.needsUpdate = true
}
scene.add(syrupDrops)

placeDrips()

// The Dormouse blows a bubble while he snores.
const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, transparent: true, opacity: 0.35 }))
bubble.position.set(0, 0.07, 0.18)
things.dormouse.add(bubble)

export function updateGarden(dt, time) {
  gears.forEach((g, i) => {
    if (!g.found) g.object.rotation.y += dt * 1.5
    g.object.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 1 + 0.8 * Math.sin(time * 3 + i * 2) })
  })

  const breath = (time / 3) % 1
  bubble.scale.setScalar(breath < 0.9 ? 0.02 + breath * 0.1 : 0.001)

  if (awake.tea) {
    flow(teaArcs, time, 0.9)
  }

  if (awake.syrup) {
    flow(syrupArcs, time, 0.5)
    for (const p of drips) {
      p.y -= dt * 0.6
      if (p.y < 0.9) p.y = D.center[1] + D.size[1] / 2
    }
    placeDrips()
  }

  flames.forEach((flame, i) => {
    flame.material.emissiveIntensity = 3.5 + Math.sin(time * 13 + i * 2.1) * 0.6 + Math.sin(time * 31 + i) * 0.4
    flame.scale.y = 1 + 0.12 * Math.sin(time * 17 + i * 3)
  })

  wind.bushes.value = awake.flowers ? 2.5 : 0.4
  wind.pulse.value = game.pulse
}
