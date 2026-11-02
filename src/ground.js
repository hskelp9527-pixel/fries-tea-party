import * as THREE from 'three/webgpu'
import { positionLocal, time, sin, vec3 } from 'three/tsl'
import { scene, webgpu } from './scene.js'
import { RAPIER, world } from './physics.js'
import { placed, grass } from './layout.js'

// The lawn, with gentle patches of lighter, yellower and darker green.
const plane = new THREE.PlaneGeometry(300, 300, 150, 150)
plane.rotateX(-Math.PI / 2)
const base = new THREE.Color(0x6f9a5c), dry = new THREE.Color(0x9aa860), colour = new THREE.Color(), colours = []
for (let i = 0; i < plane.attributes.position.count; i++) {
  const x = plane.attributes.position.getX(i), z = plane.attributes.position.getZ(i)
  const n = Math.sin(x * 0.21 + Math.sin(z * 0.13)) + Math.sin(z * 0.17 - x * 0.05) + 0.5 * Math.sin((x + z) * 0.43)
  colour.lerpColors(base, dry, 0.25 + 0.15 * n).multiplyScalar(0.92 + 0.06 * Math.sin(x * 0.9) * Math.sin(z * 0.7)).toArray(colours, i * 3)
}
plane.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
const lawn = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
lawn.receiveShadow = true
scene.add(lawn)
world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 40).setTranslation(0, -0.5, 0))

// One wind for grass and flowers, computed on the GPU: a gust rolling across the garden, bending each blade
// more the higher up it is. Instancing is applied before this, so positionLocal is in garden space.
const gust = sin(time.mul(1.7).add(positionLocal.x.mul(0.5)).add(positionLocal.z.mul(0.35))).mul(0.25)
  .add(sin(time.mul(3.1).add(positionLocal.x.mul(1.3))).mul(0.06))
const wind = positionLocal.add(vec3(gust, 0, gust.mul(0.6)).mul(positionLocal.y.mul(0.6)))

// Somewhere on open lawn: inside the garden, off the bare areas and away from the stone path.
const stones = placed.filter(p => p.model === 'stone_path').map(p => p.pos)
const [x0, z0, x1, z1] = grass.area
function lawnSpot() {
  for (;;) {
    const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0)
    if (grass.bare.some(([a, b, c, d]) => x > a && x < c && z > b && z < d)) continue
    if (stones.some(([sx, , sz]) => Math.hypot(x - sx, z - sz) < 0.55)) continue
    return [x, z]
  }
}

function scatter(geometry, material, count, place) {
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), size = new THREE.Vector3(), at = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const [x, y, z, height, tint] = place()
    turn.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.random() * Math.PI * 2)
    mesh.setMatrixAt(i, matrix.compose(at.set(x, y, z), turn, size.set(1, height, 1)))
    mesh.setColorAt(i, tint)
  }
  mesh.receiveShadow = true
  scene.add(mesh)
}

// Grass: two crossed blades per instance, dark at the root and light at the tip.
const blade = new THREE.BufferGeometry()
const w = 0.012
blade.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, 0, 1, 0, 0, 0, -w, 0, 0, w, 0, 1, 0], 3))
blade.setAttribute('color', new THREE.Float32BufferAttribute([0.3, 0.42, 0.2, 0.3, 0.42, 0.2, 0.75, 0.85, 0.45, 0.3, 0.42, 0.2, 0.3, 0.42, 0.2, 0.75, 0.85, 0.45], 3))
blade.computeVertexNormals()
const grassMaterial = new THREE.MeshStandardNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 })
grassMaterial.positionNode = wind
const area = (x1 - x0) * (z1 - z0)
const green = new THREE.Color()
scatter(blade, grassMaterial, Math.round(area * grass.perSquareMetre * (webgpu ? 1 : 0.3)), () => {
  const [x, z] = lawnSpot()
  return [x, 0, z, grass.height[0] + Math.random() * (grass.height[1] - grass.height[0]), green.setHSL(0.24 + Math.random() * 0.06, 0.5, 0.45 + Math.random() * 0.15)]
})

// Patches of small flowers on the lawn.
const flowerMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 0.7 })
flowerMaterial.positionNode = wind
const heads = new THREE.BoxGeometry(0.035, 0.025, 0.035).translate(0, 1, 0)
let patch, patchLeft = 0
const petal = new THREE.Color(), palette = [0xffffff, 0xf2d04a, 0xe8a0c8, 0xb8a0f0]
scatter(heads, flowerMaterial, grass.flowerPatches * grass.flowersPerPatch * (webgpu ? 1 : 0.5), () => {
  if (patchLeft-- === 0) {
    patch = [...lawnSpot(), palette[Math.floor(Math.random() * palette.length)]]
    patchLeft = grass.flowersPerPatch * (webgpu ? 1 : 0.5) - 1
  }
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * grass.flowerRadius
  return [patch[0] + Math.cos(a) * r, 0, patch[1] + Math.sin(a) * r, 0.1 + Math.random() * 0.12, petal.set(patch[2])]
})
