import * as THREE from 'three/webgpu'
import { scene, webgpu } from './scene.js'
import { RAPIER, world } from './physics.js'
import { things } from './garden.js'
import { model } from './models.js'
import { bushes, hedges, rosePath, doors } from './layout.js'
import { LEAVES, cardMaterial, cards, flowerClump, flowerMesh } from './plants.js'
import { noise, random, ground } from './fields.js'

// Leaves in volumes: the big tree's crown, the ivy on its trunk, the bushes and hedges.
// All are leaf cards; none has a solid core.
const rand = random(7)
const UP = new THREE.Vector3(0, 1, 0)
// A tint over the atlas's own colour: `light` about 1, warmer or cooler leaf to leaf.
const leafTint = light => {
  const k = light * (0.8 + rand() * 0.4), warm = rand() * 0.25
  return new THREE.Color(k * (0.9 + warm), k, k * (0.85 - warm))
}
const share = webgpu ? 1 : 0.5

// Leaves filling an ellipsoid round `centre` with `radii`, thickest towards its surface, about `layers` deep
// over its whole surface, each card facing roughly out of the volume with a random twist, its petiole towards
// the middle.
function crown(list, { centre, radii, cell, size, light = 1, layers = 2.5 }) {
  size *= 1.3
  const radius = Math.max(radii.x, radii.y, radii.z), p = 1.6
  const area = 4 * Math.PI * (((radii.x * radii.y) ** p + (radii.x * radii.z) ** p + (radii.y * radii.z) ** p) / 3) ** (1 / p)
  const count = Math.round(area * layers / (0.5 * size * size) * share)
  const out = new THREE.Vector3(), q = new THREE.Quaternion(), twist = new THREE.Quaternion()
  for (let i = 0; i < count; i++) {
    out.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1)
    if (out.lengthSq() > 1 || out.lengthSq() < 0.01) { i--; continue }
    const r = Math.pow(rand(), 0.35)
    out.normalize()
    const position = new THREE.Vector3(out.x * radii.x * r, out.y * radii.y * r, out.z * radii.z * r).add(centre)
    q.setFromUnitVectors(UP, out.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(1.2)).normalize())
    twist.setFromAxisAngle(UP, rand() * Math.PI * 2)
    list.push({
      position, quaternion: q.clone().multiply(twist), scale: size * (0.75 + rand() * 0.5), cell,
      base: [centre.x, centre.y, centre.z, radius], tint: leafTint(light),
    })
  }
}

// The big tree's crown: the branch wood above where the trunk forks (5 m up the unscaled tree, clear of gear 1's
// hollow) is gathered into cells about 1.6 m across at the tree's scale, and each cell that the gap field leaves open
// grows a cluster of leaves round the branch there. Few gaps: enough to let the low sun through, not so many that the
// bare branch wood shows over the table.
const treeLeaves = []
const tree = things.big_tree
tree.updateMatrixWorld(true)
const cellsOfWood = new Map(), v = new THREE.Vector3(), FORK = 5.0, CELL = 1.6 * tree.scale.x
tree.traverse(o => {
  if (!o.isMesh) return
  const position = o.geometry.attributes.position
  for (let i = 0; i < position.count; i += 3) {
    v.fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld)
    if (v.y < tree.position.y + FORK * tree.scale.y) continue
    const key = [Math.floor(v.x / CELL), Math.floor(v.y / CELL), Math.floor(v.z / CELL)].join()
    const c = cellsOfWood.get(key) ?? cellsOfWood.set(key, { sum: new THREE.Vector3(), n: 0 }).get(key)
    c.sum.add(v)
    c.n++
  }
})
const treeBase = tree.position
for (const { sum, n } of cellsOfWood.values()) {
  if (n < 2) continue
  const centre = sum.divideScalar(n)
  if (noise(centre.x * 0.55 + 2, centre.z * 0.55 + centre.y * 0.3) < 0.11) continue
  const outer = Math.min(1, Math.hypot(centre.x - treeBase.x, centre.z - treeBase.z) / (6 * tree.scale.x))
  // The camera's sweep stops at the leaves (a sensor nothing else feels), so it pulls in rather than entering them.
  world.createCollider(RAPIER.ColliderDesc.ball(1.2 * tree.scale.x).setTranslation(centre.x, centre.y + 0.25, centre.z).setSensor(true))
  crown(treeLeaves, {
    centre: centre.add(new THREE.Vector3(0, 0.25, 0)), radii: new THREE.Vector3(1.25, 0.85, 1.25).multiplyScalar(tree.scale.x),
    cell: LEAVES.round, size: 0.32, light: 0.8 + 0.3 * outer, layers: 1.6 + outer,
  })
}

