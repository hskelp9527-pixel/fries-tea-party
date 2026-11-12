import * as THREE from 'three/webgpu'
import { texture, vec2, vec3, float, mix, smoothstep, positionWorld, color, mx_noise_float } from 'three/tsl'
import { scene, camera, webgpu } from './scene.js'
import { RAPIER, world } from './physics.js'
import { meadow, paths, terraces, plaza, overlook } from './layout.js'
import { LEAVES, cardMaterial, cards, flowerClump, flowerMaterial, flowerMesh, shareAt, drawCount, walkers, stir } from './plants.js'
import { player } from './player.js'
import { quality } from './quality.js'
import { surfacePalette } from './look.js'
import { cast } from './cast.js'
import { noise, lush, bloom, species, bare, moss, bed, pathDistance, ground, level, random } from './fields.js'

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
// Lively greens: yellow-green where dry, a deep fresh green where lush, with sunlit and shaded drifts and warm golden
// patches (each mix weight trades vividness against how tidy the lawn looks; the sun's warm light multiplies all of it).
let grass = mix(color(surfacePalette.dry), color(surfacePalette.lush), field.r)
grass = mix(grass, color(surfacePalette.dry), smoothstep(0.05, 0.55, broad).mul(0.3))
grass = mix(grass, color(surfacePalette.moss), smoothstep(0.05, 0.5, broad.negate()).mul(0.4))
grass = mix(grass, color(surfacePalette.dry), smoothstep(0.3, 0.6, patch.add(float(1).sub(field.r).mul(0.5))).mul(0.25))
// Worn ground is sun-baked sand, warmer and lighter in patches with a fine grain: paths read as pale ribbons across the green.
let soil = mix(grass, mix(color(surfacePalette.soil), color(surfacePalette.soilLight), smoothstep(-0.3, 0.4, patch)).mul(speckle.mul(0.12).add(1)), smoothstep(0.25, 0.75, field.g.add(patch.mul(0.35)).add(speckle.mul(0.15))).mul(0.92))
// Moss and damp: a soft deep green that mottles with the patch noise, kept off the worn paths.
const mossy = smoothstep(0.15, 0.6, field.a.add(patch.mul(0.2))).mul(float(1).sub(field.g))
soil = mix(soil, color(surfacePalette.moss).mul(speckle.mul(0.12).add(1)), mossy.mul(0.9))
soil = soil.mul(speckle.mul(0.1).add(1))
const valley = mix(mix(color(surfacePalette.farGrass), color(surfacePalette.farDry), smoothstep(-0.1, 0.4, mx_noise_float(here.mul(0.018).add(41)))), color(surfacePalette.farForest), smoothstep(0.2, 0.6, mx_noise_float(here.mul(0.03).add(9))))
const groundMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 1 })
groundMaterial.colorNode = FIELDS ? vec3(field.g.mul(0.5), field.r, field.b) : mix(soil, valley.mul(speckle.mul(0.1).add(1)), smoothstep(38, 70, here.sub(vec2(0, -4)).length()))
groundMaterial.roughnessNode = float(1).sub(field.a.mul(0.3))
// Below the non-walkable garden brow, hand the distance over to the painted
// valley instead of exposing an empty fog-colored plane from giant height.
groundMaterial.alphaHash = true
groundMaterial.opacityNode = smoothstep(-7,-2,positionWorld.y)

