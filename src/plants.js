import * as THREE from 'three/webgpu'
import {
  uniform, attribute, uv, texture, time, sin, vec2, vec3, vec4, float, mix, pow, dot, smoothstep, positionLocal,
  positionWorld, positionGeometry, cameraPosition, cameraViewMatrix, normalWorld,
} from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { SUN } from './scene.js'
import { model } from './models.js'

// Leaves and grass are drawn as instanced cards cut out of the alpha atlas leaves.png (2 x 2: round serrated
// leaf, laurel leaf, ivy leaf, grass tuft); without it each card is a plain oval. Flowers are modelled clumps.
const images = import.meta.glob('/art/textures/kit/*.png', { eager: true, query: '?url', import: 'default' })
function atlas(name) {
  const url = images[`/art/textures/kit/${name}.png`]
  if (!url) return null
  const map = new THREE.TextureLoader().load(url)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  return map
}
// Cells as [column, row] counted from the bottom left, with the atlas's columns and rows.
export const LEAVES = { map: atlas('leaves'), grid: [2, 2], round: [0, 1], laurel: [1, 1], ivy: [0, 0], grass: [1, 0] }

const sun = uniform(SUN)

// The wind, one field for the whole garden: gust fronts rolling in from the west with quicker chop on top, as a
// bend direction on the ground. `calm` scales it (the bushes stir harder once the flowers wake).
// `pulse` is the song's beat in the final dance, felt only by the grass and flowers near the dancers.
export const wind = { strength: uniform(1), bushes: uniform(0.4), pulse: uniform(0) }
// Grass and flowers stand almost still: only this much of the wind reaches them.
const BREEZE = 0.04
// The characters in the grass (Fries and the three hosts): x, z, the radius they push within, and how much they are
// moving (0 standing, 1 walking). And Fries's gust while he runs: x, z and the heading scaled by how hard he runs.
export const walkers = Array.from({ length: 4 }, () => uniform(new THREE.Vector4()))
export const stir = uniform(new THREE.Vector4())
const gust = p => {
  const along = p.x.mul(0.8).add(p.y.mul(0.6))
  const front = pow(sin(along.mul(0.33).sub(time.mul(1.3))).mul(0.5).add(0.5), 1.6)
  const chop = sin(along.mul(1.7).sub(time.mul(3.1)).add(p.y.mul(0.9))).mul(0.5).add(0.5)
  return vec2(0.8, 0.6).mul(front.mul(0.75).add(chop.mul(0.25))).mul(wind.strength)
}

// Distance fading of ground plants. Each instance carries `aRank`, its place in its mesh's shuffled list as a fraction (0 to
// 1), and a mesh draws a share of its instances that falls with the camera's distance: an instance is drawn once the
// share passes its rank. Instead of switching on, it grows from its root over the next 1/GROW of share, so thinning
// swells and shrinks the plants rather than popping them. A bigger GROW is a sharper change (more like popping, less
// blur of the density edge); a smaller one is softer but makes more instances half-grown, which costs vertices for
// little to see.
const GROW = 6
// A share curve is [[metres, share], ...], linear between points and held beyond the ends. `shareAt` is the
// share in JavaScript (what the cells' draw counts follow), `shareNode` the same in the shader.
export const shareAt = (curve, d) => curve.slice(1).reduce((s, [d1, k1], i) => s + (k1 - curve[i][1]) * Math.min(1, Math.max(0, (d - curve[i][0]) / (d1 - curve[i][0]))), curve[0][1])
const shareNode = (curve, d) => curve.slice(1).reduce((s, [d1, k1], i) => s.add(d.sub(curve[i][0]).div(d1 - curve[i][0]).saturate().mul(k1 - curve[i][1])), float(curve[0][1]))
// How many of a mesh's instances (the first ones, as they are ranked in order) can show at `share`.
export const drawCount = (full, share) => Math.min(full, Math.ceil(full * share / (1 - 1 / GROW)))
// The size, 0 to 1, of the plant rooted at `root` (world x, z) under a share curve.
const grown = (curve, root) => shareNode(curve, root.sub(cameraPosition.xz).length()).sub(attribute('aRank', 'float').mul(1 - 1 / GROW)).mul(GROW).saturate()

