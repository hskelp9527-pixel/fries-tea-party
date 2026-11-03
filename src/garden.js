import * as THREE from 'three/webgpu'
import { scene, webgpu } from './scene.js'
import { model, glow, addColliders } from './models.js'
import * as layout from './layout.js'
import { game } from './state.js'
import { wind } from './plants.js'

const DEG = Math.PI / 180

function place({ model: name, pos, rot = 0, scale = 1, solid = true }) {
  const object = model(name)
  object.position.set(...pos)
  object.rotation.y = rot * DEG
  object.scale.setScalar(scale)
  scene.add(object)
  if (solid) addColliders(name, object)
  return object
}

// The first object placed for each model name: things.hatter, things.tree_door, ...
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
things.roses.visible = false
glow(things.book_page, 0xfff0b0, 2)

export const cups = layout.tableCups.map(pos => place({ model: 'teacup', pos, solid: false }))

export const clocks = layout.clocks.map(c => {
  const face = place({ ...c, solid: false })
  const minute = model('clock_hand'), hour = model('clock_hand')
  minute.position.z = hour.position.z = 0.045
  hour.scale.y = 0.65
  hour.rotation.z = Math.PI // six o'clock
  face.add(minute, hour)
  return { minute, hour }
})

for (const pos of layout.lanterns) glow(place({ model: 'lantern', pos, solid: false }), 0xffb050, 3)

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

  wind.bushes.value = awake.flowers ? 2.5 : 0.4
  wind.pulse.value = game.pulse
}
