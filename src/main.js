import { renderer, camera, webgpu, render, updateSun } from './scene.js'
import { world } from './physics.js'
import { updateGround } from './ground.js'
import { updateGarden } from './garden.js'
import './foliage.js'
import { updateMagic } from './magic.js'
import { updateLiquids } from './liquids.js'
import { player, updatePlayer } from './player.js'
import { ctx } from './audio.js'
import { updateTweens } from './tweens.js'
import { begin } from './story.js'
import { updateExplore } from './explore.js'
import { updateFloating } from './floating.js'
import { updateSong } from './song.js'
import { updateCast } from './cast.js'
import { updateHands } from './hands.js'

const params = new URLSearchParams(location.search)
// ?anims: buttons to try every character's clips by hand.
if (params.has('anims')) import('./anims.js')

document.getElementById('backend').textContent = webgpu ? 'Renderer: WebGPU' : 'Renderer: WebGL 2 fallback'

camera.position.set(-6, 9, 12)
camera.lookAt(0, 0, -4)

// ?frame=<id> holds one of the visual review's frames (src/frames.js), with no start screen.
const startScreen = document.getElementById('start')
if (params.has('frame')) {
  startScreen.remove()
  import('./frames.js').then(f => f.stageFrame(params.get('frame')))
} else {
  startScreen.addEventListener('click', () => {
    startScreen.remove()
    ctx.resume()
    renderer.domElement.requestPointerLock()
    begin(params.get('start'))
  }, { once: true })
}
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
  updateMagic(dt, time)
  updateLiquids(dt)
  updateGround()
  updateFloating(dt)
  updateSong()
  updateCast(dt)
  world.step()
  updateHands()
  updateSun()
  render()
})
