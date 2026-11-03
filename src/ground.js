import * as THREE from 'three/webgpu'
import { texture, vec2, vec3, float, mix, smoothstep, positionWorld, color, mx_noise_float } from 'three/tsl'
import { scene, camera, webgpu } from './scene.js'
import { RAPIER, world } from './physics.js'
import { meadow, terraces, plaza, overlook } from './layout.js'
import { LEAVES, cardMaterial, cards, flowerClump } from './plants.js'
import { lush, bloom, species, bare, pathDistance, ground, level, random } from './fields.js'

// ?view=fields colours the land by its fields instead: green how lush, magenta where flowers bloom, grey the paths.
const FIELDS = new URLSearchParams(location.search).get('view') === 'fields'

// The shared fields over the garden in one small texture, 0.25 m a texel: red the lushness, green how worn the
// ground is (paths, under the table, tree and cottage), blue the flower bloom, alpha the damp round the fountain's
// plaza. The ground's material reads it.
const FIELD = { x0: -40, z0: -42, width: 80, depth: 75, texel: 0.25 }
const fw = FIELD.width / FIELD.texel, fh = FIELD.depth / FIELD.texel, fieldData = new Uint8Array(fw * fh * 4)
for (let j = 0; j < fh; j++) {
  for (let i = 0; i < fw; i++) {
    const x = FIELD.x0 + (i + 0.5) * FIELD.texel, z = FIELD.z0 + (j + 0.5) * FIELD.texel
    const worn = bare(x, z) ? 1 : Math.max(0, 1 - pathDistance(x, z) / (meadow.pathWidth * 0.7))
    const damp = Math.exp(-(((Math.hypot(x - plaza[0], z - plaza[1]) - plaza[2] - 1) / 1.3) ** 2))
    fieldData.set([lush(x, z), worn, bloom(x, z), damp].map(v => Math.round(v * 255)), (j * fw + i) * 4)
  }
}
const fieldMap = new THREE.DataTexture(fieldData, fw, fh)
fieldMap.magFilter = fieldMap.minFilter = THREE.LinearFilter
fieldMap.needsUpdate = true

// The ground: varied greens with dry and lush patches, paths and bare places worn to earth, a darker damp ring
// round the plaza, and beyond the garden a patchwork valley of fields and woods.
const field = texture(fieldMap, positionWorld.xz.sub(vec2(FIELD.x0, FIELD.z0)).div(vec2(FIELD.width, FIELD.depth)))
const here = positionWorld.xz
const broad = mx_noise_float(here.mul(0.11)), patch = mx_noise_float(here.mul(0.45).add(17)), speckle = mx_noise_float(here.mul(2.6).add(5))
let grass = mix(color(0x9a9a58), color(0x4f7a3a), field.r)
grass = mix(grass, color(0x7b9c46), smoothstep(0.05, 0.55, broad).mul(0.55))
grass = mix(grass, color(0x365a2c), smoothstep(0.05, 0.5, broad.negate()).mul(0.5))
grass = mix(grass, color(0x9a9a58), smoothstep(0.3, 0.6, patch.add(float(1).sub(field.r).mul(0.5))).mul(0.6))
let soil = mix(grass, color(0x8a7556).mul(speckle.mul(0.15).add(1)), smoothstep(0.25, 0.75, field.g.add(patch.mul(0.35)).add(speckle.mul(0.15))).mul(0.92))
soil = soil.mul(float(1).sub(field.a.mul(0.4))).mul(speckle.mul(0.1).add(1))
const valley = mix(mix(color(0x6d8c3e), color(0xb8a24f), smoothstep(-0.1, 0.4, mx_noise_float(here.mul(0.018).add(41)))), color(0x4a6a3a), smoothstep(0.2, 0.6, mx_noise_float(here.mul(0.03).add(9))))
const groundMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 1 })
groundMaterial.colorNode = FIELDS ? vec3(field.g.mul(0.5), field.r, field.b) : mix(soil, valley.mul(speckle.mul(0.1).add(1)), smoothstep(55, 95, here.sub(vec2(0, -4)).length()))
groundMaterial.roughnessNode = float(1).sub(field.a.mul(0.3))

// The land, out to the far hills.
const land = new THREE.PlaneGeometry(420, 420, 210, 210)
land.rotateX(-Math.PI / 2)
const position = land.attributes.position
for (let i = 0; i < position.count; i++) position.setY(i, ground(position.getX(i), position.getZ(i)))
land.computeVertexNormals()
const lawn = new THREE.Mesh(land, groundMaterial)
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

