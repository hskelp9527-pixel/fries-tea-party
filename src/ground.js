import * as THREE from 'three/webgpu'
import { texture, vec2, vec3, float, mix, smoothstep, positionWorld, color, mx_noise_float } from 'three/tsl'
import { scene, camera, webgpu } from './scene.js'
import { RAPIER, world } from './physics.js'
import { meadow, terraces, plaza, overlook } from './layout.js'
import { LEAVES, cardMaterial, cards, flowerClump, flowerMaterial, flowerMesh, shareAt, drawCount, walkers, stir } from './plants.js'
import { player } from './player.js'
import { cast } from './cast.js'
import { lush, bloom, species, bare, moss, bed, pathDistance, ground, level, random } from './fields.js'

// ?view=fields colours the land by its fields instead: green how lush, magenta where flowers bloom, grey the paths.
const FIELDS = new URLSearchParams(location.search).get('view') === 'fields'

// The shared fields over the garden in one small texture, 0.25 m a texel: red the lushness, green how worn the
// ground is (paths and the cottage), blue the flower bloom, alpha the moss (under the table, between the tree's
// roots) and the damp round the fountain's plaza. The ground's material reads it.
const FIELD = { x0: -40, z0: -42, width: 80, depth: 75, texel: 0.25 }
const fw = FIELD.width / FIELD.texel, fh = FIELD.depth / FIELD.texel, fieldData = new Uint8Array(fw * fh * 4)
for (let j = 0; j < fh; j++) {
  for (let i = 0; i < fw; i++) {
    const x = FIELD.x0 + (i + 0.5) * FIELD.texel, z = FIELD.z0 + (j + 0.5) * FIELD.texel
    const worn = bare(x, z) ? 1 : Math.max(0, 1 - pathDistance(x, z) / (meadow.pathWidth * 0.7))
    const damp = Math.exp(-(((Math.hypot(x - plaza[0], z - plaza[1]) - plaza[2] - 1) / 1.3) ** 2))
    fieldData.set([lush(x, z), worn, bloom(x, z), Math.max(damp, moss(x, z))].map(v => Math.round(v * 255)), (j * fw + i) * 4)
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
// Moss and damp: a soft deep green that mottles with the patch noise, kept off the worn paths.
const mossy = smoothstep(0.15, 0.6, field.a.add(patch.mul(0.2))).mul(float(1).sub(field.g))
soil = mix(soil, mix(color(0x4f8a3a), color(0x7aa848), smoothstep(-0.2, 0.5, patch)).mul(speckle.mul(0.12).add(1)), mossy.mul(0.9))
soil = soil.mul(speckle.mul(0.1).add(1))
const valley = mix(mix(color(0x6d8c3e), color(0xb8a24f), smoothstep(-0.1, 0.4, mx_noise_float(here.mul(0.018).add(41)))), color(0x4a6a3a), smoothstep(0.2, 0.6, mx_noise_float(here.mul(0.03).add(9))))
const groundMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 1 })
groundMaterial.colorNode = FIELDS ? vec3(field.g.mul(0.5), field.r, field.b) : mix(soil, valley.mul(speckle.mul(0.1).add(1)), smoothstep(55, 95, here.sub(vec2(0, -4)).length()))
groundMaterial.roughnessNode = float(1).sub(field.a.mul(0.3))

// The land, out to the far hills. Its cells are 0.5 m over the garden, as fine as the walkable height field, so the
// plants rooted on the true height lie on the mesh (the overlook's slope is only a few metres across); beyond 40 m
// they widen by 8% a step.
const edges = [0]
for (let step = 0.5; edges.at(-1) < 210; edges.push(edges.at(-1) + step)) if (edges.at(-1) >= 40) step *= 1.08
const coords = [...edges.slice(1).reverse().map(e => -e), ...edges], count = coords.length
const land = new THREE.PlaneGeometry(1, 1, count - 1, count - 1).rotateX(-Math.PI / 2)
const position = land.attributes.position
for (let i = 0; i < position.count; i++) {
  const x = coords[i % count], z = coords[Math.floor(i / count)]
  position.setXYZ(i, x, ground(x, z), z)
}
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

