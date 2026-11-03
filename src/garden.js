import * as THREE from 'three/webgpu'
import { uv, vec3, smoothstep, max, abs, time, sin, attribute, texture, mix, positionGeometry, cameraPosition, uniform, dot } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'
import { scene, SUN } from './scene.js'
import { model, glow, addColliders } from './models.js'
import * as layout from './layout.js'
import { game } from './state.js'
import { wind } from './plants.js'
import { RAPIER, world } from './physics.js'
import { random } from './fields.js'

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

// One draw per dressed model: retain floral maps and bake the other material identities into vertex data.
// Empty transform objects let the existing song choreography address individual instances.
const dressBatches = [], dressSizes = new Map(), flameAnchors = [], haloAnchors = []
function instanceModel(name, objects) {
  const source = model(name), pieces = []
  let mapped
  source.updateMatrixWorld(true)
  source.traverse(mesh => {
    if (!mesh.isMesh) return
    if (mesh.name.startsWith('flame')) {
      mesh.geometry.computeBoundingBox()
      const local = mesh.geometry.boundingBox.getCenter(new THREE.Vector3())
      local.y = mesh.geometry.boundingBox.min.y
      local.applyMatrix4(mesh.matrixWorld)
      for (const object of objects) flameAnchors.push({ object, local })
      return
    }
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
    geometry.applyMatrix4(mesh.matrixWorld)
    const count = geometry.attributes.position.count, material = mesh.material
    const tint = new Float32Array(count * 3), surface = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      material.color.toArray(tint, i * 3)
      surface.set([material.roughness, material.metalness, material.map ? 1 : 0], i * 3)
    }
    for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(key)) geometry.deleteAttribute(key)
    geometry.setAttribute('dressTint', new THREE.BufferAttribute(tint, 3))
    geometry.setAttribute('dressSurface', new THREE.BufferAttribute(surface, 3))
    geometry.clearGroups()
    pieces.push(geometry)
    if (material.map) mapped = material
  })
  const geometry = mergeGeometries(pieces), surface = attribute('dressSurface', 'vec3')
  pieces.forEach(piece => piece.dispose())
  const material = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide })
  material.colorNode = attribute('dressTint', 'vec3')
  if (mapped) {
    material.colorNode = material.colorNode.mul(mix(vec3(1), texture(mapped.map).rgb, surface.z))
    material.normalMap = mapped.normalMap
  }
  material.roughnessNode = surface.x
  material.metalnessNode = surface.y
  if (mapped?.roughnessMap) material.roughnessNode = surface.x.mul(mix(1, texture(mapped.roughnessMap).g, surface.z))
  if (mapped?.metalnessMap) material.metalnessNode = surface.y.mul(mix(1, texture(mapped.metalnessMap).b, surface.z))
  const mesh = new THREE.InstancedMesh(geometry, material, objects.length)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  scene.add(mesh)
  geometry.computeBoundingBox()
  const size = geometry.boundingBox.getSize(new THREE.Vector3())
  objects.forEach(object => dressSizes.set(object, (size.x + size.y + size.z) / 3 * object.scale.x))
  dressBatches.push({ mesh, objects })
  return mesh
}
const extraTable = layout.tableDressing.map(({ pos, rot = 0, scale = 1 }) => {
  const object = new THREE.Object3D()
  object.position.set(...pos)
  object.rotation.y = rot * DEG
  object.scale.setScalar(scale)
  scene.add(object)
  return object
})
for (const name of new Set(layout.tableDressing.map(entry => entry.model))) {
  instanceModel(name, extraTable.filter((_, i) => layout.tableDressing[i].model === name))
}

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
    wall.scale.copy(tree.scale)
    scene.add(wall)
    const slab = world.createCollider(RAPIER.ColliderDesc.cuboid(half * tree.scale.x, (y1 - y0) / 2 * tree.scale.y, 0.1 * tree.scale.z)
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
const chain = new THREE.MeshStandardMaterial({ color: 0x78603a, metalness: 0.65, roughness: 0.48 })
const hanging = [], chainTransforms = []
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
  const length = branch.y - top
  // The pivot is an actual branch vertex: chain and object sway together about their attachment.
  const pivot = new THREE.Group(), link = new THREE.Object3D()
  pivot.position.copy(branch)
  object.position.set(0, -length - ring, 0)
  link.position.y = -length / 2
  link.scale.set(1, length, 1)
  pivot.add(object, link)
  scene.add(pivot)
  hanging.push({ pivot, phase: hanging.length * 2.399 })
  chainTransforms.push(link)
}

