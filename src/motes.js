import * as THREE from 'three/webgpu'
import { attribute, uv, vec3, float, sin, cos, time, smoothstep, fract, mix, dot, sqrt, max, normalWorld, positionWorld, positionGeometry, cameraPosition, uniform } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { scene, webgpu, SUN } from './scene.js'
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

// The small world's landmarks sit beside the crumb route, leaving the spoon bridge and gear reachable.
const mushroomSites = [
  [-0.57, -1.48, 0.11], [-0.68, -1.65, 0.075], [0.62, -2.35, 0.14], [0.75, -2.43, 0.09],
  [-0.53, -2.65, 0.13], [-0.67, -2.5, 0.08], [0.68, -3.7, 0.16], [-0.76, -4.4, 0.12],
  [0.74, -5.8, 0.14], [-0.71, -6.7, 0.1], [0.54, -0.45, 0.11], [0.72, -0.6, 0.07],
]
function tint(geometry, hex) {
  const colour = new THREE.Color(hex), data = new Float32Array(geometry.attributes.position.count * 3)
  for (let i = 0; i < geometry.attributes.position.count; i++) colour.toArray(data, i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(data, 3))
  return geometry
}
const mushroomParts = [
  tint(new THREE.CapsuleGeometry(0.11, 0.5, 3, 8).translate(0, 0.36, 0), 0xffedd0),
  tint(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.55, 0.32, 0.55).translate(0, 0.65, 0), 0xcf3e39),
  tint(new THREE.CircleGeometry(0.55, 16).rotateX(Math.PI / 2).translate(0, 0.65, 0), 0xf5d9b5),
]
const spotPose = new THREE.Object3D(), spotNormal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
for (let i = 0; i < 11; i++) {
  const phi = i * 2.399, theta = 0.18 + i / 11 * 1.25, s = Math.sin(theta), c = Math.cos(theta)
  spotPose.position.set(0.552 * s * Math.cos(phi), 0.65 + 0.323 * c, 0.552 * s * Math.sin(phi))
  spotNormal.set(s * Math.cos(phi) / 0.55, c / 0.32, s * Math.sin(phi) / 0.55).normalize()
  spotPose.quaternion.setFromUnitVectors(up, spotNormal)
  spotPose.scale.set(0.043 + i % 3 * 0.009, 0.009, 0.043 + i % 3 * 0.009)
  spotPose.updateMatrix()
  mushroomParts.push(tint(new THREE.SphereGeometry(1, 6, 4).applyMatrix4(spotPose.matrix), 0xfff5db))
}
const mushrooms = new THREE.InstancedMesh(mergeGeometries(mushroomParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, side: THREE.DoubleSide }), mushroomSites.length)
mushroomParts.forEach(part => part.dispose())
const smallPose = new THREE.Object3D()
mushroomSites.forEach(([x, z, height], i) => {
  smallPose.position.set(x, 0, z)
  smallPose.rotation.y = i * 2.399
  smallPose.scale.setScalar(height)
  smallPose.updateMatrix()
  mushrooms.setMatrixAt(i, smallPose.matrix)
})
mushrooms.receiveShadow = true
scene.add(mushrooms)

// Heart-shaped leaflets, three to a stem, one instanced draw for the clover patches.
const heart = new THREE.Shape().moveTo(0, 0)
  .bezierCurveTo(0.08, 0.06, 0.13, 0.18, 0.07, 0.2)
  .bezierCurveTo(0.04, 0.22, 0.01, 0.2, 0, 0.17)
  .bezierCurveTo(-0.01, 0.2, -0.04, 0.22, -0.07, 0.2)
  .bezierCurveTo(-0.13, 0.18, -0.08, 0.06, 0, 0)
