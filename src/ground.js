import * as THREE from 'three/webgpu'
import { scene, camera, webgpu } from './scene.js'
import { RAPIER, world } from './physics.js'
import { meadow, terraces, plaza } from './layout.js'
import { LEAVES, FLOWERS, cardMaterial, cards } from './plants.js'
import { lush, bloom, species, bare, pathDistance, ground, level, random } from './fields.js'

// ?view=fields colours the land by its fields instead: green how lush, magenta where flowers bloom, grey the paths.
const FIELDS = new URLSearchParams(location.search).get('view') === 'fields'

// The land, out to the far hills, coloured by the lawn's lushness (paths worn to earth).
const land = new THREE.PlaneGeometry(420, 420, 210, 210)
land.rotateX(-Math.PI / 2)
const deep = new THREE.Color(0x4f7a3a), dry = new THREE.Color(0x9a9a58), earth = new THREE.Color(0x8a7556), colour = new THREE.Color(), colours = []
const position = land.attributes.position
for (let i = 0; i < position.count; i++) {
  const x = position.getX(i), z = position.getZ(i)
  position.setY(i, ground(x, z))
  const worn = Math.max(0, 1 - pathDistance(x, z) / (meadow.pathWidth * 0.7))
  if (FIELDS) colour.setRGB(worn * 0.5, lush(x, z), bloom(x, z))
  else colour.lerpColors(dry, deep, lush(x, z)).lerp(earth, worn * 0.8)
  colour.toArray(colours, i * 3)
}
land.computeVertexNormals()
land.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
const lawn = new THREE.Mesh(land, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
lawn.receiveShadow = true
scene.add(lawn)

// The walkable land as a height field over the garden, in 0.5 m cells; movement stops at the brow all round.
const [px0, pz0, px1, pz1] = meadow.plateau, CELL = 0.5
const nx = Math.round((px1 - px0) / CELL), nz = Math.round((pz1 - pz0) / CELL), heights = new Float32Array((nx + 1) * (nz + 1))
for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) heights[i * (nz + 1) + j] = ground(px0 + i * CELL, pz0 + j * CELL) // rows run along Z
world.createCollider(RAPIER.ColliderDesc.heightfield(nz, nx, heights, { x: px1 - px0, y: 1, z: pz1 - pz0 }).setTranslation((px0 + px1) / 2, 0, (pz0 + pz1) / 2))
for (const [x, z, w, d] of [[px0, (pz0 + pz1) / 2, 0.5, (pz1 - pz0) / 2], [px1, (pz0 + pz1) / 2, 0.5, (pz1 - pz0) / 2], [(px0 + px1) / 2, pz0, (px1 - px0) / 2, 0.5], [(px0 + px1) / 2, pz1, (px1 - px0) / 2, 0.5]]) {
  world.createCollider(RAPIER.ColliderDesc.cuboid(w, 4, d).setTranslation(x, 2, z))
}

// The terraces: lawn on top (their faces are behind the retaining walls), and the fountain's paved plaza.
const lawnTop = new THREE.MeshStandardMaterial({ color: 0x6f8f4c, roughness: 1 }), stone = new THREE.MeshStandardMaterial({ color: 0x9d9283, roughness: 0.9 })
for (const [x0, z0, x1, z1, height] of terraces) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, height, z1 - z0), [stone, stone, lawnTop, stone, stone, stone])
  block.position.set((x0 + x1) / 2, height / 2, (z0 + z1) / 2)
  block.receiveShadow = true
  scene.add(block)
  world.createCollider(RAPIER.ColliderDesc.cuboid((x1 - x0) / 2, height / 2, (z1 - z0) / 2).setTranslation(block.position.x, block.position.y, block.position.z))
}
const paving = new THREE.Mesh(new THREE.CircleGeometry(plaza[2], 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9bca4, roughness: 0.85 }))
paving.position.set(plaza[0], 0.015, plaza[1])
paving.receiveShadow = true
scene.add(paving)

