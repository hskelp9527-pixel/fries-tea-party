import * as THREE from 'three/webgpu'
import { player, walkTo } from './player.js'
import { camera, lens } from './scene.js'
import { things } from './garden.js'
import { playSfx } from './audio.js'
import { game } from './state.js'
import { tr, localizeDOM, onLanguageChange } from './i18n.js'

// These are the same rules for every player and for input-driven regression runs.
// Diagnostics may observe the state; they never bypass a timer, collision or choice.
export const gearGames = {
  active: false, kind: null, elapsed: 0, round: 0, progress: 0, mistakes: 0,
  cursor: { x: 0.5, y: 0.5 }, target: null, handTarget: null, safeLane: 1,
  lane: 1, open: false, gate: -1, selected: -1, correctWatch: -1,
  listened: [], listenRemaining: 0, status: '', failed: false,
}
const overlay = document.createElement('section')
overlay.id = 'gear-game'
overlay.hidden = true
overlay.setAttribute('aria-labelledby', 'gear-game-title')
overlay.innerHTML = `<div class="gear-game-card">
  <p class="eyebrow" id="gear-game-place"></p>
  <h2 id="gear-game-title"></h2><p id="gear-game-instructions"></p>
  <canvas id="gear-game-canvas" width="720" height="350" aria-label="Interactive gear puzzle"></canvas>
  <div id="watch-choices" hidden></div>
  <div class="gear-game-readout"><span id="gear-game-status" role="status" aria-live="polite"></span><span id="gear-game-score"></span></div>
  <progress id="gear-game-progress" max="1" value="0"></progress>
  <div class="gear-game-actions"><button id="gear-game-retry" hidden>Try again</button><button id="gear-game-choose" hidden>Open this watch</button><button id="gear-game-leave">Leave for now</button></div>
  <p class="small-note">Arrow keys or mouse to choose · Space to act · Q to leave · Esc to pause</p>
</div>`
document.body.append(overlay)
const canvas = overlay.querySelector('canvas'), paint = canvas.getContext('2d')
const status = overlay.querySelector('#gear-game-status'), score = overlay.querySelector('#gear-game-score')
const meter = overlay.querySelector('progress'), watches = overlay.querySelector('#watch-choices')
const retry = overlay.querySelector('#gear-game-retry'), choose = overlay.querySelector('#gear-game-choose')
const keys = new Set()
const TREE_POINTS = [[0.27, 0.28], [0.67, 0.35], [0.43, 0.68], [0.76, 0.69], [0.30, 0.52], [0.56, 0.24], [0.62, 0.65], [0.36, 0.36], [0.55, 0.48]]
const SAFE_LANES = [1, 0, 2, 1, 2, 0, 1, 2, 0]
const WATCH_GOALS = [4, 1, 5]
let finish, held = false, charge = 0, strain = 0, tick = 0, lastTick = -1, nextListenTick = 0
let view, gear, treeCenter, entry, moving = false, movingPromise = Promise.resolve(), roundWatches = new Set()
let messageKey='',messageValues={}
const hand = new THREE.Vector3(), step = new THREE.Vector3()

function message(text,values={}) { messageKey=text;messageValues=values;gearGames.status=tr(text,values);status.textContent=gearGames.status }
function fail(text) {
  gearGames.mistakes++
  game.puzzleMistakes++
  playSfx('fail', { gain: 0.35 })
  message(text)
  if (gearGames.mistakes >= 3) {
    gearGames.failed = true
    held = false
    retry.hidden = false
    retry.focus()
    message('The garden can wait. Try again when you are ready.')
  }
}
function complete(success) {
  if (!gearGames.active) return
  gearGames.active = false
  game.miniGame = false
  gearGames.handTarget = null
  overlay.hidden = true
  held = false
  keys.clear()
  camera.position.copy(view.position)
  camera.quaternion.copy(view.rotation)
  camera.fov = view.fov
  camera.updateProjectionMatrix()
  player.view = view.playerView
  player.cinematic = view.cinematic
  lens.target = null
  if (success) {
    playSfx('success', { gain: 0.5 })
    game.puzzles[gear.layer] = { seconds: Math.round(gearGames.elapsed), mistakes: gearGames.mistakes }
  }
  const resolve = finish
  finish = null
  resolve?.(success)
}
function resetRound(all = false) {
  if (all) {
    gearGames.elapsed = 0; gearGames.round = 0; gearGames.progress = 0; gearGames.mistakes = 0
    gearGames.gate = -1; gearGames.lane = 1; gearGames.cursor.x = 0.5; gearGames.cursor.y = 0.5
  }
  gearGames.failed = false
  gearGames.selected = -1
  gearGames.listened = []
  gearGames.listenRemaining = 0
  gearGames.correctWatch = WATCH_GOALS[gearGames.round % WATCH_GOALS.length]
  roundWatches.clear()
  charge = strain = tick = 0
  lastTick = -1
  nextListenTick = 0
  retry.hidden = true
  choose.disabled = true
  watches.querySelectorAll('button').forEach(button => { button.classList.remove('selected', 'heard'); button.disabled = false })
  message(gearGames.kind === 'tree' ? 'Follow the faint ticking. Rest your hand where the wood feels warm.'
    : gearGames.kind === 'fountain' ? 'Choose a dry lane. Step only while the syrup curtain parts.'
    : 'Compare at least three watches. The one with two close ticks holds the piece.')
}