// Ivy climbing the trunk: strands start low on the bark and creep upwards over its surface, each step moving to
// the nearest bark point above; leaves lie flat on the bark, facing out along its normal.
const ivyLeaves = []
const bark = []
// The trunk's doorway, the door's rectangle plus a margin, in the tree's frame: no ivy or leaf card goes in it.
const { hinge, scale } = doors.tree, MARGIN = 0.4, local = new THREE.Vector3()
const inDoorway = point => {
  tree.worldToLocal(local.copy(point))
  return local.z > 0 && local.x > hinge[0] - MARGIN && local.x < hinge[0] + 1.306 * scale[0] + MARGIN && local.y < hinge[1] + 2 * scale[1] + MARGIN
}
tree.traverse(o => {
  if (!o.isMesh) return
  const position = o.geometry.attributes.position, normal = o.geometry.attributes.normal
  const turn = new THREE.Matrix3().getNormalMatrix(o.matrixWorld)
  for (let i = 0; i < position.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld)
    if (p.y > 0.2 && p.y < 4.2 && !inDoorway(p) && Math.hypot(p.x - treeBase.x, p.z - treeBase.z) < 3.2) {
      bark.push({ p, n: new THREE.Vector3().fromBufferAttribute(normal, i).applyMatrix3(turn).normalize() })
    }
  }
})
const nearestBark = point => {
  let best = bark[0], d = Infinity
  for (const b of bark) {
    const e = b.p.distanceToSquared(point)
    if (e < d) { d = e; best = b }
  }
  return best
}
const facing = new THREE.Quaternion(), turn = new THREE.Quaternion()
for (let strand = 0; strand < 14 * share && bark.length; strand++) {
  let at = bark[Math.floor(rand() * bark.length)]
  if (at.p.y > 1.2) { strand--; continue }
  const sideways = new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).multiplyScalar(0.25)
  for (let step = 0; step < 26; step++) {
    const next = nearestBark(at.p.clone().add(UP.clone().multiplyScalar(0.14)).add(sideways))
    if (next.p.y <= at.p.y) break
    at = next
    for (let k = 0; k < 3; k++) {
      facing.setFromUnitVectors(new THREE.Vector3(0, 0, 1), at.n)
      turn.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (rand() - 0.5) * 1.6)
      ivyLeaves.push({
        position: at.p.clone().addScaledVector(at.n, 0.03).add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.12)),
        quaternion: facing.clone().multiply(turn), scale: 0.13 + rand() * 0.07, cell: LEAVES.ivy,
        base: [treeBase.x, at.p.y, treeBase.z, 3], tint: leafTint(0.85),
      })
    }
  }
}

// Bushes and hedges: dense leaf volumes, solid to walk into.
const bushLeaves = []
for (const [x, z] of bushes) {
  crown(bushLeaves, { centre: new THREE.Vector3(x, 0.55, z), radii: new THREE.Vector3(0.7, 0.55, 0.7), cell: LEAVES.round, size: 0.2 })
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.55, 0.5, 0.55).setTranslation(x, 0.5, z))
}
for (const [x0, z0, x1, z1, height, thickness] of hedges) {
  const length = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(length / 1.3)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    crown(bushLeaves, {
      centre: new THREE.Vector3(x0 + (x1 - x0) * t, height / 2, z0 + (z1 - z0) * t),
      radii: new THREE.Vector3(x1 !== x0 ? 0.85 : thickness / 2, height / 2, z1 !== z0 ? 0.85 : thickness / 2),
      cell: LEAVES.laurel, size: 0.42, light: 0.75, layers: 1.3,
    })
  }
  world.createCollider(RAPIER.ColliderDesc.cuboid(Math.abs(x1 - x0) / 2 + thickness / 2, height / 2, Math.abs(z1 - z0) / 2 + thickness / 2)
    .setTranslation((x0 + x1) / 2, height / 2, (z0 + z1) / 2))
}

// The rose path behind the big tree, hidden until the ending: flagstones between banks of red roses, ending in
// the heart-shaped arch.
export const roses = new THREE.Group()
roses.visible = false
scene.add(roses)
const roseLeaves = [], roseHeads = []
const roseClump = flowerClump('flower_red_rose'), head = new THREE.Matrix4()
const [rx0, rz0] = rosePath.from, [rx1, rz1] = rosePath.to, length = Math.hypot(rx1 - rx0, rz1 - rz0)
const along = new THREE.Vector2(rx1 - rx0, rz1 - rz0).normalize(), across = new THREE.Vector2(-along.y, along.x)
for (let d = 0; d < length; d += 0.35) {
  const stone = model(`flagstone_${'abcd'[Math.floor(rand() * 4)]}`)
  stone.position.set(rx0 + along.x * d, ground(rx0 + along.x * d, rz0 + along.y * d) - 0.05, rz0 + along.y * d)
  stone.rotation.y = rand() * 3
  roses.add(stone)
  for (const side of [-1, 1]) {
    const centre = new THREE.Vector3(rx0 + along.x * d + across.x * side * 1.5, 1.05, rz0 + along.y * d + across.y * side * 1.5)
    crown(roseLeaves, { centre, radii: new THREE.Vector3(0.7, 1.05, 0.7), cell: LEAVES.round, size: 0.22, light: 0.8 })
    for (let k = 0; k < 6; k++) {
      const out = new THREE.Vector3(rand() - 0.5, rand() * 0.8, rand() - 0.5).normalize()
      roseHeads.push(head.compose(
        centre.clone().add(out.clone().multiply(new THREE.Vector3(0.7, 1.05, 0.7))), new THREE.Quaternion().setFromUnitVectors(UP, out),
        new THREE.Vector3().setScalar(0.4 + rand() * 0.2),
      ).clone())
    }
  }
}
const roseHeadMesh = flowerMesh(roseClump, roseHeads)
const arch = model('heart_arch')
arch.position.set(rosePath.arch[0], 0, rosePath.arch[1])
arch.rotation.y = Math.atan2(along.x, along.y)
roses.add(arch, cards(cardMaterial(LEAVES, { crown: true, sway: 0.01 }), LEAVES, roseLeaves), roseHeadMesh)

const leafMaterial = cardMaterial(LEAVES, { crown: true, sway: 0.012 })
// The crown, ivy, bushes and hedges are one draw, so they can afford to cast shadows.
scene.add(cards(leafMaterial, LEAVES, [...treeLeaves, ...bushLeaves, ...ivyLeaves].filter(leaf => !inDoorway(leaf.position)), true))
