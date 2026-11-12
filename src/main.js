import * as THREE from 'three/webgpu'
import { renderer, scene, camera, sun, bounce, webgpu, render, updateSun, updateLens, registerShadowCasters, prewarmScene, lens } from './scene.js'
import { world } from './physics.js'
import { updateGround } from './ground.js'
import { updateGarden, updateDressing } from './garden.js'
import './foliage.js'
import './locations.js'
import { updateMagic } from './magic.js'
import { updateLiquids, surface, stream, CUP_PROFILE, liquidCounts } from './liquids.js'
import { player, updatePlayer } from './player.js'
import { ctx } from './audio.js'
import { updateTweens } from './tweens.js'
import { begin } from './story.js'
import { updateExplore } from './explore.js'
import { updateFloating, prewarmFloating } from './floating.js'
import { updateSong, finishSong } from './song.js'
import { updateCast, cast } from './cast.js'
import { updateGaze } from './gaze.js'
import { updateLooks, banter } from './banter.js'
import { updateTasks } from './tasks.js'
import { updateHands } from './hands.js'
import { loading, ready } from './loading.js'
import { runScene } from './cutscene.js'
import { quality, setQuality, updateQuality, settleInitialQuality } from './quality.js'
import { game, savedGame, clearSave } from './state.js'
import * as P from './player.js'
import * as S from './state.js'
import * as G from './garden.js'
import * as L from './layout.js'
import * as C from './cast.js'
import * as A from './audio.js'
import * as T from './tasks.js'
import { lookPhase, LOOK, phaseColors } from './look.js'
import * as M from './models.js'
import * as K from './clip-catalog.js'
import * as PS from './prop-staging.js'
import { updateCharacterMotion } from './secondary-motion.js'
import { updateSessionUI } from './session-ui.js'
import { updateGearGames, gearGames } from './gear-games.js'
import { setInteractionHandTarget } from './hands.js'