function listen(index) {
  if (!gearGames.active || gearGames.kind !== 'hall' || gearGames.failed || gearGames.listenRemaining > 0) return
  gearGames.selected = index
  gearGames.listenRemaining = 3.6
  nextListenTick = 0
  choose.disabled = true
  watches.querySelectorAll('button').forEach((button, i) => button.classList.toggle('selected', i === index))
  message('Listening to watch {number}…',{number:index+1})
}
function chooseWatch() {
  if (gearGames.failed || gearGames.listenRemaining > 0 || gearGames.listened.length < 3 || gearGames.selected < 0) return
  if (gearGames.selected !== gearGames.correctWatch) {
    fail('A hurried tick, but no gear. Listen to the pause between the pair.')
    if (!gearGames.failed) resetRound()
    return
  }
  gearGames.round++
  gearGames.progress = gearGames.round / 3
  playSfx('success', { pitch: 1.1, gain: 0.35 })
  if (gearGames.round >= 3) complete(true)
  else resetRound()
}
retry.addEventListener('click', () => resetRound(true))
choose.addEventListener('click', chooseWatch)
async function leave() {
  held = false; keys.clear()
  try { await movingPromise } catch {}
  complete(false)
}
overlay.querySelector('#gear-game-leave').addEventListener('click', leave)
for (let i = 0; i < 6; i++) {
  const button = document.createElement('button')
  button.textContent = tr('Listen {number}',{number:i+1})
  button.setAttribute('aria-label',tr('Listen to pocket watch {number}',{number:i+1}))
  button.addEventListener('click', () => listen(i))
  watches.append(button)
}
canvas.addEventListener('pointermove', event => {
  if (!gearGames.active || gearGames.kind !== 'tree') return
  const rect = canvas.getBoundingClientRect()
  gearGames.cursor.x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0.08, 0.92)
  gearGames.cursor.y = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0.12, 0.88)
})
canvas.addEventListener('pointerdown', event => { if (gearGames.active) { held = true; canvas.setPointerCapture(event.pointerId) } })
canvas.addEventListener('pointerup', () => { held = false })
canvas.addEventListener('pointercancel', () => { held = false })
addEventListener('blur', () => { keys.clear(); held = false })
addEventListener('keydown', event => {
  if (!gearGames.active || game.paused || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyQ', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(event.code)) return
  event.preventDefault()
  event.stopImmediatePropagation()
  keys.add(event.code)
  if (event.repeat) return
  if (event.code === 'KeyQ') { leave(); return }
  if (event.code === 'KeyR' && gearGames.failed) { resetRound(true); return }
  if (gearGames.failed) return
  if (gearGames.kind === 'fountain') {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') gearGames.lane = Math.max(0, gearGames.lane - 1)
    if (event.code === 'ArrowRight' || event.code === 'KeyD') gearGames.lane = Math.min(2, gearGames.lane + 1)
    if (event.code === 'Space') crossGate()
  } else if (gearGames.kind === 'hall') {
    if (event.code.startsWith('Digit')) listen(Number(event.code.slice(-1)) - 1)
    if (event.code === 'Space') chooseWatch()
  }
}, true)
addEventListener('keyup', event => { keys.delete(event.code) }, true)

async function crossGate() {
  if (moving) return
  const gate = Math.floor(gearGames.elapsed / 3.8)
  if (!gearGames.open || gearGames.lane !== gearGames.safeLane || gate === gearGames.gate) {
    fail('A splash! Wait for a clear gap before taking the next step.')
    return
  }
  gearGames.gate = gate
  gearGames.round++
  gearGames.progress = gearGames.round / SAFE_LANES.length
  playSfx('success', { pitch: 1.6, gain: 0.2 })
  moving = true
  step.set(entry.x + (gear.stand[0] - entry.x) * gearGames.progress, gear.stand[1], entry.z + (gearGames.lane - 1) * 0.055)
  movingPromise = walkTo(step.toArray(), 90)
  try { await movingPromise }
  catch (error) { console.error('The grotto step was interrupted', error); complete(false); return }
  finally { moving = false }
  if (!gearGames.active) return
  if (gearGames.round >= SAFE_LANES.length) complete(true)
  else message('Dry stone underfoot. Find the next quiet interval.')
}

export async function playGearGame(item) {
  if (gearGames.active) return false
  gear = item
  view = { position: camera.position.clone(), rotation: camera.quaternion.clone(), fov: camera.fov,
    playerView: player.view, cinematic: player.cinematic }
  gearGames.kind = item.in === 'big_tree' ? 'tree' : item.in === 'house' ? 'hall' : 'fountain'
  if (gearGames.kind === 'fountain') {
    entry = new THREE.Vector3(things.fountain.position.x - 1.05, 0, things.fountain.position.z)
    await walkTo(entry.toArray(), 90)
  }
  gearGames.active = true
  game.miniGame = true
  player.control = false
  player.cinematic = true
  if (gearGames.kind === 'tree') {
    player.view = 'first'
    treeCenter = item.pos.clone()
    camera.position.copy(player.feet).y += player.p.scale * 1.08
    camera.lookAt(item.pos)
    camera.fov = 54
    camera.updateProjectionMatrix()
  }
  document.exitPointerLock?.()
  overlay.hidden = false
  watches.hidden = choose.hidden = gearGames.kind !== 'hall'
  canvas.hidden = gearGames.kind === 'hall'
  refreshChallengeText()
  resetRound(true)
  return new Promise(resolve => { finish = resolve })
}
function refreshChallengeText(){
  localizeDOM(overlay)
  ;[...watches.children].forEach((button,i)=>{button.textContent=tr('Listen {number}',{number:i+1});button.setAttribute('aria-label',tr('Listen to pocket watch {number}',{number:i+1}))})
  if(messageKey)message(messageKey,messageValues)
  const copy = {
    tree: ['THE HOLLOW', 'A small piece, a giant hand', 'Use the mouse or arrow keys to feel through the hollow. Hold Space or the mouse where the ticking grows warm.'],
    fountain: ['THE GROTTO', 'Between the drops', 'A / D chooses your lane. Space takes one real step across the wet floor when the syrup parts.'],
    hall: ['THE MANTEL', 'A minute hidden in a tick', 'Listen to the watches with 1–6 or the buttons. Compare three before choosing the steady double tick.'],
  }[gearGames.kind]
  if(copy){overlay.querySelector('#gear-game-place').textContent=tr(copy[0]);overlay.querySelector('#gear-game-title').textContent=tr(copy[1]);overlay.querySelector('#gear-game-instructions').textContent=tr(copy[2])}
}
onLanguageChange(refreshChallengeText)
localizeDOM(overlay)

function drawTree() {
  const { cursor } = gearGames
  const point = TREE_POINTS[gearGames.round]
  gearGames.target = { x: point[0], y: point[1] }
  const proximity = Math.hypot(cursor.x - point[0], cursor.y - point[1])
  paint.fillStyle = '#211b25'; paint.fillRect(0, 0, 720, 350)
  paint.strokeStyle = '#795634'; paint.lineWidth = 9
  for (let ring = 0; ring < 12; ring++) {
    paint.beginPath(); paint.ellipse(360, 178, 90 + ring * 24, 42 + ring * 10, -0.12, 0, Math.PI * 2); paint.stroke()
  }
  const heat = THREE.MathUtils.clamp(1 - proximity * 2, 0, 1)
  paint.fillStyle = `rgba(237,200,137,${0.08 + heat * 0.25})`
  paint.beginPath(); paint.arc(point[0] * 720, point[1] * 350, 17 + charge * 5, 0, Math.PI * 2); paint.fill()
  paint.strokeStyle = heat > 0.8 ? '#f5db9c' : '#d8bb9e'; paint.lineWidth = 3
  paint.beginPath(); paint.arc(cursor.x * 720, cursor.y * 350, 15, 0, Math.PI * 2); paint.stroke()
  paint.beginPath(); paint.moveTo(cursor.x * 720, cursor.y * 350 + 15); paint.lineTo(cursor.x * 720 - 8, cursor.y * 350 + 44); paint.stroke()
  paint.strokeStyle = '#edc889'; paint.lineWidth = 4
  paint.beginPath(); paint.arc(cursor.x * 720, cursor.y * 350, 23, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge / 3.2); paint.stroke()
}
function drawFountain() {
  paint.fillStyle = '#151d29'; paint.fillRect(0, 0, 720, 350)
  for (let lane = 0; lane < 3; lane++) {
    const dry = gearGames.open && gearGames.safeLane === lane
    paint.fillStyle = dry ? '#91aa91' : '#aa743e'
    paint.fillRect(86 + lane * 192, 30, 164, 220)
    paint.fillStyle = dry ? '#d7e0cb' : '#e0a74e'
    for (let drop = 0; drop < 7; drop++) {
      const y = (gearGames.elapsed * 95 + drop * 36) % 205
      if (!dry) { paint.beginPath(); paint.ellipse(112 + lane * 192 + (drop % 4) * 31, y + 35, 5, 11, 0, 0, Math.PI * 2); paint.fill() }
    }
  }
  paint.fillStyle = '#f7df9c'; paint.beginPath(); paint.arc(168 + gearGames.lane * 192, 294, 17, 0, Math.PI * 2); paint.fill()
  paint.fillStyle = '#f9eed8'; paint.font = '16px "Microsoft YaHei", sans-serif'; paint.textAlign = 'center'
  paint.fillText(tr(gearGames.open ? 'A quiet gap — step now' : 'Listen. Let the syrup fall.'), 360, 338)
}

export function updateGearGames(dt) {
  if (!gearGames.active || game.paused) return
  if (!gearGames.failed) gearGames.elapsed += dt
  if (gearGames.kind === 'tree') {
    const speed = dt * 0.26
    gearGames.cursor.x = THREE.MathUtils.clamp(gearGames.cursor.x + ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * speed, 0.08, 0.92)
    gearGames.cursor.y = THREE.MathUtils.clamp(gearGames.cursor.y + ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)) * speed, 0.12, 0.88)
    drawTree()
    const distance = Math.hypot(gearGames.cursor.x - gearGames.target.x, gearGames.cursor.y - gearGames.target.y)
    gearGames.handTarget = hand.copy(treeCenter).add(step.set((gearGames.cursor.x - 0.5) * 0.8, (0.5 - gearGames.cursor.y) * 0.7, 0.55))
    if (!gearGames.failed) {
      tick -= dt
      if (distance < 0.3 && tick <= 0) { playSfx('clock_tick', { pitch: 0.65 + (1 - distance) * 0.4, gain: 0.18 + (1 - distance / 0.3) * 0.3 }); tick = 0.25 + distance * 1.8 }
      if (held || keys.has('Space')) {
        if (distance < 0.075) { charge += dt; strain = 0 }
        else { charge = Math.max(0, charge - dt); strain += dt }
        if (strain > 1.8) { strain = charge = 0; fail('Only rough bark there. Ease your hand towards the ticking.') }
      } else { strain = 0; charge = Math.max(0, charge - dt * 0.3) }
      if (charge >= 3.2) {
        charge = 0; gearGames.round++; playSfx('success', { gain: 0.22, pitch: 0.8 + gearGames.round * 0.04 })
        gearGames.progress = gearGames.round / TREE_POINTS.length
        if (gearGames.round >= TREE_POINTS.length) { complete(true); return }
        message('A tooth of brass. Feel along its edge to the next groove.')
      }
    }
  } else if (gearGames.kind === 'fountain') {
    const gate = Math.floor(gearGames.elapsed / 3.8), phase = gearGames.elapsed % 3.8
    gearGames.safeLane = SAFE_LANES[gearGames.round % SAFE_LANES.length]
    gearGames.open = !gearGames.failed && phase > 1 && phase < 1.75 && gate !== gearGames.gate
    if (gate !== lastTick) { lastTick = gate; playSfx('syrup_drop', { gain: 0.28, pitch: 1.25 }) }
    drawFountain()
  } else if (gearGames.listenRemaining > 0 && !gearGames.failed) {
    const listened = 3.6 - gearGames.listenRemaining
    const correct = gearGames.selected === gearGames.correctWatch
    const pattern = correct ? [0, 0.23, 1.2, 1.43, 2.4, 2.63] : gearGames.selected % 2 ? [0, 0.6, 1.2, 1.8, 2.4, 3] : [0, 0.4, 1.1, 1.8, 2.2, 3.15]
    if (nextListenTick < pattern.length && listened >= pattern[nextListenTick]) {
      playSfx('clock_tick', { pitch: 0.75 + gearGames.selected * 0.055, gain: 0.5 })
      const button = watches.children[gearGames.selected]
      button.classList.add('tick')
      setTimeout(() => button.classList.remove('tick'), 110)
      nextListenTick++
    }
    gearGames.listenRemaining = Math.max(0, gearGames.listenRemaining - dt)
    if (!gearGames.listenRemaining) {
      roundWatches.add(gearGames.selected)
      gearGames.listened = [...roundWatches]
      watches.children[gearGames.selected].classList.add('heard')
      choose.disabled = roundWatches.size < 3
      message(roundWatches.size < 3 ? 'Compared {count}/3 watches. Listen to another.' : 'Which pause sounded calm? Select its watch again, then open it.',{count:roundWatches.size})
    }
  }
  meter.value = gearGames.progress
  score.textContent = tr('{progress}% · {mistakes}/3 slips',{progress:Math.round(gearGames.progress*100),mistakes:gearGames.mistakes})
}