// Grass and flowers grow in 6 m chunks. Each chunk's cards are shuffled, so drawing fewer of them thins it
// evenly: full within 14 m of the camera, thinning to a quarter by 45 m, gone past 70 m.
const CHUNK = 6
const rand = random(11)
const chunks = new Map()
function chunk(x, z) {
  const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`
  return chunks.get(key) ?? chunks.set(key, { grass: [], low: [], tall: [], centre: new THREE.Vector3((Math.floor(x / CHUNK) + 0.5) * CHUNK, 0, (Math.floor(z / CHUNK) + 0.5) * CHUNK) }).get(key)
}
const onPlaza = (x, z) => Math.hypot(x - plaza[0], z - plaza[1]) < plaza[2]
const open = (x, z) => !bare(x, z) && !onPlaza(x, z) && pathDistance(x, z) > meadow.pathWidth / 2
const upright = (yaw, lean = 0.15) => new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * lean, yaw, (rand() - 0.5) * lean, 'YXZ'))
const tint = (h, s, l) => new THREE.Color().setHSL(h, s, l)
const leafTint = () => new THREE.Color(0.8, 0.95, 0.7).multiplyScalar(0.8 + 0.3 * rand())

const [x0, z0, x1, z1] = meadow.lawn
const share = webgpu ? 1 : 0.5
// Grass: tufts as pairs of crossed cards, taller, deeper and greener where the lawn is lush.
for (let n = Math.round((x1 - x0) * (z1 - z0) * meadow.grassPerSquareMetre * share); n > 0; n--) {
  const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0)
  if (!open(x, z)) continue
  const l = lush(x, z), height = 0.12 + 0.2 * l * (0.6 + rand() * 0.8), yaw = rand() * Math.PI, y = level(x, z)
  for (const turn of [0, Math.PI / 2]) {
    chunk(x, z).grass.push({
      position: new THREE.Vector3(x, y, z), quaternion: upright(yaw + turn), scale: new THREE.Vector3(height * 1.3, height, 1),
      cell: LEAVES.grass, base: [x, y, z, 6], tint: new THREE.Color(1.1 - 0.3 * l, 1, 0.65 + 0.15 * rand()).multiplyScalar(0.8 + 0.35 * rand()),
    })
  }
}

// Flowers in three heights where the bloom field is high. Low heads (daisies, forget-me-nots, violets) face up
// among the grass; knee-high clumps (foxgloves, mallows, roses, blossom) stand on stems with leaves at their feet.
const LOW = [FLOWERS.daisy, FLOWERS.forgetMeNot, FLOWERS.violets, FLOWERS.daisy]
const TALL = [FLOWERS.foxglove, FLOWERS.mallow, FLOWERS.pinkRose, FLOWERS.blossom, FLOWERS.foxglove]
const stem = (list, x, y, z, top) => list.push({
  position: new THREE.Vector3(x, y, z), quaternion: upright(rand() * Math.PI, 0.1), scale: new THREE.Vector3(0.012, top, 1),
  cell: LEAVES.laurel, base: [x, y, z, 2.5], tint: new THREE.Color(0.7, 0.85, 0.5),
})
for (let n = Math.round((x1 - x0) * (z1 - z0) * meadow.flowersPerSquareMetre * (webgpu ? 1 : 0.5)); n > 0; n--) {
  const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0), b = bloom(x, z)
  if (rand() > b || !open(x, z)) continue
  const kind = species(x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3), c = chunk(x, z), y = level(x, z)
  if (rand() < 0.65) {
    const height = 0.06 + rand() * 0.12
    stem(c.low, x, y, z, height)
    c.low.push({
      position: new THREE.Vector3(x, y + height, z), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2 + (rand() - 0.5) * 0.6, rand() * 6.3, 0, 'YXZ')),
      scale: 0.08 + rand() * 0.06, cell: LOW[Math.floor(kind * LOW.length)], base: [x, y, z, 2.5], tint: tint(0, 0, 0.85 + rand() * 0.15),
    })
  } else {
    const flower = TALL[Math.floor(kind * TALL.length)], height = 0.35 + rand() * 0.45 * b
    stem(c.tall, x, y, z, height)
    for (let k = 0; k < 3; k++) {
      c.tall.push({
        position: new THREE.Vector3(x + (rand() - 0.5) * 0.12, y, z + (rand() - 0.5) * 0.12), quaternion: upright(rand() * 6.3, 0.9),
        scale: new THREE.Vector3(0.09, 0.16, 1), cell: LEAVES.laurel, base: [x, y, z, 2.5], tint: leafTint(),
      })
    }
    const heads = flower === FLOWERS.foxglove ? 5 : 1 + Math.floor(rand() * 3)
    for (let k = 0; k < heads; k++) {
      const up = flower === FLOWERS.foxglove ? height * (0.55 + 0.45 * k / heads) : height * (0.85 + rand() * 0.15)
      const yaw = rand() * 6.3
      c.tall.push({
        position: new THREE.Vector3(x + Math.sin(yaw) * 0.03, y + up - 0.04, z + Math.cos(yaw) * 0.03),
        quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(flower === FLOWERS.foxglove ? 0.3 : -0.7, yaw, 0, 'YXZ')),
        scale: flower === FLOWERS.foxglove ? 0.09 : 0.12 + rand() * 0.07, cell: flower, base: [x, y, z, 2.5], tint: tint(0, 0, 0.9 + rand() * 0.1),
      })
    }
  }
}

const grassMaterial = cardMaterial(LEAVES, { translucency: 1.1, flutter: 0.01 })
const leafMaterial = cardMaterial(LEAVES, { translucency: 0.8, flutter: 0.01 })
const flowerMaterial = cardMaterial(FLOWERS, { translucency: 0.6, flutter: 0.015, gloss: 0.55 })
const shuffle = list => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
const drawn = []
for (const c of chunks.values()) {
  const stems = [...c.low, ...c.tall].filter(f => f.cell === LEAVES.laurel), heads = [...c.low, ...c.tall].filter(f => f.cell !== LEAVES.laurel)
  for (const [material, sheet, list] of [[grassMaterial, LEAVES, c.grass], [leafMaterial, LEAVES, stems], [flowerMaterial, FLOWERS, heads]]) {
    if (!list.length) continue
    const mesh = cards(material, sheet, shuffle(list))
    mesh.castShadow = false
    scene.add(mesh)
    drawn.push({ mesh, full: list.length, centre: c.centre })
  }
}

export function updateGround() {
  for (const d of drawn) {
    const distance = Math.hypot(d.centre.x - camera.position.x, d.centre.z - camera.position.z)
    const keep = distance < 14 ? 1 : distance > 70 ? 0 : Math.max(0.25, 1 - (distance - 14) / 41)
    d.mesh.count = Math.ceil(d.full * keep)
    d.mesh.visible = keep > 0
  }
}