// What the characters do to the plants rooted at `root` (world x, z): `push`, the sideways shove away from every
// walker within its radius plus the running gust, and `near`, 1 close to a dancer fading to 0 at 5.5 m.
function touch(root) {
  let push = vec2(0, 0), near = float(0)
  for (const w of walkers) {
    const away = root.sub(w.xy), d = away.length()
    push = push.add(away.div(d.max(0.05)).mul(float(1).sub(d.div(w.z)).saturate().mul(w.w)))
    near = near.max(float(1).sub(smoothstep(2.5, 5.5, d)))
  }
  const s = root.sub(stir.xy).length()
  push = push.add(stir.zw.mul(float(1).sub(smoothstep(0.5, 4, s)).mul(sin(time.mul(9).sub(s.mul(2.5))).mul(0.3).add(0.7))))
  return { push, near }
}

// A card material. Every card is a unit quad standing on its root (the bottom edge of its atlas cell: a stalk,
// a petiole, the base of a tuft), with per-instance attributes:
//   aCell  the atlas cell's bottom-left corner in uv units
//   aBase  xyz the point the plant is rooted at and w its stiffness (ground plants: they bend from the root, more
//          the higher up, so stems and heads move together), or for crowns the crown's centre and w its radius
// `crown` cards (tree foliage, bushes, hedges, ivy) shade as one volume: normals point out of the crown, leaves
// inside it are darker, and those at its edge glow when the low sun is behind them. Their crowns sway as a whole
// and each leaf flutters about its petiole.
// With `thin`, a share curve (see `shareAt`), ground plants fade out with distance.
export function cardMaterial(sheet, { crown = false, translucency = 0.8, flutter = 0.02, sway = 0.02, gloss = 0.7, thin } = {}) {
  const material = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, alphaTest: 0.5, roughness: gloss })
  const cell = attribute('aCell', 'vec2'), base = attribute('aBase', 'vec4')
  const cellUv = uv().div(vec2(...sheet.grid)).add(cell)
  const sample = sheet.map ? texture(sheet.map, cellUv) : vec4(0.36, 0.5, 0.22, smoothstep(0.5, 0.45, uv().sub(vec2(0.5, 0.5)).length()))
  const depth = crown ? positionWorld.sub(base.xyz).length().div(base.w).saturate() : uv().y.mul(0.6).add(0.4)
  material.colorNode = sample.rgb.mul(mix(0.45, 1, depth))
  material.opacityNode = sample.a

  const flap = sin(time.mul(7).add(base.x.mul(3.1)).add(positionLocal.y.mul(4)).add(positionLocal.x.mul(5))).mul(flutter).mul(uv().y)
  if (crown) {
    const drift = gust(base.xz).mul(base.y.max(0).mul(sway)).mul(float(1).add(wind.bushes.mul(base.y.lessThan(2.5).select(1, 0))))
    material.positionNode = positionLocal.add(vec3(drift.x.add(flap), flap.mul(0.6), drift.y.sub(flap)))
    const outward = positionWorld.sub(base.xyz).normalize()
    material.normalNode = cameraViewMatrix.mul(vec4(outward.add(normalWorld.mul(0.3)).normalize(), 0)).xyz
  } else {
    const height = positionLocal.y.sub(base.y).max(0), { push, near } = touch(base.xz)
    const bend = gust(base.xz).mul(BREEZE).add(push.mul(0.5)).mul(height.mul(height).mul(base.w))
    material.positionNode = (thin ? positionLocal.mul(grown(thin, base.xz)) : positionLocal).add(vec3(bend.x, bend.length().mul(height).mul(-0.3).add(height.mul(wind.pulse).mul(near).mul(0.25)), bend.y))
    material.normalNode = cameraViewMatrix.mul(vec4(mix(normalWorld, vec3(0, 1, 0), 0.6).normalize(), 0)).xyz
  }
  const toCamera = cameraPosition.sub(positionWorld).normalize()
  const through = pow(dot(toCamera, sun.negate()).saturate(), 3).mul(depth)
  material.emissiveNode = sample.rgb.mul(vec3(1, 0.75, 0.4)).mul(through).mul(translucency)
  return material
}

// The quad every card is drawn with: 1 x 1, standing on its bottom edge, facing +Z.
const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0)