const params = new URLSearchParams(location.search)
game.challenges=!params.has('nochallenges')
const frameAudit={maximum:0,spikes:[]}
if (params.has('diagnostics')) window.__tea = { P, S, G, L, C, A, T, M, K, PS, scene, camera, renderer, world,runScene, gearGames,finishSong,frameAudit,render,lens,look:{LOOK,phaseColors,sun,bounce},liquids:{surface,stream,counts:liquidCounts} }
const qualitySelect = document.getElementById('quality')
qualitySelect.value = quality.mode
qualitySelect.addEventListener('change', () => setQuality(qualitySelect.value))
qualitySelect.addEventListener('click', e => e.stopPropagation())
const perf = document.getElementById('perf')
perf.hidden = !params.has('perf')
addEventListener('keydown', event => {
  if (event.code === 'KeyP' && !event.repeat) perf.hidden = !perf.hidden
})
// Keep the scene, shadow and fullscreen draws in one frame's totals.
renderer.info.autoReset = false
// ?liquid owns its camera and animation loop instead of starting the story.
if (params.has('liquid')) {
  await import('./liquidLab.js')
} else {
// ?anims: buttons to try every character's clips by hand.
if (params.has('anims')) import('./anims.js')

camera.position.set(-6, 9, 12)
camera.lookAt(0, 0, -4)

loading('Warming the evening light...', 1, 1)
prewarmFloating()
const warmTea = surface(G.drinks[1].object, new THREE.Vector3(0,.012,0), .044,.065,{colour:new THREE.Color(0x5a86d8),fill:1,profile:CUP_PROFILE})
registerShadowCasters()
camera.updateMatrixWorld()
updateSun()
// Compile hidden story props too. Put visibility back before any frame is shown.
const hiddenObjects = []
const culledObjects=[]
scene.traverse(o => { if (!o.visible) { hiddenObjects.push(o); o.visible = true } if(o.isMesh&&o.frustumCulled){culledObjects.push(o);o.frustumCulled=false} })
try { await prewarmScene();updateLens(false);render() }
finally { for (const o of hiddenObjects) o.visible = false;for(const o of culledObjects)o.frustumCulled=true }
warmTea.remove()
updateGround();updateFloating(1);updateCast(0);updateHands(.001)
if(quality.mode==='auto'){
  const samples=[]
  for(let i=0;i<5;i++){
    updateSun();const before=performance.now();render();samples.push(performance.now()-before)
    if(webgpu)await renderer.backend.device.queue.onSubmittedWorkDone()
  }
  samples.sort((a,b)=>a-b);settleInitialQuality(samples[2]);render()
  if(webgpu)await renderer.backend.device.queue.onSubmittedWorkDone()
}
scene.traverse(object=>{if(object.isInstancedMesh&&object.parent===scene){object.updateMatrix();object.updateMatrixWorld(true);object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false}})
await A.prepareMusic('opening', 'frozen')
ready()
A.prepareSfx('footstep_grass', 'footstep_wood', 'footstep_stone', 'cup', 'glass', 'interaction', 'clock_tick', 'watch_tick', 'syrup_drop').catch(console.warn)
document.getElementById('backend').textContent = webgpu ? 'Renderer: WebGPU' : 'Renderer: WebGL 2 fallback'

// ?frame=<id> holds one of the visual review's frames (src/frames.js), with no start screen.
const startScreen = document.getElementById('start')
const continueButton = document.getElementById('continue')
continueButton.hidden = !savedGame()
let continuing = false
function capturePointer() {
  if (renderer.domElement.isConnected) renderer.domElement.requestPointerLock()?.catch(() => {})
}
continueButton.addEventListener('click', e => { e.stopPropagation(); continuing = true; startScreen.click() })
document.getElementById('replay').addEventListener('click', () => {
  clearSave()
  const url = new URL(location.href)
  url.searchParams.delete('start')
  location.href = url.href
})
if (params.has('frame')) {
  startScreen.remove()
  import('./frames.js').then(f => f.stageFrame(params.get('frame')))
} else {
  startScreen.addEventListener('click', e => {
    if (e.target.closest('select, label')) return
    startScreen.remove()
    ctx.resume()
    A.prepareMusic('awake').catch(console.warn)
    capturePointer()
    if (!continuing) clearSave()
    runScene(() => begin(continuing ? 'resume' : params.get('start')), { resume: false }).catch(error => console.error('Chapter failed', error))
  })
}
renderer.domElement.addEventListener('click', () => {
  if (player.control) capturePointer()
})

let last = performance.now(), time = 0, frameMs = 1000 / 60
let sampleTime = last, sampleFrames = 0, sampleCalls = 0, sampleTriangles = 0, sampleShadows = 0
const lensSubject = new THREE.Vector3(), candidate = new THREE.Vector3(), lensForward = new THREE.Vector3(), toSubject = new THREE.Vector3()
function focusCharacters() {
  // The drinking camera centres Fries; the song centres the hosts. Pick the closest to the optical axis,
  // using character centres rather than autofocus on a foreground cup or the distant sky.
  camera.getWorldDirection(lensForward)
  let best = Infinity
  for (const [object, height] of [[player.mesh, 0.88 * player.p.scale], ...Object.entries(cast).map(([name, c]) => [c.object, name === 'dormouse' ? 0.2 : 1.05])]) {
    candidate.copy(object.position).y += height
    toSubject.subVectors(candidate, camera.position)
    const depth = toSubject.dot(lensForward)
    if (depth <= camera.near) continue
    const score = toSubject.lengthSq() / (depth * depth) - 1
    if (score < best) { best = score; lensSubject.copy(candidate) }
  }
}
renderer.setAnimationLoop(now => {
  const elapsed = now - last
  if(params.has('diagnostics')&&!game.paused&&!['title','complete'].includes(game.phase)){
    frameAudit.maximum=Math.max(frameAudit.maximum,elapsed)
    if(elapsed>100)frameAudit.spikes.push({phase:game.phase,milliseconds:elapsed})
  }
  if (!params.has('frame') && !document.getElementById('start')) updateQuality(elapsed)
  const dt = Math.min(elapsed / 1000, 0.05)
  frameMs += (elapsed - frameMs) * (1 - Math.exp(-elapsed / 500))
  last = now
  updateSessionUI(dt)
  if (game.paused) { renderer.info.reset(); render(); return }
  time += dt
  if (game.phase !== 'title' && game.phase !== 'complete') game.elapsed += dt
  updateTweens(dt)
  updatePlayer(dt)
  updateExplore(dt)
  updateGearGames(dt)
  setInteractionHandTarget(player.mesh, 'right', gearGames.handTarget)
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
  updateCharacterMotion(dt)
  updateHands(dt)
  updateDressing(time)
  lookPhase.awake.value = game.gears / 3
  updateSun()
  if (player.cinematic) focusCharacters()
  updateLens(player.cinematic, lensSubject)
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
}