export const cups = layout.tableCups.map(pos => place({ model: 'teacup', pos, solid: false }))

const clockFaces = layout.clocks.map(({ pos, rot }) => {
  const clock = new THREE.Object3D()
  clock.position.set(...pos)
  clock.rotation.y = rot * DEG
  hang(clock, 0.7)
  return clock
})
instanceModel('hanging_clock', clockFaces)
export const clocks = clockFaces.map(clock => {
  const minute = new THREE.Object3D(), hour = new THREE.Object3D()
  minute.position.set(0, 0.26, 0.066)
  hour.position.copy(minute.position)
  minute.scale.setScalar(0.13 / 0.18)
  hour.scale.setScalar(0.13 * 0.65 / 0.18)
  hour.rotation.z = Math.PI
  clock.add(minute, hour)
  return { minute, hour }
})
instanceModel('clock_hand', clocks.flatMap(({ minute, hour }) => [minute, hour]))

const lanterns = layout.lanterns.map(pos => {
  const lantern = new THREE.Object3D()
  lantern.position.set(...pos)
  hang(lantern, 0.4)
  haloAnchors.push({ object: lantern, local: new THREE.Vector3(0, 0.19, 0), size: 0.85, gain: 0.19 })
  return lantern
})
const lanternBatch = instanceModel('lantern', lanterns)
// Keep the brass cage dark; the luminous chamber is the small, bounded source.
const chamber = smoothstep(0.07, 0.12, positionGeometry.y).mul(smoothstep(0.31, 0.26, positionGeometry.y))
lanternBatch.material.emissiveNode = vec3(1, 0.57, 0.16).mul(chamber).mul(2.6)
const chains = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), chain, chainTransforms.length)
chains.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
chains.frustumCulled = false
scene.add(chains)

// Reuse the actual wick positions in the dressed table, including its three-armed candelabras.
const oldFlames = []
dressed.traverseVisible(o => { if (o.isMesh && o.name.startsWith('flame')) oldFlames.push(o) })
for (const flame of oldFlames) {
  flame.geometry.computeBoundingBox()
  const local = flame.geometry.boundingBox.getCenter(new THREE.Vector3())
  local.y = flame.geometry.boundingBox.min.y
  flameAnchors.push({ object: flame, local })
  flame.visible = false
}
const flameMaterial = new THREE.MeshBasicNodeMaterial()
const flicker = sin(time.mul(7).add(attribute('flamePhase'))).mul(0.09).add(sin(time.mul(13).add(attribute('flamePhase').mul(2))).mul(0.04)).add(1)
// HDR hierarchy: flame cores 5, lantern cores 2.6, halos below 0.25, ordinary brass below 0.1.
flameMaterial.colorNode = mix(vec3(1, 0.86, 0.46), vec3(1, 0.32, 0.035), positionGeometry.y.mul(0.5)).mul(5).mul(flicker)
const flameGeometry = new THREE.SphereGeometry(1, 8, 8).translate(0, 1, 0)
flameGeometry.setAttribute('flamePhase', new THREE.InstancedBufferAttribute(Float32Array.from(flameAnchors, (_, i) => i * 2.399), 1))
const candleFlames = new THREE.InstancedMesh(flameGeometry, flameMaterial, flameAnchors.length)
candleFlames.frustumCulled = false
candleFlames.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(candleFlames)
for (const { object, local } of flameAnchors) haloAnchors.push({ object, local: local.clone().add(new THREE.Vector3(0, 0.018, 0)), size: 0.18, gain: 0.22 })

// One instanced billboard draw for the soft light surrounding all the wicks.
const haloGeometry = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1))
const haloPosition = new THREE.InstancedBufferAttribute(new Float32Array(haloAnchors.length * 4), 4).setUsage(THREE.DynamicDrawUsage)
haloGeometry.setAttribute('haloPosition', haloPosition)
haloGeometry.setAttribute('haloGain', new THREE.InstancedBufferAttribute(Float32Array.from(haloAnchors, a => a.gain), 1))
haloGeometry.instanceCount = haloAnchors.length
const haloMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
haloMaterial.positionNode = attribute('haloPosition', 'vec4').xyz
haloMaterial.scaleNode = attribute('haloPosition', 'vec4').w
haloMaterial.colorNode = vec3(1, 0.52, 0.12).mul(attribute('haloGain')).mul(smoothstep(0.5, 0, uv().sub(0.5).length()).pow(2))
const candleHalos = new THREE.Mesh(haloGeometry, haloMaterial)
candleHalos.frustumCulled = false
scene.add(candleHalos)