const leaf = new THREE.ShapeGeometry(heart, 6), leafVertices = leaf.attributes.position
for (let i = 0; i < leafVertices.count; i++) leafVertices.setZ(i, Math.sin(leafVertices.getY(i) / 0.22 * Math.PI) * 0.025)
leaf.computeVertexNormals()
leaf.rotateX(-Math.PI / 2)
const cloverParts = [tint(new THREE.CylinderGeometry(0.008, 0.012, 0.28, 5).translate(0, 0.14, 0), 0x54873d)]
for (let i = 0; i < 3; i++) cloverParts.push(tint(leaf.clone().rotateY(i * Math.PI * 2 / 3).translate(0, 0.28, 0), [0x6caa4b, 0x83b85b, 0x599747][i]))
leaf.dispose()
const clover = new THREE.InstancedMesh(mergeGeometries(cloverParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), 96)
cloverParts.forEach(part => part.dispose())
for (let i = 0; i < clover.count; i++) {
  const [x, z] = mushroomSites[i % mushroomSites.length]
  smallPose.position.set(x + (rand() - 0.5) * 0.24, 0, z + (rand() - 0.5) * 0.32)
  smallPose.rotation.y = rand() * Math.PI * 2
  smallPose.scale.setScalar(0.23 + rand() * 0.17)
  smallPose.updateMatrix()
  clover.setMatrixAt(i, smallPose.matrix)
}
clover.receiveShadow = true
scene.add(clover)

// An air/water/air film, not a glass ball: wavelength-dependent Airy reflection on both membranes.
// A single double-sided pass keeps these little bubbles within the dressing draw budget.
const bubbleGeometry = new THREE.InstancedBufferGeometry().copy(new THREE.SphereGeometry(1, 16, 12))
const bubbleHomes = new Float32Array(18 * 4)
for (let i = 0; i < 18; i++) bubbleHomes.set([(rand() - 0.5) * 1.5, rand(), -0.8 - rand() * 6.2, 0.016 + rand() * 0.025], i * 4)
bubbleGeometry.setAttribute('bubbleHome', new THREE.InstancedBufferAttribute(bubbleHomes, 4))
bubbleGeometry.instanceCount = 18
const home = attribute('bubbleHome', 'vec4'), bubblePhase = home.y.mul(Math.PI * 2)
const age = fract(time.mul(0.022).add(home.y))
const bubblesMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true })
bubblesMaterial.positionNode = positionGeometry.mul(home.w).add(vec3(
  home.x.add(sin(time.mul(0.12).add(bubblePhase)).mul(0.055)),
  age.mul(0.48).add(0.06),
  home.z.add(cos(time.mul(0.1).add(bubblePhase)).mul(0.08)),
))
const AIR_IOR = 1.000277, wavelengthsNm = vec3(610, 545, 460), filmIndex = vec3(1.3302, 1.3323, 1.3365)
const view = cameraPosition.sub(positionWorld).normalize()
const incidence = dot(normalWorld, view).abs().clamp(0.002, 1)
const filmCosine = sqrt(vec3(1).sub(float(1).sub(incidence.pow(2)).div(filmIndex.div(AIR_IOR).pow(2))))
const thicknessNm = mix(620, 220, positionGeometry.y.mul(0.5).add(0.5)).add(sin(time.mul(0.13).add(bubblePhase)).mul(25))
const phaseCosine = cos(filmIndex.mul(filmCosine).mul(thicknessNm).mul(4 * Math.PI).div(wavelengthsNm))
const airCosine = incidence.mul(AIR_IOR), waterCosine = filmIndex.mul(filmCosine)
const rs = airCosine.sub(waterCosine).div(airCosine.add(waterCosine))
const rp = filmIndex.mul(incidence).sub(filmCosine.mul(AIR_IOR)).div(filmIndex.mul(incidence).add(filmCosine.mul(AIR_IOR)))
const airy = r => r.pow(2).mul(2).mul(vec3(1).sub(phaseCosine)).div(vec3(1).add(r.pow(4)).sub(r.pow(2).mul(phaseCosine).mul(2)))
const film = airy(rs).add(airy(rp)).mul(0.5), reflection = max(film.r, max(film.g, film.b))
const sunGlint = dot(normalWorld, view.add(uniform(SUN)).normalize()).abs().pow(96)
bubblesMaterial.colorNode = film.div(reflection.max(0.001)).mul(vec3(0.85, 0.92, 1))
  .add(vec3(1, 0.86, 0.56).mul(sunGlint).mul(1.5))
bubblesMaterial.opacityNode = reflection.mul(0.65).mul(sin(age.mul(Math.PI)))
const bubbles = new THREE.Mesh(bubbleGeometry, bubblesMaterial)
bubbles.frustumCulled = false
scene.add(bubbles)