// The land, out to the far hills. Its cells are 0.5 m over the garden, as fine as the walkable height field, so the
// plants rooted on the true height lie on the mesh (the overlook's slope is only a few metres across); beyond 40 m
// they widen by 8% a step.
const edges = [0]
for (let step = 1; edges.at(-1) < 210; edges.push(edges.at(-1) + step)) if (edges.at(-1) >= 40) step *= 1.08
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
const pavingMaterial=new THREE.MeshStandardNodeMaterial({roughness:.87})
const tile=positionWorld.xz.mul(1.45),tx=tile.x.fract(),tz=tile.y.fract()
const joint=tx.min(float(1).sub(tx)).min(tz.min(float(1).sub(tz)))
const paver=mix(color(0x9e8b71),color(0xbdab8b),smoothstep(-.3,.4,mx_noise_float(tile.floor().mul(3.1))))
pavingMaterial.colorNode=mix(color(0x61594e),paver.mul(speckle.mul(.045).add(.975)),smoothstep(.012,.035,joint))
// Under the fountain's basin (the grotto floor) the paving is wet stone stained with syrup: glossy where the syrup lies.
const grotto = float(1).sub(smoothstep(1.15, 1.4, positionWorld.xz.sub(vec2(plaza[0], plaza[1])).length()))
const syrup = smoothstep(0.05, 0.4, mx_noise_float(positionWorld.xz.mul(4.5))).mul(grotto)
const grottoStone = mix(mix(color(0x6a5f58), color(0xa09078), smoothstep(-0.3, 0.5, mx_noise_float(positionWorld.xz.mul(14)))), color(0xd48a28), syrup.mul(0.75))
pavingMaterial.colorNode = mix(pavingMaterial.colorNode, grottoStone, grotto)
pavingMaterial.roughnessNode = mix(float(0.87), mix(float(0.6), float(0.08), syrup), grotto)
const paving = new THREE.Mesh(new THREE.CircleGeometry(plaza[2], 48).rotateX(-Math.PI / 2), pavingMaterial)
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
// Grass (2 triangles a card): every card to 40 m, half by 60, none past 80.
const GRASS_FADE = [[15, 1], [27, 0.25], [40, 0]]
// Flowers are two meshes per cell and kind. The modelled clump (1000 to 2500 triangles) is drawn within 12 m only; past it
// a vertex-merged copy (300 to 600 triangles) stands in the same spot, every one of them out to 60 m, so the lawn never
// thins round the player. The swap is instant (see GROW): resizing plants on the way read as flowers following him.
// A longer near distance costs the most triangles (the full clumps were most of the frame's 10 million at 30 m).
const rand = random(11)
const grassCells = new Map(), flowerCells = new Map()
function cell(cells, size, x, z, make) {
  const i = Math.floor(x / size), j = Math.floor(z / size), key = `${i},${j}`
  return cells.get(key) ?? cells.set(key, { ...make(), box: [i * size, j * size, (i + 1) * size, (j + 1) * size] }).get(key)
}
const onPlaza = (x, z) => Math.hypot(x - plaza[0], z - plaza[1]) < plaza[2]
const open = (x, z) => !bare(x, z) && !onPlaza(x, z) && pathDistance(x, z) > meadow.pathWidth / 2
const upright = (yaw, lean = 0.15) => new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * lean, yaw, (rand() - 0.5) * lean, 'YXZ'))