// The terraces: their tops take the lawn's own ground material (it reads world x, z, so it matches the lawn
// beside them; their faces are behind the retaining walls), and the fountain's paved plaza.
const stone = new THREE.MeshStandardMaterial({ color: 0x9d9283, roughness: 0.9 })
for (const [x0, z0, x1, z1, height] of terraces) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, height, z1 - z0), [stone, stone, groundMaterial, stone, stone, stone])
  block.position.set((x0 + x1) / 2, height / 2, (z0 + z1) / 2)
  block.receiveShadow = true
  scene.add(block)
  world.createCollider(RAPIER.ColliderDesc.cuboid((x1 - x0) / 2, height / 2, (z1 - z0) / 2).setTranslation(block.position.x, block.position.y, block.position.z))
}
const paving = new THREE.Mesh(new THREE.CircleGeometry(plaza[2], 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9bca4, roughness: 0.85 }))
paving.position.set(plaza[0], 0.015, plaza[1])
paving.receiveShadow = true
scene.add(paving)

// Grass and flowers grow in square cells; each cell is one InstancedMesh per material (one for the grass, one per
// flower kind and detail), culled by the camera frustum through its bounding sphere. A cell's cards and clumps are
// shuffled, so drawing the first few of them thins it evenly. Bigger cells mean fewer draw calls but a coarser
// frustum cull and more hidden instances still sent to the GPU (a cell's draw count follows its nearest edge; the
// shader sizes each plant by its own distance); smaller ones do the opposite. Grass is cheap per card, so its cells are big; flowers are heavy, so theirs are small and follow the
// camera's distance closely.
const GRASS_CELL = 16, FLOWER_CELL = 8
// Share curves, [metres, share]: the share of a cell's plants drawn at that distance from the camera, linear between
// points. Each plant grows from its root as the share passes its rank, so density changes swell and shrink plants
// instead of popping them, and past the last point nothing is drawn (the ground texture carries the colour). Longer or
// fuller curves cost triangles; thinner mid curves show the lawn through the grass sooner.
// Grass (2 triangles a card): full to 20 m, half by 40, a fifth by 60, none past 80.
const GRASS_FADE = [[20, 1], [40, 0.5], [60, 0.2], [80, 0]]
// Flowers are two meshes per cell and kind. The modelled clump (1000 to 2500 triangles) is drawn only close up, thinning from
// every clump at 5 m to none at 15 m; a vertex-merged copy (100 to 350 triangles) takes over as it thins (the far mesh draws
// the clumps the near one does not, so near and far together are about one clump in every spot at 5 to 15 m) and carries on out to 60
// m, thinning as it goes. A shorter near curve saves the most triangles; a longer one keeps the petals crisp further out.
const NEAR_FLOWERS = [[5, 1], [15, 0]]
const FAR_FLOWERS = [[5, 0], [15, 0.85], [35, 0.45], [60, 0]]
const rand = random(11)
const grassCells = new Map(), flowerCells = new Map()
function cell(cells, size, x, z, make) {
  const i = Math.floor(x / size), j = Math.floor(z / size), key = `${i},${j}`
  return cells.get(key) ?? cells.set(key, { ...make(), box: [i * size, j * size, (i + 1) * size, (j + 1) * size] }).get(key)
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
    const l = lush(x, z), m = moss(x, z) > 0.3, yaw = rand() * Math.PI, y = level(x, z)
    // Mossy places grow a short soft pile (4 to 9 cm) so the daisies and clover show and Fries can walk through.
    const height = m ? 0.04 + 0.05 * rand() : 0.14 + 0.2 * l * (0.6 + rand() * 0.8)
    if (m && rand() < 0.6) {
      // Clover: a flat round leaf lying on the moss; one card each, so little geometry for a lot of green.
      const s = 0.1 + 0.1 * rand()
      cell(grassCells, GRASS_CELL, x, z, () => ({ list: [] })).list.push({
        position: new THREE.Vector3(x, y + 0.02, z), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, rand() * Math.PI * 2, 0, 'YXZ')),
        scale: new THREE.Vector3(s, s, 1), cell: LEAVES.round, base: [x, y, z, 0], tint: new THREE.Color(0.7 + 0.2 * rand(), 1, 0.55).multiplyScalar(0.9 + 0.3 * rand()),
      })
    }
    for (const turn of [0, Math.PI / 2]) {
      cell(grassCells, GRASS_CELL, x, z, () => ({ list: [] })).list.push({
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
const BED = ['flower_daisy', 'flower_forget_me_not', 'flower_violets', 'flower_foxglove', 'flower_mallow', 'flower_pink_rose', 'flower_red_rose']
const clumps = {}
const clump = new THREE.Matrix4()
for (let n = Math.round((x1 - x0) * (z1 - z0) * meadow.flowersPerSquareMetre * (webgpu ? 1 : 0.5)); n > 0; n--) {
  const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0)
  if (rand() > bloom(x, z) || !open(x, z) || rand() > 0.6) continue
  const kinds = rand() < 0.65 ? LOW : TALL, m = moss(x, z) > 0.3, ring = bed(x, z) > 0.4
  // Under the table and between the roots: small daisies and forget-me-nots. Round the plaza: every kind at random, a
  // mixed bed. Elsewhere the drift's species with its neighbours in the palette mixed in.
  const name = m ? (rand() < 0.8 ? 'flower_daisy' : 'flower_forget_me_not') : ring ? BED[Math.floor(rand() * BED.length)]
    : kinds[Math.min(kinds.length - 1, Math.max(0, Math.floor(species(x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3) * kinds.length)))]
  clumps[name] ??= flowerClump(name)
  ;(cell(flowerCells, FLOWER_CELL, x, z, () => ({ kinds: {} })).kinds[name] ??= []).push(clump.compose(
    new THREE.Vector3(x, level(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
    new THREE.Vector3().setScalar(m ? 0.55 + rand() * 0.3 : ring ? 1 + rand() * 0.5 : 1.15 + rand() * 0.65),
  ).clone())
}

const grassMaterial = cardMaterial(LEAVES, { translucency: 1.1, flutter: 0.01, thin: GRASS_FADE })
const nearFlowerMaterial = flowerMaterial(NEAR_FLOWERS), farFlowerMaterial = flowerMaterial(FAR_FLOWERS)
const shuffle = list => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
const drawn = []
for (const c of grassCells.values()) {
  const mesh = cards(grassMaterial, LEAVES, shuffle(c.list))
  scene.add(mesh)
  drawn.push({ mesh, full: c.list.length, box: c.box, fade: GRASS_FADE })
}
for (const c of flowerCells.values()) {
  for (const [name, list] of Object.entries(c.kinds)) {
    const matrices = shuffle(list), { geometry, simple } = clumps[name]
    for (const [clump, fade, order] of [[{ geometry, material: nearFlowerMaterial }, NEAR_FLOWERS, matrices], [{ geometry: simple, material: farFlowerMaterial }, FAR_FLOWERS, [...matrices].reverse()]]) {
      const mesh = flowerMesh(clump, order)
      scene.add(mesh)
      drawn.push({ mesh, full: list.length, box: c.box, fade })
    }
  }
}

// The characters push the grass and flowers round them while they move, and spring back as they pass. Each is
// [position, radius, speed]; Fries's radius grows with his size. While he runs, a gust follows him.
const people = [[player.feet, () => player.p.scale], ...['hatter', 'hare', 'dormouse'].map(name => [cast[name].object.position, () => 1])]
  .map(([position, size]) => ({ position, size, last: position.clone(), speed: 0 }))
const heading = new THREE.Vector2(), want = new THREE.Vector2()
let run = 0, before = performance.now()
function updateWalkers() {
  const now = performance.now(), dt = Math.max((now - before) / 1000, 1e-3)
  before = now
  people.forEach((c, i) => {
    const size = c.size(), vx = (c.position.x - c.last.x) / dt, vz = (c.position.z - c.last.z) / dt
    c.speed += (Math.hypot(vx, vz) - c.speed) * Math.min(1, dt * 6)
    c.last.copy(c.position)
    walkers[i].value.set(c.position.x, c.position.z, size * (i === 3 ? 0.4 : 1), Math.min(1, c.speed / (0.5 * size)))
    if (i === 0) {
      run += ((c.speed > 1.5 * player.p.speed ? 1 : 0) - run) * Math.min(1, dt * 3)
      if (vx || vz) heading.lerp(want.set(vx, vz).normalize(), Math.min(1, dt * 4))
      stir.value.set(c.position.x, c.position.z, heading.x * run * size, heading.y * run * size)
    }
  })
}

export function updateGround() {
  updateWalkers()
  for (const d of drawn) {
    const [bx0, bz0, bx1, bz1] = d.box
    const distance = Math.hypot(Math.max(bx0 - camera.position.x, 0, camera.position.x - bx1), Math.max(bz0 - camera.position.z, 0, camera.position.z - bz1))
    d.mesh.count = drawCount(d.full, shareAt(d.fade, distance))
    d.mesh.visible = d.mesh.count > 0
  }
}
