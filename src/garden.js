import * as THREE from 'three/webgpu'
import { uv, vec3, smoothstep, max, abs, time, sin } from 'three/tsl'
import { scene } from './scene.js'
import { model, glow, addColliders } from './models.js'
import * as layout from './layout.js'
import { game } from './state.js'
import { wind } from './plants.js'
import { RAPIER, world } from './physics.js'

const DEG = Math.PI / 180

// The armchair model is built 38.5 degrees off square (its back runs diagonally across the model's frame). Its
// meshes are turned back inside the object, so the object's own turn, which the seated cast follows, squares it.
const ARMCHAIR_YAW = 38.5 * DEG

function place({ model: name, pos, rot = 0, scale = 1, solid = true, boxes = false, hidden = false }) {
  const object = model(name)
  if (name === 'armchair') object.children.forEach(mesh => { mesh.rotation.y = -ARMCHAIR_YAW })
  object.position.set(...pos)
  object.rotation.y = rot * DEG
  object.scale.setScalar(scale)
  if (!hidden) scene.add(object)
  if (solid) addColliders(name, object, boxes)
  return object
}

// The first object placed for each model name: things.hatter, things.big_tree, ...; every placed object of a model
// in placedAll[name].
export const things = {}, placedAll = {}
const onTable = new Map()
for (const entry of layout.placed) {
  const object = place(entry)
  things[entry.model] ??= object
  ;(placedAll[entry.model] ??= []).push(object)
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

// The cottage's doorway lining lies exactly on the arch's reveals (and the house's feet on the terrace lawn), and from
// far away the depth buffer cannot tell such faces apart, so they flicker. The house is pushed back in depth, and the
// lining and the lawn win.
things.house.traverse(o => {
  if (o.name === 'house_13') Object.assign(o.material, { polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 })
})

// The hosts' end of the dressed table (beyond 2.6 m along it) is kept empty for the game's own cups, teapots and
// the watch; the few pieces of dressing that stray into it stay hidden.
const dressed = things.long_table_dressed
dressed.updateMatrixWorld(true)
dressed.traverse(o => {
  if (o.name.startsWith('dress_') && dressed.worldToLocal(o.getWorldPosition(new THREE.Vector3())).x > 2.6) o.visible = false
})

// The mean of an object's width, height and depth.
export const meanSize = object => new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).toArray().reduce((a, b) => a + b) / 3
glow(things.book_page, 0xfff0b0, 2)

