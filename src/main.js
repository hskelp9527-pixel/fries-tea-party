import { renderer, scene, camera, webgpu } from './scene.js'
import { world } from './physics.js'
import './garden.js'

document.getElementById('backend').textContent = webgpu ? 'Renderer: WebGPU' : 'Renderer: WebGL 2 fallback'

camera.position.set(-6, 9, 12)
camera.lookAt(0, 0, -4)

let last = 0
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  world.step()
  renderer.render(scene, camera)
})
