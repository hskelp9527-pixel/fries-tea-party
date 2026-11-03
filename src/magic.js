import * as THREE from 'three/webgpu'
import { uv, vec2, vec3, float, smoothstep, sin, time, attribute, dot, pow, positionWorld, cameraPosition, uniform } from 'three/tsl'
import { scene, webgpu, SUN } from './scene.js'
import { things, keepOut, awake, cups } from './garden.js'
import { effects } from './layout.js'
import { random } from './fields.js'

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

// Butterflies: a body and two wings hinged on it, each wing two rounded lobes, beating fast in flight and slowly
// at rest.
const wingShape = new THREE.PlaneGeometry(0.05, 0.06).translate(0.025, 0, 0)
const wingMaterial = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.6, alphaTest: 0.5 })
const w = uv().sub(vec2(0, 0.5))
const lobes = smoothstep(0.5, 0.42, w.sub(vec2(0.42, 0.18)).mul(vec2(1, 1.4)).length()).max(smoothstep(0.36, 0.3, w.sub(vec2(0.32, -0.24)).length()))
wingMaterial.opacityNode = lobes
const ring = smoothstep(0.38, 0.3, w.sub(vec2(0.42, 0.18)).length())
wingMaterial.colorNode = attribute('color').mix(vec3(0.15, 0.08, 0.05), float(1).sub(ring).mul(0.65))
wingMaterial.emissiveNode = attribute('color').mul(backlit.mul(0.6))
const B = effects.butterflies, COLOURS = [0xffc23a, 0xff8ac0, 0x8ac8ff, 0xfff6ee]
const butterflies = Array.from({ length: B.count }, (_, i) => {
  const body = new THREE.Group(), colour = new THREE.Color(COLOURS[i % 4])
  const geometry = wingShape.clone()
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(Array(geometry.attributes.position.count).fill(colour.toArray()).flat(), 3))
  const left = new THREE.Mesh(geometry, wingMaterial), right = new THREE.Mesh(geometry, wingMaterial)
  right.scale.x = -1
  body.add(left, right, new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.03, 2, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })))
  const a = i / B.count * Math.PI * 2
  body.position.set(B.center[0] + Math.cos(a) * B.perch, B.center[1], B.center[2] + Math.sin(a) * B.perch)
  body.rotation.y = rand() * 6
  scene.add(body)
  return { body, left, right, phase: a, radius: 1 + rand() * (B.radius - 1), speed: 0.4 + rand() * 0.5, lift: 0 }
})

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

  for (const b of butterflies) {
    if (awake.syrup) {
      b.lift = Math.min(1, b.lift + dt * 0.5)
      const a = b.phase + time * b.speed
      to.set(B.center[0] + Math.cos(a) * b.radius, B.center[1] + 0.6 + Math.sin(time * 1.3 + b.phase) * 0.5, B.center[2] + Math.sin(a) * b.radius)
      b.body.position.lerp(to, b.lift * Math.min(1, dt * 3))
      b.body.rotation.y = -a
    }
    const beat = b.lift > 0 ? Math.sin(time * 22 + b.phase) * 1.1 : 0.35 + Math.sin(time * 1.5 + b.phase) * 0.35
    b.left.rotation.z = beat
    b.right.rotation.z = -beat
  }
}
