import { renderer, camera, webgpu, pipeline } from './scene.js'
import { world } from './physics.js'
import { updateGarden } from './garden.js'
import { player, updatePlayer } from './player.js'
import { ctx } from './audio.js'
import { updateTweens } from './tweens.js'
import { begin } from './story.js'
import { updateExplore } from './explore.js'
import { updateFloating } from './floating.js'
import { updateSong } from './song.js'
import { updateCast } from './cast.js'

document.getElementById('backend').textContent = webgpu ? 'Renderer: WebGPU' : 'Renderer: WebGL 2 fallback'

camera.position.set(-6, 9, 12)
camera.lookAt(0, 0, -4)

const startScreen = document.getElementById('start')
startScreen.addEventListener('click', () => {
  startScreen.remove()
  ctx.resume()
  renderer.domElement.requestPointerLock()
  begin(new URLSearchParams(location.search).get('start'))
}, { once: true })
renderer.domElement.addEventListener('click', () => {
  if (player.control) renderer.domElement.requestPointerLock()
})

let last = 0, time = 0
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  time += dt
  updateTweens(dt)
  updatePlayer(dt)
  updateExplore(dt)
  updateGarden(dt, time)
  updateFloating(dt)
  updateSong()
  updateCast(dt)
  world.step()
  pipeline.render()
})
