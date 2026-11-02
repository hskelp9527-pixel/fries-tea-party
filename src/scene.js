import * as THREE from 'three/webgpu'

// WebGPURenderer falls back to its WebGL 2 backend on its own; ?webgl forces that path for testing.
export const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: new URLSearchParams(location.search).has('webgl') })
await renderer.init()
// The WebGL fallback gets fewer floating objects, petals and a smaller shadow map.
export const webgpu = renderer.backend.isWebGPUBackend === true

renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
document.body.prepend(renderer.domElement)

export const scene = new THREE.Scene()
export const SKY = new THREE.Color(0xc4d6e4)
scene.background = SKY.clone()
scene.fog = new THREE.Fog(SKY, 22, 58)

export const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200)
camera.rotation.order = 'YXZ'

export const hemi = new THREE.HemisphereLight(0xfff4e6, 0x58704a, 1.4)
export const sun = new THREE.DirectionalLight(0xfff0d6, 2.4)
sun.position.set(14, 22, 10)
sun.castShadow = true
sun.shadow.mapSize.setScalar(webgpu ? 2048 : 1024)
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 })
sun.shadow.bias = -0.0005
scene.add(hemi, sun)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