// Doors on their hinges: `pivot` turns about the hinge, positive inwards; `colliders` keep a closed door solid.
// `front` is a point a step in front of the closed door.
export const doors = Object.fromEntries(Object.entries(layout.doors).map(([name, { in: host, hinge, scale, plug }]) => {
  const pivot = new THREE.Group(), door = model('tree_door')
  if (typeof hinge === 'string') things[host].getObjectByName(hinge).add(pivot)
  else things[host].add(pivot.translateX(hinge[0]).translateY(hinge[1]).translateZ(hinge[2]))
  door.scale.set(...scale)
  door.position.x = 0.655 * scale[0]
  pivot.add(door)
  things[host].updateMatrixWorld(true)
  // The back mouth of a tunnel: an arch-shaped slab, wider than the opening so its edges are buried in the bark. Seen from
  // behind it is the host's own bark (the host's texture, mapped flat onto a patch of its atlas); seen from the door side it
  // is a dark wall past the open door's sweep. It stands in the scene, not in the host, so the host's bark and wood scans leave
  // it out, and `unplug` removes it and its collider when the roses beyond the tunnel appear.
  let wall, unplug
  if (plug) {
    const [[x0, x1], [y0, y1], shoulder, z] = plug, half = (x1 - x0) / 2, tree = things[host]
    const outline = new THREE.Shape().moveTo(-half, y0).lineTo(half, y0).lineTo(half, shoulder).absellipse(0, shoulder, half, y1 - shoulder, 0, Math.PI).lineTo(-half, y0)
    const face = () => {
      const geometry = new THREE.ShapeGeometry(outline), p = geometry.attributes.position, uvs = geometry.attributes.uv
      for (let i = 0; i < p.count; i++) uvs.setXY(i, 0.45 + p.getX(i) * 0.12, 0.35 + p.getY(i) * 0.12) // 0.12 of the atlas per metre, over its middle
      return geometry
    }
    let bark
    tree.traverse(o => { if (o.isMesh) bark ??= o.material })
    const back = new THREE.Mesh(face(), bark), inside = new THREE.Mesh(face(), new THREE.MeshBasicMaterial({ color: 0x0b0705 }))
    back.rotation.y = Math.PI
    back.receiveShadow = true
    inside.position.z = 0.01
    wall = new THREE.Group().add(back, inside)
    wall.position.copy(tree.localToWorld(new THREE.Vector3((x0 + x1) / 2, 0, z)))
    wall.rotation.y = tree.rotation.y
    scene.add(wall)
    const slab = world.createCollider(RAPIER.ColliderDesc.cuboid(half, (y1 - y0) / 2, 0.1)
      .setTranslation(...tree.localToWorld(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, z)).toArray())
      .setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.rotation.y)))
    unplug = () => {
      wall.visible = false
      world.removeCollider(slab, true)
    }
  }
  const front = door.localToWorld(new THREE.Vector3(0, 0, 0.9))
  return [name, { pivot, door, colliders: addColliders('tree_door', door), front, wall, unplug }]
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
  glow(object, 0xffb030, 0.06)
  return { ...g, object, pos: new THREE.Vector3(...g.pos), found: false }
})


// A small warm star marks the brass without bleaching its material.
const glintMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
const p = uv().sub(0.5).mul(2)
const rays = max(smoothstep(0.12, 0, abs(p.x)).mul(smoothstep(1, 0, abs(p.y))), smoothstep(0.12, 0, abs(p.y)).mul(smoothstep(1, 0, abs(p.x))))
glintMaterial.colorNode = vec3(1, 0.85, 0.5).mul(rays.add(smoothstep(0.35, 0, p.length()))).mul(sin(time.mul(4)).mul(0.15).add(0.65))
export const glints = gears.map(g => {
  const sprite = new THREE.Sprite(glintMaterial)
  sprite.position.copy(g.pos).add(new THREE.Vector3(0, 0.035, 0))
  sprite.scale.setScalar(0.09)
  scene.add(sprite)
  return sprite
})

export const drinks = layout.drinks.map(d => {
  const object = place({ ...d, solid: false })
  return { ...d, object, pos: new THREE.Vector3(...d.pos).setY(d.pos[1] + (d.by === 'small' ? 0.01 : 0.05)), home: object.position.clone() }
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

// The Dormouse blows a bubble while he snores.
const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, transparent: true, opacity: 0.35 }))
bubble.position.set(0, 0.07, 0.18)
things.dormouse.add(bubble)

export function updateGarden(dt, time) {
  glints.forEach((sprite, i) => { sprite.visible = !gears[i].found })
  gears.forEach((g, i) => {
    if (!g.found) g.object.rotation.y += dt * 1.5
    g.object.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 0.045 + 0.015 * Math.sin(time * 3 + i * 2) })
  })

  const breath = (time / 3) % 1
  bubble.scale.setScalar(breath < 0.9 ? 0.02 + breath * 0.1 : 0.001)

  flames.forEach((flame, i) => {
    flame.material.emissiveIntensity = 3.5 + Math.sin(time * 13 + i * 2.1) * 0.6 + Math.sin(time * 31 + i) * 0.4
    flame.scale.y = 1 + 0.12 * Math.sin(time * 17 + i * 3)
  })

  wind.bushes.value = awake.flowers ? 2.5 : 0.4
  wind.pulse.value = game.pass >= 1 ? game.pulse : 0
}
