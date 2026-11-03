import * as THREE from 'three/webgpu'
import { uv, vec2, vec3, float, smoothstep, sin, time, attribute, dot, pow, positionWorld, cameraPosition, uniform, floor, fract, fwidth, max, mix, abs, normalWorld, normalMap } from 'three/tsl'
import { scene, webgpu, SUN } from './scene.js'
import { things, keepOut, awake, cups } from './garden.js'
import { effects, butterflyBeds } from './layout.js'
import { random } from './fields.js'
import './motes.js'

// The frozen magic in the air: petals hanging still (they fall once the tea wakes), butterflies perched round the
// fountain (they take off once the syrup wakes), and soft steam over the tea.
const rand = random(23)
const sun = uniform(SUN)
const backlit = pow(dot(cameraPosition.sub(positionWorld).normalize(), sun.negate()).saturate(), 2)

// Petals: small curved shells, translucent pink, glowing when the sun is behind them.
const shell = new THREE.PlaneGeometry(0.07, 0.05, 4, 3)
const p = shell.attributes.position
for (let i = 0; i < p.count; i++) p.setZ(i, -12 * (p.getX(i) ** 2 + 0.6 * p.getY(i) ** 2) + 0.004 * Math.sin(p.getY(i) * 60))
shell.computeVertexNormals()
const petalMaterial = new THREE.MeshPhysicalNodeMaterial({ side: THREE.DoubleSide, color: 0xf6b2c6, roughness: 0.45, transparent: true })
const round = uv().sub(0.5).mul(vec2(1, 1.25)).length()
petalMaterial.opacityNode = smoothstep(0.5, 0.42, round).mul(0.88)
petalMaterial.emissiveNode = vec3(1, 0.55, 0.62).mul(backlit.mul(0.9).add(0.08))
const P = effects.petals
const petals = new THREE.InstancedMesh(shell, petalMaterial, Math.round(P.count * (webgpu ? 1 : 0.5)))
const petal = Array.from({ length: petals.count }, () => ({
  pos: new THREE.Vector3(...P.center.map((c, i) => c + (rand() - 0.5) * P.size[i])),
  turn: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
  fall: 0.15 + rand() * 0.2,
  phase: rand() * 6,
}))
for (const p of petal) keepOut(p.pos, 0.05)
const dummy = new THREE.Object3D()
function placePetals() {
  petal.forEach((p, i) => {
    dummy.position.copy(p.pos)
    dummy.rotation.copy(p.turn)
    dummy.updateMatrix()
    petals.setMatrixAt(i, dummy.matrix)
  })
  petals.instanceMatrix.needsUpdate = true
}
placePetals()
scene.add(petals)

// A pair of articulated, two-lobed wings per butterfly, all in one draw. The scale lattice and its glints
// remain attached to UVs; unresolved scales fade into the mean rather than flickering at a distance.
const wingShape = new THREE.PlaneGeometry(0.09, 0.12, 3, 4).translate(0.045, 0, 0).rotateX(Math.PI / 2)
const wingMaterial = new THREE.MeshPhysicalNodeMaterial({ side: THREE.DoubleSide, alphaTest: 0.4, iridescence: 0.5, iridescenceIOR: 1.56 })
const w = uv().sub(vec2(0, 0.5))
const fore = w.sub(vec2(0.45, 0.19)).div(vec2(0.54, 0.31)).length()
const hind = w.sub(vec2(0.32, -0.23)).div(vec2(0.38, 0.25)).length()
const outline = fore.min(hind), lobes = smoothstep(1, 0.93, outline)
wingMaterial.opacityNode = lobes
const lattice = uv().mul(vec2(48, 64))
const row = floor(lattice.y), cell = floor(vec2(lattice.x.add(row.mul(0.5)), lattice.y))
const hash = offset => fract(sin(dot(cell.add(offset), vec2(127.1, 311.7))).mul(43758.5453))
const detail = smoothstep(0.9, 0.35, max(fwidth(lattice.x), fwidth(lattice.y)))
const scaleNormal = vec3(hash(0).sub(0.5).mul(detail).mul(0.3), hash(7.31).sub(0.5).mul(detail).mul(0.3), 1).normalize()
wingMaterial.normalNode = normalMap(scaleNormal.mul(0.5).add(0.5))
wingMaterial.roughnessNode = mix(0.48, 0.28, detail)
wingMaterial.iridescenceThicknessNode = mix(300, 460, hash(3.17).mul(detail).add(float(1).sub(detail).mul(0.5)))
const edge = smoothstep(0.74, 0.98, outline)
const veinWave = abs(sin(w.y.div(w.x.add(0.12)).mul(10)))
const veins = smoothstep(fwidth(veinWave).add(0.1), 0.025, veinWave).mul(float(1).sub(edge))
const pigment = mix(attribute('wingTint', 'vec3'), vec3(0.14, 0.055, 0.025), edge.mul(0.8).add(veins.mul(0.25)))
wingMaterial.colorNode = pigment
const halfLight = cameraPosition.sub(positionWorld).normalize().add(sun).normalize()
const reflection = pow(abs(dot(normalWorld, halfLight)), 48)
const scales = mix(0.45, smoothstep(0.8, 0.98, hash(11.9)), detail)
wingMaterial.emissiveNode = pigment.mul(backlit.mul(0.3).add(0.12))
  .add(vec3(1, 0.76, 0.32).mul(veins).mul(0.35))
  .add(vec3(1, 0.88, 0.6).mul(reflection).mul(scales).mul(3))