// Grass and flowers grow in 6 m chunks. Each chunk's cards and clumps are shuffled, so drawing fewer of them thins it
// evenly: full within 14 m of the camera, thinning to a quarter by 45 m, gone past 70 m (flowers past 45 m).
const CHUNK = 6
const rand = random(11)
const chunks = new Map()
function chunk(x, z) {
  const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`
  return chunks.get(key) ?? chunks.set(key, { grass: [], flowers: {}, centre: new THREE.Vector3((Math.floor(x / CHUNK) + 0.5) * CHUNK, 0, (Math.floor(z / CHUNK) + 0.5) * CHUNK) }).get(key)
}
const onPlaza = (x, z) => Math.hypot(x - plaza[0], z - plaza[1]) < plaza[2]
const open = (x, z) => !bare(x, z) && !onPlaza(x, z) && pathDistance(x, z) > meadow.pathWidth / 2
const upright = (yaw, lean = 0.15) => new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * lean, yaw, (rand() - 0.5) * lean, 'YXZ'))

const [x0, z0, x1, z1] = meadow.lawn
const share = webgpu ? 1 : 0.5
// How much of the full grass grows here, in [0, 1]: all of it within 12 m of a path (the paths join the places),
// on the terraces and on the overlook, thinning to a third by 40 m.
const grassShare = (x, z) => {
  if (level(x, z) > ground(x, z) || Math.hypot(x - overlook[0], z - overlook[1]) < overlook[2] + 4) return 1
  return Math.min(1, Math.max(0.35, 1 - (pathDistance(x, z) - 12) / 28 * 0.65))
}
// Grass: tufts as pairs of crossed cards, taller, deeper and greener where the lawn is lush. They stand on a
// jittered grid, so the lawn is covered evenly with no bare patches between them, and wide enough to overlap.
const spacing = 1 / Math.sqrt(meadow.grassPerSquareMetre * share)
for (let gx = x0; gx < x1; gx += spacing) {
  for (let gz = z0; gz < z1; gz += spacing) {
    const x = gx + rand() * spacing, z = gz + rand() * spacing
    if (!open(x, z) || rand() > grassShare(x, z)) continue
    const l = lush(x, z), height = 0.14 + 0.2 * l * (0.6 + rand() * 0.8), yaw = rand() * Math.PI, y = level(x, z)
    for (const turn of [0, Math.PI / 2]) {
      chunk(x, z).grass.push({
        position: new THREE.Vector3(x, y, z), quaternion: upright(yaw + turn), scale: new THREE.Vector3(height * 1.7, height, 1),
        cell: LEAVES.grass, base: [x, y, z, 6], tint: new THREE.Color(1.1 - 0.3 * l, 1, 0.65 + 0.15 * rand()).multiplyScalar(0.8 + 0.35 * rand()),
      })
    }
  }
}

// Flowers where the bloom field is high: modelled clumps, one for every few of the cards that once stood here.
// Low clumps (daisies, forget-me-nots, violets) sit among the grass; tall ones (foxgloves, mallows, roses) rise
// from it. The white blossom has no model and is gone.
const LOW = ['flower_daisy', 'flower_forget_me_not', 'flower_violets', 'flower_daisy']
const TALL = ['flower_foxglove', 'flower_mallow', 'flower_pink_rose', 'flower_red_rose', 'flower_foxglove']
const clumps = {}
const clump = new THREE.Matrix4()
for (let n = Math.round((x1 - x0) * (z1 - z0) * meadow.flowersPerSquareMetre * (webgpu ? 1 : 0.5)); n > 0; n--) {
  const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0)
  if (rand() > bloom(x, z) || !open(x, z) || rand() > 0.3) continue
  const kinds = rand() < 0.65 ? LOW : TALL, name = kinds[Math.floor(species(x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3) * kinds.length)]
  const c = chunk(x, z)
  clumps[name] ??= flowerClump(name)
  ;(c.flowers[name] ??= []).push(clump.compose(
    new THREE.Vector3(x, level(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
    new THREE.Vector3().setScalar(0.8 + rand() * 0.45),
  ).clone())
}

const grassMaterial = cardMaterial(LEAVES, { translucency: 1.1, flutter: 0.01 })
const shuffle = list => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
const drawn = []
for (const c of chunks.values()) {
  if (c.grass.length) {
    const mesh = cards(grassMaterial, LEAVES, shuffle(c.grass))
    mesh.castShadow = false
    scene.add(mesh)
    drawn.push({ mesh, full: c.grass.length, centre: c.centre, far: 70 })
  }
  for (const [name, list] of Object.entries(c.flowers)) {
    const mesh = new THREE.InstancedMesh(clumps[name].geometry, clumps[name].materials, list.length)
    shuffle(list).forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
    scene.add(mesh)
    drawn.push({ mesh, full: list.length, centre: c.centre, far: 45 })
  }
}

export function updateGround() {
  for (const d of drawn) {
    const distance = Math.hypot(d.centre.x - camera.position.x, d.centre.z - camera.position.z)
    const keep = distance < 14 ? 1 : distance > d.far ? 0 : Math.max(0.25, 1 - (distance - 14) / 41)
    d.mesh.count = Math.ceil(d.full * keep)
    d.mesh.visible = keep > 0
  }
}
