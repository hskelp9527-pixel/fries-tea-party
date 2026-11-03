import * as THREE from 'three/webgpu'
import { attribute, uv, vec3, sin, cos, time, smoothstep } from 'three/tsl'
import { scene, webgpu } from './scene.js'
import { keepOut } from './garden.js'
import { paths } from './layout.js'
import { random, level } from './fields.js'

// Two quiet populations, each a single billboard draw. Motion is analytic and stays around its seeded home.
const rand = random(71)
const segments = paths.flatMap(line => line.slice(1).map((to, i) => ({
  from: line[i], to, length: Math.hypot(to[0] - line[i][0], to[1] - line[i][1]),
})))
const pathLength = segments.reduce((sum, segment) => sum + segment.length, 0)
function pathHome() {
  let distance = rand() * pathLength
  const segment = segments.find(segment => (distance -= segment.length) <= 0)
  const k = 1 + distance / segment.length
  return new THREE.Vector3(
    segment.from[0] + (segment.to[0] - segment.from[0]) * k + (rand() - 0.5) * 1.8,
    0.25 + rand() * 1.25,
    segment.from[1] + (segment.to[1] - segment.from[1]) * k + (rand() - 0.5) * 1.8,
  )
}
function cloud(count, fireflies) {
  const geometry = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1))
  const homes = new Float32Array(count * 4), phases = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const home = i < count * 0.6
      ? new THREE.Vector3(-1.7 + (rand() - 0.5) * 8, 0.35 + rand() * 3.6, -6.6 + (rand() - 0.5) * 12)
      : pathHome()
    home.y += level(home.x, home.z)
    keepOut(home, 0.45)
    homes.set([...home, fireflies ? 0.065 + rand() * 0.025 : 0.018 + rand() * 0.025], i * 4)
    phases[i] = rand() * Math.PI * 2
  }
  geometry.setAttribute('moteHome', new THREE.InstancedBufferAttribute(homes, 4))
  geometry.setAttribute('motePhase', new THREE.InstancedBufferAttribute(phases, 1))
  geometry.instanceCount = count
  const home = attribute('moteHome', 'vec4'), phase = attribute('motePhase')
  const speed = fireflies ? 0.24 : 0.09, drift = fireflies ? 0.42 : 0.24
  const material = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  material.positionNode = home.xyz.add(vec3(
    sin(time.mul(speed).add(phase)).mul(drift),
    sin(time.mul(speed * 0.7).add(phase.mul(2))).mul(drift * 0.6),
    cos(time.mul(speed * 0.8).add(phase)).mul(drift),
  ))
  material.scaleNode = home.w
  const radius = uv().sub(0.5).length()
  const halo = smoothstep(0.5, 0, radius).pow(2)
  const core = smoothstep(fireflies ? 0.12 : 0.24, 0, radius)
  const breath = sin(time.mul(fireflies ? 0.85 : 0.32).add(phase)).mul(0.5).add(0.5)
  material.colorNode = vec3(1, fireflies ? 0.8 : 0.67, 0.25)
    .mul(core.mul(fireflies ? 4 : 1.5).add(halo.mul(0.22)))
    .mul(fireflies ? breath.pow(3) : breath.mul(0.45).add(0.4))
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
}
cloud(webgpu ? 220 : 132, false)
cloud(webgpu ? 24 : 16, true)