// The candles light nothing but themselves: their flames and halos glow, with no real lights, as every point light
// is paid for by every lit pixel of the garden, and the grass is many layers deep.

export const gears = layout.gears.map(g => {
  const pos = new THREE.Vector3(...g.pos), stand = new THREE.Vector3(...g.stand)
  let rot = g.rot
  if (g.in) {
    things[g.in].updateMatrixWorld(true)
    things[g.in].localToWorld(pos)
  }
  if (g.standIn) {
    things[g.standIn].localToWorld(stand)
    rot += things[g.standIn].rotation.y / DEG
  }
  const object = place({ model: 'gear', pos: pos.toArray(), solid: false })
  glow(object, 0xffb030, 0.06)
  return { ...g, object, pos, stand: stand.toArray(), rot, found: false }
})


// A small warm star marks the brass without bleaching its material.
const glintMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
const p = uv().sub(0.5).mul(2)
const rays = max(smoothstep(0.12, 0, abs(p.x)).mul(smoothstep(1, 0, abs(p.y))), smoothstep(0.12, 0, abs(p.y)).mul(smoothstep(1, 0, abs(p.x))))
glintMaterial.colorNode = vec3(1, 0.85, 0.5).mul(rays.add(smoothstep(0.35, 0, p.length()))).mul(sin(time.mul(4)).mul(0.15).add(0.65))
export const glints = gears.map(g => {
  const material = g.in === 'big_tree' ? glintMaterial.clone() : glintMaterial
  if (g.in === 'big_tree') material.depthTest = false
  const sprite = new THREE.Sprite(material)
  sprite.position.copy(g.pos).add(new THREE.Vector3(0, 0.035, 0))
  sprite.scale.setScalar(0.09)
  scene.add(sprite)
  return sprite
})

// Area-weighted samples stay on the actual brass surfaces, including while the watch is held in a hand.
// The surface normal owns the flash; a slow envelope softens it without moving sparkle across the object.
const glintRand = random(83), brassSamples = []
for (const [index, object] of [things.pocket_watch, ...gears.map(g => g.object)].entries()) {
  const mesh = object.getObjectByProperty('isMesh', true)
  const sampler = new MeshSurfaceSampler(mesh).setRandomGenerator(glintRand).build()
  for (let i = 0; i < 8; i++) {
    const local = new THREE.Vector3(), normal = new THREE.Vector3()
    sampler.sample(local, normal)
    local.addScaledVector(normal, 0.001)
    brassSamples.push({ object: mesh, local, normal, gear: index - 1 })
  }
}
const brassGeometry = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1))
const brassPosition = new THREE.InstancedBufferAttribute(new Float32Array(brassSamples.length * 4), 4).setUsage(THREE.DynamicDrawUsage)
const brassNormal = new THREE.InstancedBufferAttribute(new Float32Array(brassSamples.length * 3), 3).setUsage(THREE.DynamicDrawUsage)
brassGeometry.setAttribute('brassPosition', brassPosition)
brassGeometry.setAttribute('brassNormal', brassNormal)
brassGeometry.setAttribute('brassPhase', new THREE.InstancedBufferAttribute(Float32Array.from(brassSamples, (_, i) => i * 2.399), 1))
brassGeometry.instanceCount = brassSamples.length
const brassMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
const brassPoint = attribute('brassPosition', 'vec4')
brassMaterial.positionNode = brassPoint.xyz
brassMaterial.scaleNode = cameraPosition.sub(brassPoint.xyz).length().mul(0.002).clamp(0.018, 0.1).mul(brassPoint.w)
const halfLight = cameraPosition.sub(brassPoint.xyz).normalize().add(uniform(SUN)).normalize()
const catchLight = dot(attribute('brassNormal', 'vec3'), halfLight).abs().pow(18)
const glintBreath = sin(time.mul(0.8).add(attribute('brassPhase'))).mul(0.5).add(0.5).pow(3)
brassMaterial.colorNode = vec3(1, 0.84, 0.42).mul(rays.add(smoothstep(0.45, 0, p.length()).mul(0.3)))
  .mul(catchLight.mul(glintBreath).mul(3.5).add(0.025))
const brassGlints = new THREE.Mesh(brassGeometry, brassMaterial)
brassGlints.frustumCulled = false
scene.add(brassGlints)

