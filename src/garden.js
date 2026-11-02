import * as THREE from 'three/webgpu'
import { scene } from './scene.js'
import { RAPIER, world } from './physics.js'
import { model, glow, addColliders } from './models.js'
import * as layout from './layout.js'

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

export const bushes = layout.bushes.map(([x, z]) => place({ model: 'bush', pos: [x, 0, z] }))
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