const B = effects.butterflies, COLOURS = [0xffc23a, 0xff8ac0, 0x8ac8ff, 0xfff6ee]
const perches = [{ center: B.center, count: 18, radius: B.perch }, ...butterflyBeds.map(center => ({ center, count: 6, radius: 0.45 }))]
const butterflies = perches.flatMap(({ center, count, radius }, bed) => Array.from({ length: count }, (_, i) => {
  const phase = i / count * Math.PI * 2 + bed, body = new THREE.Object3D()
  body.position.set(center[0] + Math.cos(phase) * radius, center[1] + 0.08, center[2] + Math.sin(phase) * radius)
  body.rotation.y = rand() * 6
  body.scale.setScalar(0.7 + rand() * 0.5)
  return { body, center, phase, radius: 1.3 + rand() * 2, speed: 0.14 + rand() * 0.16, lift: 0 }
}))
const wingTints = new Float32Array(butterflies.length * 6)
butterflies.forEach((_, i) => {
  const tint = new THREE.Color(COLOURS[i % COLOURS.length])
  tint.toArray(wingTints, i * 6)
  tint.toArray(wingTints, i * 6 + 3)
})
wingShape.setAttribute('wingTint', new THREE.InstancedBufferAttribute(wingTints, 3))
const wings = new THREE.InstancedMesh(wingShape, wingMaterial, butterflies.length * 2)
const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.005, 0.04, 2, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x49301b, roughness: 0.65 }), butterflies.length)
for (const mesh of [wings, bodies]) {
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  scene.add(mesh)
}
const wingPose = new THREE.Object3D(), wingMatrix = new THREE.Matrix4()

// Steam: soft puffs that swell, drift and fade as they rise from the cups and teapots once the tea wakes.
const steamFrom = [...cups, things.pink_teapot, things.blue_teapot, things.teapot]
const puffs = Array.from({ length: 48 }, () => {
  const material = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false })
  const age = uniform(1), seed = rand() * 10
  const soft = smoothstep(0.5, 0.05, uv().sub(0.5).length())
  const wisp = sin(uv().x.mul(9).add(time.mul(1.7)).add(seed)).mul(0.25).add(0.75)
  material.colorNode = vec3(1, 0.97, 0.94)
  material.opacityNode = soft.mul(wisp).mul(sin(age.mul(Math.PI))).mul(0.32)
  const sprite = new THREE.Sprite(material)
  sprite.visible = false
  scene.add(sprite)
  return { sprite, age, drift: rand() - 0.5 }
})
let puffTimer = 0

const to = new THREE.Vector3()
export function updateMagic(dt, time) {
  if (awake.tea) {
    puffTimer -= dt
    if (puffTimer < 0) {
      puffTimer = 0.07
      const puff = puffs.find(p => p.age.value >= 1)
      puff.age.value = 0
      steamFrom[Math.floor(rand() * steamFrom.length)].getWorldPosition(puff.sprite.position).y += 0.1
    }
    for (const p of puffs) {
      p.age.value = Math.min(1, p.age.value + dt / 2.4)
      p.sprite.visible = p.age.value < 1
      p.sprite.position.y += dt * 0.18
      p.sprite.position.x += dt * 0.05 * p.drift
      keepOut(p.sprite.position, 0.05)
      p.sprite.scale.setScalar(0.05 + 0.16 * p.age.value)
    }
    for (const p of petal) {
      p.pos.y -= p.fall * dt
      p.pos.x += Math.sin(time + p.phase) * dt * 0.2
      p.turn.x += dt * 1.3
      p.turn.z += dt * 0.7
      if (p.pos.y < 0.02) p.pos.y = P.center[1] + P.size[1] / 2
      keepOut(p.pos, 0.05)
    }
    placePetals()
  }

  butterflies.forEach((b, i) => {
    if (awake.syrup) {
      b.lift = Math.min(1, b.lift + dt * 0.5)
      const a = b.phase + time * b.speed
      to.set(b.center[0] + Math.cos(a) * b.radius, b.center[1] + 0.75 + Math.sin(time * 0.65 + b.phase) * 0.35, b.center[2] + Math.sin(a) * b.radius * 0.7)
      b.body.position.lerp(to, b.lift * Math.min(1, dt * 3))
      b.body.rotation.y = -a
    }
    const resting = 0.8 + Math.sin(time * 0.8 + b.phase) * 0.16
    const beat = resting * (1 - b.lift) + (0.25 + Math.sin(time * 18 + b.phase) * 0.9) * b.lift
    b.body.updateMatrix()
    bodies.setMatrixAt(i, b.body.matrix)
    for (let side = 0; side < 2; side++) {
      wingPose.position.set(side ? -0.003 : 0.003, 0.004, 0)
      wingPose.rotation.z = side ? Math.PI - beat : beat
      wingPose.updateMatrix()
      wings.setMatrixAt(i * 2 + side, wingMatrix.multiplyMatrices(b.body.matrix, wingPose.matrix))
    }
  })
  wings.instanceMatrix.needsUpdate = bodies.instanceMatrix.needsUpdate = true
}
