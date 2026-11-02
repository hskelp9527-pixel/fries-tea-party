import * as THREE from 'three/webgpu'
import { scene, webgpu } from './scene.js'
import { model, glow, addColliders } from './models.js'
import * as layout from './layout.js'
import { game } from './state.js'

const DEG = Math.PI / 180

for (const card of layout.backdrop) {
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(card.outline.map(([x, y]) => new THREE.Vector2(x, y)))), new THREE.MeshBasicMaterial({ color: card.colour }))
  mesh.position.set(...card.pos)
  mesh.rotation.y = card.rot * DEG
  scene.add(mesh)
}

function place({ model: name, pos, rot = 0, scale = 1, solid = true, shadow = true }) {
  const object = model(name)
  object.position.set(...pos)
  object.rotation.y = rot * DEG
  object.scale.setScalar(scale)
  scene.add(object)
  if (solid) addColliders(name, object)
  if (!shadow) object.traverse(o => { o.castShadow = false })
  return object
}

// The first object placed for each model name: things.hatter, things.tree_door, ...
export const things = {}
const onTable = new Map()
for (const entry of layout.placed) {
  const object = place(entry)
  things[entry.model] ??= object
  if (entry.onTable) onTable.set(entry, object)
}

// The mean of an object's width, height and depth.
export const meanSize = object => new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).toArray().reduce((a, b) => a + b) / 3
things.roses.visible = false
glow(things.book_page, 0xfff0b0, 2)

const bushes = layout.bushes.map(([x, z]) => place({ model: 'bush', pos: [x, 0, z] }))
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

// Everything standing on the table, which dances in the final chorus: { object, home, turn, seed, size }.
const tableObjects = [...cups, ...layout.placed.filter(p => p.onTable).map(p => onTable.get(p)), ...drinks.filter(d => d.onTable).map(d => d.object)]
export const tableProps = tableObjects.map(object => ({
  object, home: object.position.clone(), turn: object.rotation.y, seed: Math.random() * 100, size: meanSize(object),
}))

// Layers of the world that each gear wakes: 'tea', 'syrup', 'flowers'.
const awake = {}
export function wake(layer) {
  awake[layer] = true
}

const box = new THREE.BoxGeometry()
const effect = (colour, opacity = 1) => new THREE.MeshStandardMaterial({ color: colour, transparent: opacity < 1, opacity })

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

// Steam puffs rising from the cups and teapots once the tea wakes.
const steamFrom = [...cups, things.pink_teapot, things.blue_teapot, things.teapot]
const puffs = Array.from({ length: 40 }, () => {
  const mesh = new THREE.Mesh(box, effect(0xffffff, 0.45))
  mesh.visible = false
  scene.add(mesh)
  return { mesh, age: 1 }
})
let puffTimer = 0

// Petals hanging still in the air; they fall once the tea wakes.
const P = layout.effects.petals
const petals = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.004, 0.06), new THREE.MeshStandardMaterial({ color: 0xf4a8c0, emissive: 0xf4a8c0, emissiveIntensity: 0.25, roughness: 0.4 }), Math.round(P.count * (webgpu ? 1 : 0.5)))
const petal = Array.from({ length: petals.count }, () => ({
  pos: new THREE.Vector3(...P.center.map((c, i) => c + (Math.random() - 0.5) * P.size[i])),
  turn: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
  fall: 0.2 + Math.random() * 0.2,
  phase: Math.random() * 6,
}))
const dummy = new THREE.Object3D()
function placePetals() {
  petal.forEach((p, i) => {
    dummy.position.copy(p.pos)
    dummy.rotation.copy(p.turn)
    dummy.updateMatrix()
    petals.setMatrixAt(i, dummy.matrix)
  })
  petals.instanceMatrix.needsUpdate = true
}
placePetals()
placeDrips()
scene.add(petals)

// Butterflies perched round the fountain; they take off once the syrup wakes.
const B = layout.effects.butterflies
const butterflies = Array.from({ length: B.count }, (_, i) => {
  const mesh = new THREE.Mesh(box, effect([0xffd24a, 0xff8ac0, 0x9ad0ff, 0xffffff][i % 4]))
  const a = i / B.count * Math.PI * 2
  mesh.position.set(B.center[0] + Math.cos(a) * B.perch, B.center[1], B.center[2] + Math.sin(a) * B.perch)
  mesh.scale.set(0.08, 0.005, 0.05)
  scene.add(mesh)
  return { mesh, phase: a, radius: 1 + Math.random() * (B.radius - 1), speed: 0.4 + Math.random() * 0.5, lift: 0 }
})

// The Dormouse blows a bubble while he snores.
const bubble = new THREE.Mesh(box, effect(0xcfe8ff, 0.5))
bubble.position.set(0, 0.07, 0.18)
things.dormouse.add(bubble)

const to = new THREE.Vector3()

export function updateGarden(dt, time) {
  gears.forEach((g, i) => {
    if (!g.found) g.object.rotation.y += dt * 1.5
    g.object.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 1 + 0.8 * Math.sin(time * 3 + i * 2) })
  })

  const breath = (time / 3) % 1
  bubble.scale.setScalar(breath < 0.9 ? 0.02 + breath * 0.1 : 0.001)

  if (awake.tea) {
    flow(teaArcs, time, 0.9)
    puffTimer -= dt
    if (puffTimer < 0) {
      puffTimer = 0.08
      const puff = puffs.find(p => p.age >= 1)
      puff.age = 0
      steamFrom[Math.floor(Math.random() * steamFrom.length)].getWorldPosition(puff.mesh.position).y += 0.1
    }
    for (const p of puffs) {
      p.age = Math.min(1, p.age + dt / 2)
      p.mesh.visible = p.age < 1
      p.mesh.position.y += dt * 0.25
      p.mesh.scale.setScalar(0.07 * Math.sin(p.age * Math.PI))
    }
    for (const p of petal) {
      p.pos.y -= p.fall * dt
      p.pos.x += Math.sin(time + p.phase) * dt * 0.2
      p.turn.x += dt
      p.turn.z += dt * 0.7
      if (p.pos.y < 0.02) p.pos.y = P.center[1] + P.size[1] / 2
    }
    placePetals()
  }

  if (awake.syrup) {
    flow(syrupArcs, time, 0.5)
    for (const p of drips) {
      p.y -= dt * 0.6
      if (p.y < 0.9) p.y = D.center[1] + D.size[1] / 2
    }
    placeDrips()
    for (const b of butterflies) {
      b.lift = Math.min(1, b.lift + dt * 0.5)
      const a = b.phase + time * b.speed
      to.set(B.center[0] + Math.cos(a) * b.radius, B.center[1] + 0.6 + Math.sin(time * 1.3 + b.phase) * 0.5, B.center[2] + Math.sin(a) * b.radius)
      b.mesh.position.lerp(to, b.lift * Math.min(1, dt * 3))
      b.mesh.rotation.y = -a
      b.mesh.scale.x = 0.08 * (0.3 + 0.7 * Math.abs(Math.sin(time * 18 + b.phase)))
    }
  }

  if (awake.flowers) {
    bushes.forEach((bush, i) => {
      bush.rotation.z = Math.sin(time * 1.7 + i) * 0.07
      bush.rotation.x = Math.cos(time * 1.3 + i) * 0.05
      bush.scale.y = 1 + 0.15 * game.pulse
    })
  }
}
