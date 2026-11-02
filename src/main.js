import * as THREE from 'three/webgpu'
import { renderer, scene, camera, webgpu } from './scene.js'
import { world } from './physics.js'

document.getElementById('backend').textContent = webgpu ? 'Renderer: WebGPU' : 'Renderer: WebGL 2 fallback'

const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x7fa66a }))
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)
camera.position.set(0, 1.6, 6)

let last = 0
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  world.step()
  renderer.render(scene, camera)
})