export const drinks = layout.drinks.map(d => {
  const object = place({ ...d, solid: false })
  return { ...d, object, pos: new THREE.Vector3(...d.pos).setY(d.pos[1] + (d.by === 'small' ? 0.01 : 0.05)), home: object.position.clone() }
})

// Everything standing on the table, which dances in the final chorus: { object, home, turn, seed, size, on }, where
// `on` is the prop it stands on.
const tableObjects = [...cups, ...onTable.values(), ...drinks.filter(d => d.onTable).map(d => d.object), ...extraTable]
export const tableProps = tableObjects.map(object => ({
  object, home: object.position.clone(), turn: object.rotation.y, seed: Math.random() * 100, size: dressSizes.get(object) ?? meanSize(object),
}))
const tableProp = object => tableProps.find(p => p.object === object)
for (const [entry, object] of onTable) if (entry.on) tableProp(object).on = tableProp(things[entry.on])
extraTable.forEach((object, i) => {
  if (layout.tableDressing[i].onPrevious) tableProp(object).on = tableProp(extraTable[i - 1])
})
const saucers = extraTable.slice(-cups.length)
cups.forEach((cup, i) => { tableProp(cup).on = tableProp(saucers[i]) })

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
  hanging.forEach(({ pivot, phase }) => {
    pivot.rotation.z = Math.sin(time * 0.38 + phase) * 0.025
    pivot.rotation.x = Math.sin(time * 0.29 + phase * 0.7) * 0.018
  })
  glints.forEach((sprite, i) => { sprite.visible = !gears[i].found })
  gears.forEach((g, i) => {
    if (!g.found) g.object.rotation.y += dt * 1.5
    g.object.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 0.045 + 0.015 * Math.sin(time * 3 + i * 2) })
  })

  const breath = (time / 3) % 1
  bubble.scale.setScalar(breath < 0.9 ? 0.02 + breath * 0.1 : 0.001)


  wind.bushes.value = awake.flowers ? 2.5 : 0.4
  wind.pulse.value = game.pass >= 1 ? game.pulse : 0
}

// After the song and hand poses: instances, flames and halos follow the same final prop transforms.
const dressTransform = new THREE.Object3D(), dressPoint = new THREE.Vector3(), dressScale = new THREE.Vector3()
const brassNormalMatrix = new THREE.Matrix3(), brassDirection = new THREE.Vector3()
export function updateDressing(time) {
  for (const { mesh, objects } of dressBatches) {
    objects.forEach((object, i) => {
      object.updateWorldMatrix(true, false)
      mesh.setMatrixAt(i, object.matrixWorld)
    })
    mesh.instanceMatrix.needsUpdate = true
  }
  chainTransforms.forEach((object, i) => {
    object.updateWorldMatrix(true, false)
    chains.setMatrixAt(i, object.matrixWorld)
  })
  chains.instanceMatrix.needsUpdate = true
  flameAnchors.forEach(({ object, local }, i) => {
    object.updateWorldMatrix(true, false)
    dressTransform.position.copy(local).applyMatrix4(object.matrixWorld)
    object.getWorldScale(dressScale)
    const flutter = 1 + 0.09 * Math.sin(time * 7 + i * 2.399) + 0.04 * Math.sin(time * 13 + i * 4.798)
    dressTransform.scale.set(0.007 * dressScale.x, 0.018 * dressScale.y * flutter, 0.007 * dressScale.z)
    object.getWorldQuaternion(dressTransform.quaternion)
    dressTransform.updateMatrix()
    candleFlames.setMatrixAt(i, dressTransform.matrix)
  })
  candleFlames.instanceMatrix.needsUpdate = true
  haloAnchors.forEach(({ object, local, size }, i) => {
    dressPoint.copy(local).applyMatrix4(object.matrixWorld)
    haloPosition.setXYZW(i, dressPoint.x, dressPoint.y, dressPoint.z, size)
  })
  haloPosition.needsUpdate = true
  brassSamples.forEach(({ object, local, normal, gear }, i) => {
    object.updateWorldMatrix(true, false)
    dressPoint.copy(local).applyMatrix4(object.matrixWorld)
    brassPosition.setXYZW(i, dressPoint.x, dressPoint.y, dressPoint.z, gear < 0 || !gears[gear].found ? 1 : 0)
    brassNormalMatrix.getNormalMatrix(object.matrixWorld)
    brassDirection.copy(normal).applyNormalMatrix(brassNormalMatrix)
    brassNormal.setXYZ(i, brassDirection.x, brassDirection.y, brassDirection.z)
  })
  brassPosition.needsUpdate = brassNormal.needsUpdate = true
}
