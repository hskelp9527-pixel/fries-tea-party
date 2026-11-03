import { renderer, camera, webgpu, render, updateSun } from './scene.js'
import { world } from './physics.js'
import { updateGround } from './ground.js'
import { updateGarden, updateDressing } from './garden.js'
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
import { updateCast, cast } from './cast.js'
import { updateGaze } from './gaze.js'
import { updateLooks, banter } from './banter.js'
import { updateTasks } from './tasks.js'
import { updateHands } from './hands.js'

const params = new URLSearchParams(location.search)
const perf = document.getElementById('perf')
perf.hidden = !params.has('perf')
addEventListener('keydown', event => {
  if (event.code === 'KeyP' && !event.repeat) perf.hidden = !perf.hidden
})
// Keep the scene, shadow and fullscreen draws in one frame's totals.
renderer.info.autoReset = false
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

let last = performance.now(), time = 0, frameMs = 1000 / 60
let sampleTime = last, sampleFrames = 0, sampleCalls = 0, sampleTriangles = 0, sampleShadows = 0
renderer.setAnimationLoop(now => {
  const elapsed = now - last
  const dt = Math.min(elapsed / 1000, 0.05)
  frameMs += (elapsed - frameMs) * (1 - Math.exp(-elapsed / 500))
  last = now
  time += dt
  updateTweens(dt)
  updatePlayer(dt)
  updateExplore(dt)
  updateTasks(dt, time)
  updateGarden(dt, time)
  updateMagic(dt, time)
  updateLiquids(dt)
  updateGround()
  updateFloating(dt)
  updateSong()
  updateCast(dt)
  updateLooks()
  updateGaze(dt, name => name === 'fries' ? banter.seated : cast[name].seated, name => name !== 'fries' && !cast[name].seated && !cast[name].doing && !cast[name].moving)
  world.step()
  updateHands()
  updateDressing(time)
  updateSun()
  renderer.info.reset()
  render()
  sampleFrames++
  sampleCalls += renderer.info.render.drawCalls
  sampleTriangles += renderer.info.render.triangles
  if (now - sampleTime >= 500) {
    const shadowRenders = renderer.info.shadowMapRenders
    perf.textContent = `FPS          ${(1000 / frameMs).toFixed(1)}\nFrame        ${frameMs.toFixed(1)} ms\nDraw calls   ${(sampleCalls / sampleFrames).toFixed(0)}\nTriangles    ${Math.round(sampleTriangles / sampleFrames).toLocaleString('en-US')}\nShadow maps  ${((shadowRenders - sampleShadows) * 1000 / (now - sampleTime)).toFixed(1)}/s`
    sampleTime = now
    sampleShadows = shadowRenders
    sampleFrames = sampleCalls = sampleTriangles = 0
  }
})
