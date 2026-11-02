import * as THREE from 'three/webgpu'
import { scene, webgpu } from './scene.js'
import { RAPIER, world } from './physics.js'
import { model, glow, addColliders } from './models.js'
import * as layout from './layout.js'
import { game } from './state.js'

const DEG = Math.PI / 180

const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x7fa66a, roughness: 1 }))
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)
world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 40).setTranslation(0, -0.5, 0))

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
for (const entry of layout.placed) {
  const object = place(entry)
  things[entry.model] ??= object
}
things.roses.visible = false
glow(things.book_page, 0xfff0b0, 2)

const bushes = layout.bushes.map(([x, z]) => place({ model: 'bush', pos: [x, 0, z] }))
export const cups = layout.tableCups.map(pos => place({ model: 'teacup', pos, solid: false }))

export const clocks = layout.clocks.map(c => {
  const face = place({ ...c, model: 'wall_clock', solid: false })
  const minute = model('clock_hand'), hour = model('clock_hand')
  minute.position.z = hour.position.z = 0.045
  hour.scale.y = 0.65
  hour.rotation.z = Math.PI // six o'clock
  face.add(minute, hour)
  return { minute, hour }
})

export const gears = layout.gears.map(g => {
  const object = place({ model: 'gear', pos: g.pos, solid: false })
  glow(object, 0xffb030, 1.2)
  return { ...g, object, pos: new THREE.Vector3(...g.pos), found: false }
})

export const drinks = layout.drinks.map(d => ({
  ...d, object: place({ ...d, solid: false }), pos: new THREE.Vector3(...d.pos).setY(d.pos[1] + 0.1),
}))

// Layers of the world that each gear wakes: 'tea', 'syrup', 'flowers'.
const awake = {}
export function wake(layer) {
  awake[layer] = true
}

const box = new THREE.BoxGeometry()
const effect = (colour, opacity = 1) => new THREE.MeshStandardMaterial({ color: colour, transparent: opacity < 1, opacity })

// Tea frozen mid-pour and syrup frozen over the fountain's lip.
function stream({ from, to }, width, colour) {
  const mesh = new THREE.Mesh(box, effect(colour, 0.85))
  mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2)
  mesh.scale.set(width, from[1] - to[1], width)
  scene.add(mesh)
  return mesh
}
const tea = stream(layout.effects.teaStream, 0.02, 0x9a5a2a)
const syrup = stream(layout.effects.syrupStream, 0.06, 0xd99a30)

// Steam puffs rising from the cups and teapots once the tea wakes.
const steamFrom = [...cups, ...drinks.filter(d => d.model.endsWith('teapot')).map(d => d.object)]
const puffs = Array.from({ length: 40 }, () => {
  const mesh = new THREE.Mesh(box, effect(0xffffff, 0.45))
  mesh.visible = false
  scene.add(mesh)
  return { mesh, age: 1 }
})
let puffTimer = 0

// Petals hanging still in the air; they fall once the tea wakes.
const P = layout.effects.petals
const petals = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.004, 0.035), effect(0xf4a8c0), Math.round(P.count * (webgpu ? 1 : 0.5)))
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
    g.object.rotation.y += dt * 1.5
    g.object.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 1 + 0.8 * Math.sin(time * 3 + i * 2) })
  })

  const breath = (time / 3) % 1
  bubble.scale.setScalar(breath < 0.9 ? 0.02 + breath * 0.1 : 0.001)

  if (awake.tea) {
    tea.scale.x = tea.scale.z = 0.02 + 0.006 * Math.sin(time * 9)
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
    syrup.scale.x = syrup.scale.z = 0.06 + 0.015 * Math.sin(time * 5)
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