// One instanced mesh of cards: each { position, quaternion, scale (Vector3 or number), cell, base: [x, y, z, w],
// tint (Color) }. It casts shadows only when asked: a caster is drawn again in every shadow pass, so only a
// single-draw crown should.
export function cards(material, sheet, list, casts = false) {
  const geometry = quad.clone()
  const cell = new Float32Array(list.length * 2), base = new Float32Array(list.length * 4), rank = new Float32Array(list.length).map((_, i) => i / list.length)
  const mesh = new THREE.InstancedMesh(geometry, material, list.length)
  const matrix = new THREE.Matrix4(), size = new THREE.Vector3()
  list.forEach((c, i) => {
    mesh.setMatrixAt(i, matrix.compose(c.position, c.quaternion, typeof c.scale === 'number' ? size.setScalar(c.scale) : c.scale))
    mesh.setColorAt(i, c.tint)
    cell[i * 2] = c.cell[0] / sheet.grid[0]
    cell[i * 2 + 1] = c.cell[1] / sheet.grid[1]
    base.set(c.base, i * 4)
  })
  geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2))
  geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 4))
  geometry.setAttribute('aRank', new THREE.InstancedBufferAttribute(rank, 1))
  mesh.castShadow = casts
  mesh.receiveShadow = true
  mesh.computeBoundingSphere()
  return mesh
}

// A flower clump model (art/models/kit/<name>.glb) as one geometry (its parts differ only by vertex colour, so they
// share one material and the clump is a single draw), and a wind material for it.
// Vertices bend by their height above the clump's foot, so the foot stays put and the heads move: with the breeze,
// away from the characters, and with the beat near the dancers. Draw it with `flowerMesh`. With `thin`, a share curve
// (see `shareAt`), the material fades its clumps out with distance, so it is made once per curve and shared.
export function flowerMaterial(thin) {
  const height = positionGeometry.y, root = attribute('aRoot', 'vec3').xz, { push, near } = touch(root)
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide })
  const bend = gust(positionLocal.xz).mul(BREEZE).mul(wind.bushes.mul(0.5).add(1)).add(push).mul(height.mul(height).mul(0.8))
  material.positionNode = (thin ? positionLocal.mul(grown(thin, root)) : positionLocal).add(vec3(bend.x, bend.length().mul(height).mul(-0.3).add(height.mul(wind.pulse).mul(near).mul(0.12)), bend.y))
  return material
}
export function flowerClump(name) {
  const meshes = []
  model(name).traverse(o => { if (o.isMesh) meshes.push(o) })
  const geometry = mergeGeometries(meshes.map(m => m.geometry))
  return { geometry, simple: simplify(geometry, 10), material: flowerMaterial() }
}

// A cheap copy of a geometry for distance: vertices snapped to a grid of `divisions` cells across its longest side
// and merged (positions, normals and colours averaged), triangles that collapse dropped. A 1000 to 2500 triangle
// clump becomes 100 to 350. Fewer divisions are cheaper and blobbier.
function simplify(geometry, divisions) {
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox, q = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) / divisions
  const names = ['position', 'normal', 'color'], source = names.map(n => geometry.attributes[n]), index = geometry.index.array
  const cluster = new Map(), of = new Int32Array(source[0].count), sums = []
  for (let i = 0; i < of.length; i++) {
    const key = [source[0].getX(i), source[0].getY(i), source[0].getZ(i)].map(v => Math.round(v / q)).join()
    if (!cluster.has(key)) { cluster.set(key, cluster.size); sums.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }
    const sum = sums[cluster.get(key)]
    of[i] = cluster.get(key)
    source.forEach((a, k) => { sum[k * 3] += a.getX(i); sum[k * 3 + 1] += a.getY(i); sum[k * 3 + 2] += a.getZ(i) })
    sum[9]++
  }
  const out = new THREE.BufferGeometry(), indices = []
  names.forEach((n, k) => out.setAttribute(n, new THREE.Float32BufferAttribute(sums.flatMap(s => [s[k * 3] / s[9], s[k * 3 + 1] / s[9], s[k * 3 + 2] / s[9]]), 3)))
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [of[index[i]], of[index[i + 1]], of[index[i + 2]]]
    if (a !== b && b !== c && a !== c) indices.push(a, b, c)
  }
  return out.setIndex(indices)
}

// An instanced mesh of a flower clump at the given matrices. Each instance carries its root, which the wind
// materials need and the instance matrix does not give them.
export function flowerMesh({ geometry, material }, matrices) {
  const own = new THREE.BufferGeometry(), root = new Float32Array(matrices.length * 3), rank = new Float32Array(matrices.length).map((_, i) => i / matrices.length)
  own.setIndex(geometry.index)
  for (const name in geometry.attributes) own.setAttribute(name, geometry.attributes[name])
  const mesh = new THREE.InstancedMesh(own, material, matrices.length)
  matrices.forEach((matrix, i) => {
    mesh.setMatrixAt(i, matrix)
    root.set(matrix.elements.slice(12, 15), i * 3)
  })
  own.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 3))
  own.setAttribute('aRank', new THREE.InstancedBufferAttribute(rank, 1))
  mesh.computeBoundingSphere()
  return mesh
}