// The rotation that tips a tuft at (x, z) towards the nearest path, or null beyond 1.8 m. LEAN is the tilt at the path's
// edge in radians: more reads as grass flopping over the sand but flattens the tufts' tips into the ground.
const LEAN = 0.7, REACH = 1.8
function leanToPath(x, z) {
  const d = pathDistance(x, z)
  if (d > REACH) return null
  const gx = pathDistance(x + 0.1, z) - d, gz = pathDistance(x, z + 0.1) - d, g = Math.hypot(gx, gz) || 1
  // up x (towards the path) is the axis that tips the blade's top that way
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(gz / g, 0, -gx / g).negate(), LEAN * (1 - (d - meadow.pathWidth / 2) / (REACH - meadow.pathWidth / 2)))
}

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
const spacing = 1 / Math.sqrt(meadow.grassPerSquareMetre * share * .64)
for (let gx = x0; gx < x1; gx += spacing) {
  for (let gz = z0; gz < z1; gz += spacing) {
    const x = gx + rand() * spacing, z = gz + rand() * spacing
    if (!open(x, z) || rand() > grassShare(x, z)) continue
    const l = lush(x, z), m = moss(x, z) > 0.3, yaw = rand() * Math.PI, y = level(x, z)
    // Mossy places grow a short soft pile (4 to 9 cm) so the daisies and clover show and Fries can walk through.
    // Elsewhere the height follows the lushness, a slow patch noise (tall and short stretches 3 to 4 m across) and the
    // bloom (up to 45% shorter, so the flowers stand clear of the grass instead of drowning in it).
    const swell = noise(x * 0.3 + 9, z * 0.3), sun = noise(x * 0.22 - 5, z * 0.22 + 2)
    const height = m ? 0.04 + 0.05 * rand() : (0.12 + 0.2 * l * (0.6 + rand() * 0.8)) * (0.6 + 0.9 * swell) * (1 - 0.45 * bloom(x, z))
    if (m && rand() < 0.6) {
      // Clover: a flat round leaf lying on the moss; one card each, so little geometry for a lot of green.
      const s = 0.1 + 0.1 * rand()
      cell(grassCells, GRASS_CELL, x, z, () => ({ list: [] })).list.push({
        position: new THREE.Vector3(x, y + 0.02, z), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, rand() * Math.PI * 2, 0, 'YXZ')),
        scale: new THREE.Vector3(s, s, 1), cell: LEAVES.round, base: [x, y, z, 0], tint: new THREE.Color(0.7 + 0.2 * rand(), 1, 0.55).multiplyScalar(0.9 + 0.3 * rand()),
      })
    }
    // Within 1.8 m of a path the tufts lean towards it, more the closer they stand (a soft fringe over the edge).
    const lean = leanToPath(x, z)
    for (const turn of [0, Math.PI / 2]) {
      cell(grassCells, GRASS_CELL, x, z, () => ({ list: [] })).list.push({
        position: new THREE.Vector3(x, y, z), quaternion: lean ? lean.clone().multiply(upright(yaw + turn)) : upright(yaw + turn), scale: new THREE.Vector3(height * 2.1, height * 1.08, 1),
        cell: LEAVES.grass, base: [x, y, z, 6], tint: new THREE.Color(0.95 - 0.25 * l + 0.2 * sun, 1, 0.6 + 0.15 * rand() - 0.2 * sun).multiplyScalar((m ? 0.9 : 0.6 + 0.6 * sun) + 0.3 * rand()),
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
const YELLOW = new THREE.Color(1, 0.82, 0.3), PINK = new THREE.Color(1, 0.62, 0.78)
const clumps = {}
const clump = new THREE.Matrix4()
for (let n = Math.round((x1 - x0) * (z1 - z0) * meadow.flowersPerSquareMetre * (webgpu ? 1 : 0.5)); n > 0; n--) {
  const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0)
  // The bloom is gathered into clusters about a metre across (cluster noise averages 0.5, so the count stays about the same).
  if (rand() > bloom(x, z) * (0.3 + 1.4 * noise(x * 0.9 + 3, z * 0.9)) || !open(x, z) || rand() > 0.6) continue
  const kinds = rand() < 0.65 ? LOW : TALL, m = moss(x, z) > 0.3, ring = bed(x, z) > 0.4
  // Under the table and between the roots: small daisies and forget-me-nots. Round the plaza: every kind at random, a
  // mixed bed. Elsewhere the drift's species with its neighbours in the palette mixed in.
  const name = m ? (rand() < 0.8 ? 'flower_daisy' : 'flower_forget_me_not') : ring ? BED[Math.min(BED.length - 1, Math.floor(species(x, z) * BED.length))]
    : kinds[Math.min(kinds.length - 1, Math.max(0, Math.floor(species(x, z) * kinds.length + (rand() - 0.5) * 0.25)))]
  clumps[name] ??= flowerClump(name)
  const matrix = clump.compose(
    new THREE.Vector3(x, level(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
    new THREE.Vector3().setScalar(m ? 0.55 + rand() * 0.3 : ring ? 1 + rand() * 0.5 : 1.15 + rand() * 0.65),
  ).clone()
  // The daisy model is white: some clumps are tinted buttercup yellow or pink (a multiply on the white petals).
  const dye = rand()
  if (name === 'flower_daisy' && dye < 0.45) matrix.tint = dye < 0.28 ? YELLOW : PINK
  ;(cell(flowerCells, FLOWER_CELL, x, z, () => ({ kinds: {} })).kinds[name] ??= []).push(matrix)
}

// Fallen petals along the paths: small flat five-sided petals in drifts of a few, in one mesh (one draw, 5 triangles each).
// More petals read as a carpet and cost a little; the drifts keep them looking blown rather than sprinkled.
const PETAL_DRIFTS = 110, PETALS_PER_DRIFT = 5
const PETAL_COLOURS = [0xf4a0b5, 0xc2283a, 0xfff0e0, 0xf8b890, 0xe8607a].map(c => new THREE.Color(c))
const lines = paths.flatMap(line => line.slice(1).map((p, i) => [line[i], p])), lengths = lines.map(([[ax, az], [bx, bz]]) => Math.hypot(bx - ax, bz - az))
const petals = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide }), PETAL_DRIFTS * PETALS_PER_DRIFT)
for (let n = 0; n < PETAL_DRIFTS; n++) {
  let pick = rand() * lengths.reduce((a, b) => a + b), k = 0
  while (pick > lengths[k]) pick -= lengths[k++]
  const [[ax, az], [bx, bz]] = lines[k], t = pick / lengths[k], side = (rand() - 0.5) * 1.8
  const cx = ax + (bx - ax) * t - (bz - az) / lengths[k] * side, cz = az + (bz - az) * t + (bx - ax) / lengths[k] * side
  const colour = PETAL_COLOURS[Math.floor(rand() * PETAL_COLOURS.length)]
  for (let i = 0; i < PETALS_PER_DRIFT; i++) {
    const x = cx + (rand() - 0.5) * 0.7, z = cz + (rand() - 0.5) * 0.7, id = n * PETALS_PER_DRIFT + i
    petals.setMatrixAt(id, clump.compose(
      new THREE.Vector3(x, ground(x, z) + 0.025, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.3, rand() * Math.PI * 2, (rand() - 0.5) * 0.3)),
      new THREE.Vector3(0.035 + 0.03 * rand(), 1, 0.02 + 0.02 * rand()),
    ))
    petals.setColorAt(id, colour)
  }
}
petals.computeBoundingSphere()
scene.add(petals)

