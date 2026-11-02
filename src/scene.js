import * as THREE from 'three/webgpu'
import { pass, uniform, vec4 } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'

// WebGPURenderer falls back to its WebGL 2 backend on its own; ?webgl forces that path for testing.
export const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: new URLSearchParams(location.search).has('webgl') })
await renderer.init()
// The WebGL fallback gets fewer floating objects, petals and grass, a smaller shadow map and no bloom.
export const webgpu = renderer.backend.isWebGPUBackend === true

renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
renderer.shadowMap.enabled = true
document.body.prepend(renderer.domElement)

export const scene = new THREE.Scene()
// Warm evening haze: the far garden, the cypresses and the backdrop cards fade into it.
export const SKY = new THREE.Color(0xefc4a2)
scene.fog = new THREE.Fog(SKY, 24, 120)

export const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200)
camera.rotation.order = 'YXZ'

// Six o'clock: a low warm sun about 15 degrees up in the west, behind the cottage, throwing long soft shadows
// across the table; cool light from the sky and warm light bounced off the ground.
export const hemi = new THREE.HemisphereLight(0xb0aee4, 0xd9a070, 1.6)
export const sun = new THREE.DirectionalLight(0xffb877, 3)
sun.position.set(-48, 13, 8)
sun.target.position.set(-2, 0, -3)
sun.castShadow = true
sun.shadow.mapSize.setScalar(webgpu ? 2048 : 1024)
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 10, far: 100 })
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 0.03
sun.shadow.radius = 3
sun.shadow.camera.layers.enable(1) // Fries's layer: he casts a shadow even when first person hides him
scene.add(hemi, sun, sun.target)

// The sky: peach at the horizon to soft lavender overhead, with the sun's disc low in the west.
const dome = new THREE.SphereGeometry(180, 32, 16)
const colours = [], horizon = new THREE.Color(0xf6c49a), rose = new THREE.Color(0xe9b4b6), top = new THREE.Color(0xa7a1d8), c = new THREE.Color()
for (let i = 0; i < dome.attributes.position.count; i++) {
  const up = Math.max(0, dome.attributes.position.getY(i) / 180)
  ;(up < 0.25 ? c.lerpColors(horizon, rose, up / 0.25) : c.lerpColors(rose, top, (up - 0.25) / 0.75)).toArray(colours, i * 3)
}
dome.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
export const sky = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(3), fog: false }))
sunDisc.position.copy(sun.position).sub(sun.target.position).setLength(170)
scene.add(sky, sunDisc)

// The picture: the scene, gentle bloom on lanterns, gears and the sun (WebGPU only), and a colour grade
// multiplied over everything, white until 6:01.
export const grade = uniform(new THREE.Color(1, 1, 1))
const picture = pass(scene, camera).getTextureNode('output')
export const pipeline = new THREE.RenderPipeline(renderer)
pipeline.outputNode = (webgpu ? picture.add(bloom(picture, 0.45, 0.4, 1)) : picture).mul(vec4(grade, 1))

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
