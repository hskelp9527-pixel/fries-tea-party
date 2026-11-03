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
export const wind = { strength: uniform(1), bushes: uniform(0.4), pulse: uniform(0) }
const gust = p => {
  const along = p.x.mul(0.8).add(p.y.mul(0.6))
  const front = pow(sin(along.mul(0.33).sub(time.mul(1.3))).mul(0.5).add(0.5), 1.6)
  const chop = sin(along.mul(1.7).sub(time.mul(3.1)).add(p.y.mul(0.9))).mul(0.5).add(0.5)
  return vec2(0.8, 0.6).mul(front.mul(0.75).add(chop.mul(0.25))).mul(wind.strength)
}

// A card material. Every card is a unit quad standing on its root (the bottom edge of its atlas cell: a stalk,
// a petiole, the base of a tuft), with per-instance attributes:
//   aCell  the atlas cell's bottom-left corner in uv units
//   aBase  xyz the point the plant is rooted at and w its stiffness (ground plants: they bend from the root, more
//          the higher up, so stems and heads move together), or for crowns the crown's centre and w its radius
// `crown` cards (tree foliage, bushes, hedges, ivy) shade as one volume: normals point out of the crown, leaves
// inside it are darker, and those at its edge glow when the low sun is behind them. Their crowns sway as a whole
// and each leaf flutters about its petiole.
export function cardMaterial(sheet, { crown = false, translucency = 0.8, flutter = 0.02, sway = 0.02, gloss = 0.7 } = {}) {
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
      .add(positionLocal.sub(base.xyz).mul(wind.pulse.mul(base.y.lessThan(2.5).select(0.12, 0))))
    const outward = positionWorld.sub(base.xyz).normalize()
    material.normalNode = cameraViewMatrix.mul(vec4(outward.add(normalWorld.mul(0.3)).normalize(), 0)).xyz
  } else {
    const height = positionLocal.y.sub(base.y).max(0)
    const bend = gust(base.xz).mul(height.mul(height).mul(base.w))
    material.positionNode = positionLocal.add(vec3(bend.x.add(flap), bend.length().mul(height).mul(-0.3), bend.y))
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
// tint (Color) }.
export function cards(material, sheet, list) {
  const geometry = quad.clone()
  const cell = new Float32Array(list.length * 2), base = new Float32Array(list.length * 4)
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
  mesh.castShadow = mesh.receiveShadow = true
  mesh.computeBoundingSphere()
  return mesh
}

// A flower clump model (art/models/kit/<name>.glb) as one geometry with a group per material, and a wind material
// for each. Vertices bend with the gust by their height above the clump's foot, so the foot stays put and the
// heads sway; they sway harder once the flowers wake, and the pulse stretches them.
export function flowerClump(name) {
  const meshes = []
  model(name).traverse(o => { if (o.isMesh) meshes.push(o) })
  const height = positionGeometry.y
  const materials = meshes.map(({ material }) => {
    const flower = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: material.roughness, side: THREE.DoubleSide })
    const bend = gust(positionLocal.xz).mul(height.mul(height).mul(0.8)).mul(wind.bushes.mul(0.5).add(1))
    flower.positionNode = positionLocal.add(vec3(bend.x, bend.length().mul(height).mul(-0.3).add(height.mul(wind.pulse).mul(0.12)), bend.y))
    return flower
  })
  return { geometry: mergeGeometries(meshes.map(m => m.geometry), true), materials }
}