const grassMaterial = cardMaterial(LEAVES, { translucency: 1.1, flutter: 0.01, thin: GRASS_FADE })
grassMaterial.colorNode = grassMaterial.colorNode.mul(color(0x9baf91))
const nearFlowerMaterial = flowerMaterial(undefined, false, true), farFlowerMaterial = flowerMaterial(undefined, true, true)
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
// Pack visible flowers by species and detail tier. Small spatial cells previously
// submitted hundreds of draws, including empty near/far tiers. Each flower now
// chooses exactly one geometry, with the same authored position and tint.
const flowerGroups = new Map(), flowerBatches = []
for (const c of flowerCells.values()) for (const [name, list] of Object.entries(c.kinds)) {
  if (!flowerGroups.has(name)) flowerGroups.set(name, [])
  flowerGroups.get(name).push(...list)
}
for (const [name, matrices] of flowerGroups) {
  const { geometry, simple } = clumps[name]
  const near = flowerMesh({ geometry, material: nearFlowerMaterial }, matrices)
  const far = flowerMesh({ geometry: simple, material: farFlowerMaterial }, matrices)
  for (const mesh of [near, far]) {
    mesh.name = `${name} ${mesh === near ? 'near' : 'far'}`
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.geometry.attributes.aRoot.setUsage(THREE.DynamicDrawUsage)
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false // the per-instance sphere cull below owns visibility
    scene.add(mesh)
  }
  geometry.computeBoundingSphere()
  const centre = geometry.boundingSphere.center, radius = geometry.boundingSphere.radius
  const plants = matrices.map(matrix => ({ matrix, tint: matrix.tint ?? new THREE.Color(1, 1, 1),
    root: new THREE.Vector3().setFromMatrixPosition(matrix),
    bounds: new THREE.Sphere(centre.clone(), radius).applyMatrix4(matrix) }))
  flowerBatches.push({ near, far, plants })
}
const plantFrustum = new THREE.Frustum(), plantProjection = new THREE.Matrix4()
const lastFlowerView = new THREE.Matrix4()
let lastFlowerQuality = 0
function updateFlowers() {
  camera.updateMatrixWorld()
  plantProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  if (lastFlowerView.equals(plantProjection) && lastFlowerQuality === quality.distance) return
  lastFlowerView.copy(plantProjection)
  lastFlowerQuality = quality.distance
  plantFrustum.setFromProjectionMatrix(plantProjection, camera.coordinateSystem)
  for (const { near, far, plants } of flowerBatches) {
    near.count = far.count = 0
    for (const plant of plants) {
      const distance = Math.hypot(plant.root.x - camera.position.x, plant.root.z - camera.position.z) * quality.distance
      if (distance > 60 || !plantFrustum.intersectsSphere(plant.bounds)) continue
      for(const mesh of distance<9?[near]:distance>11?[far]:[near,far]){
        const index=mesh.count++
        mesh.setMatrixAt(index, plant.matrix)
        mesh.setColorAt(index, plant.tint)
        mesh.geometry.attributes.aRoot.setXYZ(index, plant.root.x, plant.root.y, plant.root.z)
      }
    }
    for (const mesh of [near, far]) {
      mesh.visible = mesh.count > 0
      mesh.instanceMatrix.needsUpdate = mesh.instanceColor.needsUpdate = mesh.geometry.attributes.aRoot.needsUpdate = true
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
  updateFlowers()
  for (const d of drawn) {
    const [bx0, bz0, bx1, bz1] = d.box
    const distance = Math.hypot((bx0+bx1)/2-camera.position.x,(bz0+bz1)/2-camera.position.z)
    d.mesh.count = drawCount(d.full, shareAt(d.fade, distance * quality.distance))
    d.mesh.visible = d.mesh.count > 0
  }
}
