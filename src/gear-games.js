import * as THREE from 'three/webgpu'
import { player, walkTo } from './player.js'
import { camera, lens } from './scene.js'
import { playSfx, duckMusic } from './audio.js'
import { game } from './state.js'
import { tr, localizeDOM, onLanguageChange } from './i18n.js'

// These are the same rules for every player and for input-driven regression runs.
// Diagnostics may observe the state; they never bypass a timer, collision or choice.
export const gearGames = {
  active: false, kind: null, elapsed: 0, round: 0, progress: 0, mistakes: 0,
  cursor: { x: 0.5, y: 0.5 }, target: null, handTarget: null, safeLane: 1,
  lane: 1, open: false, warn: false, gate: -1, selected: -1, correctWatch: -1,
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
  <div class="gear-game-readout"><span id="gear-game-status" role="status" aria-live="polite"></span><span class="gear-game-tally"><span id="gear-game-pips" aria-hidden="true"></span><span id="gear-game-score"></span></span></div>
  <progress id="gear-game-progress" max="1" value="0"></progress>
  <div class="gear-game-actions"><button id="gear-game-retry" hidden>Try again</button><button id="gear-game-choose" hidden>Open this watch</button><button id="gear-game-leave">Leave for now</button></div>
  <p class="small-note">Arrow keys or mouse to choose · Space to act · Q to leave · Esc to pause</p>
</div>`
document.body.append(overlay)
const canvas = overlay.querySelector('canvas'), paint = canvas.getContext('2d')
const status = overlay.querySelector('#gear-game-status'), score = overlay.querySelector('#gear-game-score')
const pips = overlay.querySelector('#gear-game-pips'), meter = overlay.querySelector('progress'), watches = overlay.querySelector('#watch-choices')
const retry = overlay.querySelector('#gear-game-retry'), choose = overlay.querySelector('#gear-game-choose')
const keys = new Set()
const TREE_POINTS = [[0.27, 0.28], [0.67, 0.35], [0.43, 0.68], [0.76, 0.69]], TREE_HOLD = 1.6
const SAFE_LANES = [1, 0, 2, 1, 0], GATE_SECONDS = 2.6, GATE_OPENS = 1.1, GATE_OPEN_FOR = 0.75, GATE_WARNS = 0.5
// 0 far from the tooth, 1 on it, over the whole search area
const warmth = distance => THREE.MathUtils.clamp(1 - distance / 0.85, 0, 1)
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
  duckMusic(false)
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
    if (gearGames.kind === 'fountain') {
      moving = true
      movingPromise = walkTo(entry.toArray(), 90).finally(() => { moving = false })
    }
  }
  gearGames.failed = false
  gearGames.selected = -1
  gearGames.listened = []
  gearGames.listenRemaining = 0
  gearGames.correctWatch = Math.floor(Math.random() * 6)
  roundWatches.clear()
  charge = strain = tick = 0
  lastTick = -1
  nextListenTick = 0
  retry.hidden = true
  choose.disabled = true
  watches.querySelectorAll('button').forEach(button => { button.classList.remove('selected', 'heard'); button.disabled = false })
  message(gearGames.kind === 'tree' ? 'Follow the faint ticking. Rest your hand where the wood feels warm.'
    : gearGames.kind === 'fountain' ? 'Choose a dry lane. Step only while the syrup curtain parts.'
    : 'Listen to the watches. The one that ticks twice, then rests, holds the piece.')
}

// Tick times (s) of a listening round. The right watch: two ticks 0.22 s apart, a rest, always the same. Every wrong
// watch ticks singly (never closer than 0.5 s unless it is the evenly fast one): slow, fast, limping, speeding up,
// skipping beats, a plain steady beat.
const PAIRS = [0, 0.22, 1.2, 1.42, 2.4, 2.62]
const WRONG = [[0, 1.5, 3], [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3, 3.3], [0, 0.9, 1.4, 2.3, 2.8, 3.7], [0, 1.2, 2.2, 3, 3.6],
  [0, 0.7, 1.4, 2.8, 3.5], [0, 0.8, 1.6, 2.4, 3.2]]
function listen(index) {
  if (!gearGames.active || gearGames.kind !== 'hall' || gearGames.failed || gearGames.listenRemaining > 0) return
  gearGames.selected = index
  gearGames.listenRemaining = 3.6
  nextListenTick = 0
  choose.disabled = !roundWatches.has(index)
  watches.querySelectorAll('button').forEach((button, i) => button.classList.toggle('selected', i === index))
  message('Listening to watch {number}…',{number:index+1})
}
function chooseWatch() {
  if (gearGames.failed || !roundWatches.has(gearGames.selected)) return
  if (gearGames.selected !== gearGames.correctWatch) {
    fail('No gear in that one. Listen for two quick ticks, then a long rest.')
    if (!gearGames.failed) resetRound()
    return
  }
  gearGames.round++
  gearGames.progress = 1
  playSfx('success', { pitch: 1.1, gain: 0.35 })
  complete(true)
}
retry.addEventListener('click', () => resetRound(true))
choose.addEventListener('click', chooseWatch)
async function leave() {
  held = false; keys.clear()
  try { await movingPromise } catch {}
  complete(false)
}
overlay.querySelector('#gear-game-leave').addEventListener('click', leave)
// Each watch is a real button drawn as an individual pocket watch; the label stays as small text underneath.
const WATCHES = [[20, 120, '#d2a052', -3, 1], [250, 40, '#bd8a45', 2, 0.94], [95, 300, '#dcae62', -1, 1.04], [330, 200, '#b08040', 3, 0.97], [160, 70, '#d6a557', -2, 1.02], [60, 260, '#c3924c', 1, 0.93]]
function watchFace(i) {
  const [hour, minute, brass, tilt, size] = WATCHES[i]
  const marks = Array.from({ length: 12 }, (_, m) => `<line x1="50" y1="${m % 3 ? 33 : 31}" x2="50" y2="36" stroke="#6a4a2c" stroke-width="${m % 3 ? 1.2 : 2}" transform="rotate(${m * 30} 50 64)"/>`).join('')
  return `<svg viewBox="0 0 100 112" style="--tilt:${tilt}deg;--sc:${size}" aria-hidden="true"><defs><radialGradient id="wc${i}" cx="35%" cy="28%"><stop offset="0" stop-color="#fff0bd"/><stop offset=".45" stop-color="${brass}"/><stop offset="1" stop-color="#6e4824"/></radialGradient></defs>
    <circle cx="50" cy="11" r="8" fill="none" stroke="#8a5f2c" stroke-width="3.5"/><rect x="43" y="17" width="14" height="10" rx="2.5" fill="${brass}" stroke="#5e3d1d" stroke-width="1.5"/>
    <circle class="case" cx="50" cy="64" r="40" fill="url(#wc${i})" stroke="#4f321a" stroke-width="2.5"/><circle cx="50" cy="64" r="33.5" fill="#f8eed6" stroke="#8a6030" stroke-width="1.6"/>${marks}
    <line x1="50" y1="64" x2="50" y2="47" stroke="#33222e" stroke-width="3.4" stroke-linecap="round" transform="rotate(${hour} 50 64)"/><line x1="50" y1="64" x2="50" y2="39" stroke="#33222e" stroke-width="2.2" stroke-linecap="round" transform="rotate(${minute} 50 64)"/>
    <g class="sec"><line x1="50" y1="72" x2="50" y2="37" stroke="#a23937" stroke-width="1.2" stroke-linecap="round"/></g><circle cx="50" cy="64" r="3" fill="#a23937"/><circle class="sel" cx="50" cy="64" r="45" fill="none" stroke="#ffe9a6" stroke-width="3"/></svg>`
}
for (let i = 0; i < 6; i++) {
  const button = document.createElement('button')
  button.beats = 0
  button.innerHTML = watchFace(i) + '<span class="wl"></span>'
  button.querySelector('.wl').textContent = tr('Listen {number}',{number:i+1})
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
  const gate = Math.floor(gearGames.elapsed / GATE_SECONDS)
  if (!gearGames.open || gearGames.lane !== gearGames.safeLane || gate === gearGames.gate) {
    fail('A splash! Wait for a clear gap before taking the next step.')
    return
  }
  gearGames.gate = gate
  gearGames.round++
  gearGames.progress = gearGames.round / SAFE_LANES.length
  playSfx('success', { pitch: 1.6, gain: 0.2 })
  moving = true
  step.set(entry.x + (gear.stand[0] - entry.x) * gearGames.progress, gear.stand[1], entry.z + (gear.stand[2] - entry.z) * gearGames.progress + (gearGames.lane - 1) * 0.055)
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
  game.miniGame = true
  game.sceneSkipping = false
  if (item.in === 'house') duckMusic(true)
  entry = player.feet.clone()
  // The old entry point was 0.7 m from the gear; closer than 60% of that, start from the 60% point so there is a real crossing.
  if (gearGames.kind === 'fountain' && Math.hypot(entry.x - gear.stand[0], entry.z - gear.stand[2]) < 0.42) entry.set(gear.stand[0] - 0.42, gear.stand[1], gear.stand[2])
  gearGames.active = true
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
  ;[...watches.children].forEach((button,i)=>{button.querySelector('.wl').textContent=tr('Listen {number}',{number:i+1});button.setAttribute('aria-label',tr('Listen to pocket watch {number}',{number:i+1}))})
  if(messageKey)message(messageKey,messageValues)
  const copy = {
    tree: ['THE HOLLOW', 'A small piece, a giant hand', 'Use the mouse or arrow keys to feel through the hollow. The ticking quickens and your hand glows warmer as you near a tooth. Hold Space or the mouse there.'],
    fountain: ['THE GROTTO', 'Between the drops', 'A / D chooses your lane. The syrup thins on the safe lane just before it parts; press Space then to take one real step.'],
    hall: ['THE MANTEL', 'A minute hidden in a tick', 'Listen to the watches with 1–6 or the buttons; each tick also flashes the watch. Open the one that ticks twice, rests, and ticks twice again, always the same.'],
  }[gearGames.kind]
  if(copy){overlay.querySelector('#gear-game-place').textContent=tr(copy[0]);overlay.querySelector('#gear-game-title').textContent=tr(copy[1]);overlay.querySelector('#gear-game-instructions').textContent=tr(copy[2])}
}
onLanguageChange(refreshChallengeText)
localizeDOM(overlay)

// ---- Illustrated play areas (canvas 2D only; no gameplay state is written here) ----
function seeded(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
let clockLast = performance.now() / 1000, clockDt = 0.016
function clock() { const now = performance.now() / 1000; clockDt = Math.min(0.05, now - clockLast); clockLast = now; return now }

// Tree hollow: bark rings are drawn once, with a soft vignette, then lit by the hand each frame.
const BARK_CENTER = [372, 168]
const barkRadius = (k, a, ph) => k * (1 + 0.07 * Math.sin(a * 2 + ph[0] + k * 0.05) + 0.05 * Math.sin(a * 3 + ph[1]) + 0.035 * Math.sin(a * 5 + ph[2] + k * 0.03) + 0.02 * Math.sin(a * 9 + ph[3]))
const bark = (() => {
  const layer = document.createElement('canvas'), g = layer.getContext('2d'), rand = seeded(11)
  layer.width = 720; layer.height = 350
  const ph = [0, 1, 2, 3].map(() => rand() * 6.28), [cx, cy] = BARK_CENTER
  g.fillStyle = '#22161b'; g.fillRect(0, 0, 720, 350)
  const ring = (k, a) => [cx + Math.cos(a) * barkRadius(k, a, ph) * 1.75, cy + Math.sin(a) * barkRadius(k, a, ph) * 0.88]
  const trace = k => { g.beginPath(); for (let i = 0; i <= 72; i++) { const [x, y] = ring(k, i / 72 * 6.2832); i ? g.lineTo(x, y) : g.moveTo(x, y) } g.closePath() }
  for (let k = 17; k >= 1; k--) {
    const t = k / 17
    trace(k * 26); g.fillStyle = rgb(mix([48, 31, 36], [132, 86, 46], t ** 0.8)); g.fill()
    g.lineWidth = 4; g.strokeStyle = rgb([24, 13, 20], 0.85); g.stroke()
    g.save(); g.translate(-1.5, -1.5); g.lineWidth = 1.4; g.strokeStyle = rgb([240, 180, 105], 0.1 + 0.12 * t); g.stroke(); g.restore()
  }
  for (let n = 0; n < 190; n++) { // wood grain following the rings
    const k = 40 + rand() * 430, a0 = rand() * 6.28, len = 0.2 + rand() * 0.7, dark = rand() < 0.62
    g.beginPath(); for (let i = 0; i <= 8; i++) { const [x, y] = ring(k, a0 + len * i / 8); i ? g.lineTo(x + Math.sin(i + n) * 1.2, y) : g.moveTo(x, y) }
    g.lineWidth = 0.8 + rand() * 1.4; g.strokeStyle = dark ? rgb([22, 12, 20], 0.3) : rgb([255, 205, 130], 0.1); g.stroke()
  }
  for (let n = 0; n < 24; n++) { // splits in the bark
    const a = rand() * 6.28, k = 120 + rand() * 340, [x, y] = ring(k, a), [x2, y2] = ring(k + 28 + rand() * 40, a + (rand() - 0.5) * 0.18)
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (rand() - 0.5) * 8, (y + y2) / 2, x2, y2)
    g.lineWidth = 1.5 + rand() * 2; g.strokeStyle = rgb([16, 9, 16], 0.55); g.stroke()
  }
  const centre = g.createRadialGradient(cx, cy, 10, cx, cy, 220)
  centre.addColorStop(0, 'rgba(18,10,24,.55)'); centre.addColorStop(1, 'rgba(18,10,24,0)')
  g.fillStyle = centre; g.fillRect(0, 0, 720, 350)
  const vig = g.createRadialGradient(360, 175, 120, 360, 175, 430)
  vig.addColorStop(0, 'rgba(20,10,20,0)'); vig.addColorStop(0.6, 'rgba(20,10,24,.45)'); vig.addColorStop(1, 'rgba(12,6,16,.92)')
  g.fillStyle = vig; g.fillRect(0, 0, 720, 350)
  return layer
})()
const GLINTS = (() => { const r = seeded(5); return Array.from({ length: 70 }, () => ({ x: 40 + r() * 640, y: 30 + r() * 290, phase: r() * 6.28, size: 2 + r() * 3 })) })()
let seenRound = 0, foundAt = 0
function star(x, y, size, alpha, color = '255,236,170') {
  paint.strokeStyle = `rgba(${color},${alpha})`; paint.lineWidth = 1.4
  paint.beginPath(); paint.moveTo(x - size, y); paint.lineTo(x + size, y); paint.moveTo(x, y - size); paint.lineTo(x, y + size); paint.stroke()
  paint.lineWidth = 1; paint.beginPath(); paint.moveTo(x - size * 0.5, y - size * 0.5); paint.lineTo(x + size * 0.5, y + size * 0.5); paint.moveTo(x + size * 0.5, y - size * 0.5); paint.lineTo(x - size * 0.5, y + size * 0.5); paint.stroke()
}
function drawTooth(x, y, scale = 1) {
  paint.save(); paint.translate(x, y); paint.rotate(Math.atan2(BARK_CENTER[1] - y, BARK_CENTER[0] - x)); paint.scale(scale, scale)
  paint.fillStyle = '#7b5126'; paint.beginPath(); paint.arc(-34, 0, 26, -0.7, 0.7); paint.lineTo(-20, 0); paint.fill() // rim of the gear it belongs to
  const brass = paint.createLinearGradient(0, -14, 0, 14); brass.addColorStop(0, '#fbe6a0'); brass.addColorStop(0.5, '#d9a649'); brass.addColorStop(1, '#8c5a24')
  paint.beginPath(); paint.moveTo(-20, -15); paint.lineTo(6, -9); paint.quadraticCurveTo(12, 0, 6, 9); paint.lineTo(-20, 15); paint.closePath()
  paint.fillStyle = brass; paint.fill(); paint.lineWidth = 2; paint.strokeStyle = '#4b2e17'; paint.stroke()
  paint.beginPath(); paint.moveTo(-14, -9); paint.lineTo(4, -5); paint.lineWidth = 1.6; paint.strokeStyle = 'rgba(255,246,200,.8)'; paint.stroke()
  paint.restore()
}
function drawHand(x, y, heat, t) {
  const cold = [126, 104, 200], amber = [244, 168, 70], gold = [255, 232, 142]
  const tint = heat < 0.5 ? mix(cold, amber, heat * 2) : mix(amber, gold, (heat - 0.5) * 2)
  const pulse = 0.5 + 0.5 * Math.sin(t * (3 + heat * 13)), radius = 30 + heat * 64 + pulse * 6 * heat
  paint.save(); paint.globalCompositeOperation = 'lighter'
  const glow = paint.createRadialGradient(x, y, 3, x, y, radius)
  glow.addColorStop(0, rgb(tint, 0.3 + heat * 0.55)); glow.addColorStop(0.4, rgb(tint, 0.1 + heat * 0.25)); glow.addColorStop(1, rgb(tint, 0))
  paint.fillStyle = glow; paint.beginPath(); paint.arc(x, y, radius, 0, 6.2832); paint.fill(); paint.restore()
  paint.save(); paint.translate(x, y); paint.rotate(0.22)
  const skin = paint.createLinearGradient(-20, 0, 20, 0); skin.addColorStop(0, '#2c1d2b'); skin.addColorStop(1, '#4a3030')
  paint.lineWidth = 2.5; paint.strokeStyle = rgb(tint, 0.55 + heat * 0.4)
  for (const [dx, dy, r] of [[58, 78, 14], [32, 34, 15], [0, 0, 16]]) { // index finger in front, two curled fingers behind it
    paint.beginPath(); paint.arc(dx, dy, r, Math.PI, 0); paint.lineTo(dx + r * 1.5, 260); paint.lineTo(dx - r * 1.5, 260); paint.closePath()
    paint.fillStyle = dx ? '#2a1b28' : skin; paint.fill(); paint.stroke()
    paint.save(); paint.strokeStyle = rgb(tint, 0.3); paint.lineWidth = 1.6
    for (const creaseY of [dy + 44, dy + 84]) { paint.beginPath(); paint.arc(dx, creaseY, r, 0.3, 2.84); paint.stroke() }
    paint.restore()
  }
  paint.beginPath(); paint.ellipse(-34, 130, 13, 40, -0.55, 0, 6.2832); paint.fillStyle = '#2c1d2b'; paint.fill(); paint.stroke() // thumb
  const pad = paint.createRadialGradient(0, -2, 1, 0, -2, 16); pad.addColorStop(0, rgb(tint, 0.95)); pad.addColorStop(1, rgb(tint, 0.15))
  paint.fillStyle = pad; paint.beginPath(); paint.arc(0, -1, 14, Math.PI, 0); paint.fill()
  paint.restore()
}
function drawTree() {
  const { cursor } = gearGames, now = clock()
  const point = TREE_POINTS[gearGames.round]
  gearGames.target = { x: point[0], y: point[1] }
  const proximity = Math.hypot(cursor.x - point[0], cursor.y - point[1]), heat = warmth(proximity)
  if (gearGames.round !== seenRound) { if (gearGames.round > seenRound) foundAt = now; seenRound = gearGames.round }
  paint.drawImage(bark, 0, 0)
  const x = cursor.x * 720, y = cursor.y * 350
  for (let i = 0; i < gearGames.round; i++) { // teeth already found stay in the picture
    const tx = TREE_POINTS[i][0] * 720, ty = TREE_POINTS[i][1] * 350, age = now - foundAt
    drawTooth(tx, ty, i === gearGames.round - 1 ? Math.min(1, 0.4 + age * 2) : 1)
    if (i === gearGames.round - 1 && age < 1.4) { const fade = 1 - age / 1.4; star(tx, ty, 10 + age * 40, fade); star(tx, ty, 6 + age * 20, fade * 0.8, '255,255,255') }
  }
  paint.save(); paint.globalCompositeOperation = 'lighter'
  for (const glint of GLINTS) { // brass glints in the bark, only near the hand and only when it is warm
    const d = Math.hypot(glint.x - x, glint.y - y), near = 1 - d / 120
    if (heat > 0.2 && near > 0) star(glint.x, glint.y, glint.size * (1 + heat), near * heat * (0.45 + 0.55 * Math.sin(now * 5 + glint.phase) ** 2), '255,214,120')
  }
  paint.restore()
  drawHand(x, y, heat, now)
  if (charge > 0) {
    paint.strokeStyle = '#ffe9a6'; paint.lineWidth = 4; paint.lineCap = 'round'
    paint.beginPath(); paint.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge / TREE_HOLD); paint.stroke(); paint.lineCap = 'butt'
  }
}

// Fountain grotto: three stone lanes in one-point perspective running to a glowing gear.
const FAR_SCALE = 1 / 3.4, NEAR_Y = 306, FAR_Y = 110, STEP_T = 0.17
function lane3(lane, t) {
  const s = 1 / (1 + 2.4 * t)
  return { s, y: FAR_Y + (NEAR_Y - FAR_Y) * (s - FAR_SCALE) / (1 - FAR_SCALE), x: 360 + (lane - 1) * 198 * s, hw: 84 * s }
}
const fall = [{ part: 0, thin: 0 }, { part: 0, thin: 0 }, { part: 0, thin: 0 }]
let markT = 0.05, lastMistakes = 0, splashAt = -9
function drawFriesMarker(x, y, s, hop) {
  paint.save(); paint.translate(x, y - hop); paint.scale(s * 1.35, s * 1.35)
  paint.fillStyle = 'rgba(15,8,18,.45)'; paint.beginPath(); paint.ellipse(0, hop / s, 13, 4.5, 0, 0, 6.2832); paint.fill()
  paint.fillStyle = '#b53f3a'; paint.beginPath(); paint.ellipse(0, -15, 12, 15, 0, 0, 6.2832); paint.fill()
  paint.strokeStyle = '#ffd89b'; paint.lineWidth = 1.6; paint.stroke()
  paint.fillStyle = '#7e2828'; paint.beginPath(); paint.ellipse(0, -26, 8, 4, 0, 0, 6.2832); paint.fill() // hood
  paint.fillStyle = '#f1c9a0'; paint.beginPath(); paint.arc(0, -36, 8.5, 0, 6.2832); paint.fill()
  paint.fillStyle = '#2a1a1c'; paint.beginPath(); paint.arc(0, -37, 9, Math.PI * 1.02, Math.PI * 1.98); paint.lineTo(7, -36); paint.quadraticCurveTo(0, -41, -7, -36); paint.fill()
  paint.fillStyle = '#2a1a1c'; paint.fillRect(-4, -34, 1.6, 2.4); paint.fillRect(2.6, -34, 1.6, 2.4)
  paint.restore()
}
function drawCurtain(lane, g, now) {
  const state = fall[lane], safe = gearGames.safeLane === lane, phase = gearGames.elapsed % GATE_SECONDS
  const targetPart = !safe ? 0 : gearGames.open ? 0.78 : gearGames.warn ? 0.3 : 0
  const targetThin = safe && (gearGames.open || gearGames.warn) ? (gearGames.open ? 1 : Math.min(1, (phase - (GATE_OPENS - GATE_WARNS)) / GATE_WARNS + 0.3)) : 0
  const ease = Math.min(1, clockDt * 9)
  state.part += (targetPart - state.part) * ease; state.thin += (targetThin - state.thin) * ease
  const height = 150 * g.s, top = g.y - height, strands = 12, width = Math.max(2, 2 * g.hw / strands * 1.3) * (1 - 0.72 * state.thin)
  const body = paint.createLinearGradient(0, top, 0, g.y)
  body.addColorStop(0, 'rgba(176,96,24,0)'); body.addColorStop(0.3, 'rgba(204,118,28,.88)'); body.addColorStop(1, 'rgba(150,76,20,.95)')
  const core = paint.createLinearGradient(0, top, 0, g.y)
  core.addColorStop(0, 'rgba(255,224,150,0)'); core.addColorStop(0.35, 'rgba(255,224,150,.9)'); core.addColorStop(1, 'rgba(255,240,190,.9)')
  if (state.part > 0.2) { // light through the opened gap
    const gap = paint.createRadialGradient(g.x, g.y - height * 0.4, 2, g.x, g.y - height * 0.4, g.hw * 1.4)
    gap.addColorStop(0, `rgba(255,236,170,${0.55 * state.part})`); gap.addColorStop(1, 'rgba(255,236,170,0)')
    paint.fillStyle = gap; paint.fillRect(g.x - g.hw * 1.5, top, g.hw * 3, height)
  }
  for (let i = 0; i < strands; i++) {
    const u = (i + 0.5) / strands, p = u < 0.5 ? u * (1 - state.part) : 1 - (1 - u) * (1 - state.part)
    const x = g.x + (p - 0.5) * 2 * g.hw + Math.sin(now * 2 + i * 1.7) * 1.2 * g.s
    paint.globalAlpha = 1 - 0.55 * state.thin * (1 - Math.abs(u - 0.5) * 1.2)
    paint.beginPath(); paint.moveTo(x, top); paint.quadraticCurveTo(x + Math.sin(now * 3 + i) * 1.5 * g.s, (top + g.y) / 2, x, g.y)
    paint.strokeStyle = body; paint.lineWidth = width; paint.lineCap = 'butt'; paint.setLineDash([]); paint.stroke()
    paint.strokeStyle = core; paint.lineWidth = Math.max(1, width * 0.24); paint.lineCap = 'round'; paint.setLineDash([(7 + i % 3 * 6) * g.s, (18 + i % 4 * 9) * g.s]); paint.lineDashOffset = -(now * 110 * g.s + i * 11); paint.stroke()
  }
  paint.globalAlpha = 1; paint.lineCap = 'butt'; paint.setLineDash([])
  paint.fillStyle = 'rgba(214,126,32,.55)'; paint.beginPath(); paint.ellipse(g.x, g.y + 1, g.hw * (1 - state.part * 0.5), 4 * g.s, 0, 0, 6.2832); paint.fill() // syrup pooling at the foot
  paint.fillStyle = 'rgba(255,230,160,.5)'; paint.beginPath(); paint.ellipse(g.x - g.hw * 0.3, g.y, g.hw * 0.25, 1.5 * g.s, 0, 0, 6.2832); paint.fill()
}
function drawFountain() {
  const now = clock(), laneNow = gearGames.lane, round = Math.min(gearGames.round, SAFE_LANES.length)
  paint.clearRect(0, 0, 720, 350)
  const cave = paint.createLinearGradient(0, 0, 0, 350)
  cave.addColorStop(0, '#1a1223'); cave.addColorStop(0.45, '#3b2631'); cave.addColorStop(1, '#201722')
  paint.fillStyle = cave; paint.fillRect(0, 0, 720, 350)
  paint.fillStyle = '#120c19' // stalactites
  for (let i = 0; i < 9; i++) { const x = 20 + i * 86 + (i % 2) * 20, h = 26 + (i * 37 % 40); paint.beginPath(); paint.moveTo(x - 22, 0); paint.lineTo(x + 22, 0); paint.lineTo(x + (i % 3 - 1) * 4, h); paint.fill() }
  const glow = paint.createRadialGradient(360, FAR_Y - 16, 4, 360, FAR_Y - 16, 210)
  glow.addColorStop(0, 'rgba(255,214,120,.8)'); glow.addColorStop(0.35, 'rgba(240,160,70,.3)'); glow.addColorStop(1, 'rgba(240,160,70,0)')
  paint.fillStyle = glow; paint.fillRect(0, 0, 720, 350)
  for (let lane = 0; lane < 3; lane++) { // stone slabs
    const n = lane3(lane, 0), f = lane3(lane, 1), safe = gearGames.safeLane === lane
    const stone = paint.createLinearGradient(0, n.y, 0, f.y); stone.addColorStop(0, '#7a6460'); stone.addColorStop(1, '#4e4054')
    paint.beginPath(); paint.moveTo(n.x - n.hw, n.y); paint.lineTo(n.x + n.hw, n.y); paint.lineTo(f.x + f.hw, f.y); paint.lineTo(f.x - f.hw, f.y); paint.closePath()
    paint.fillStyle = stone; paint.fill()
    if (safe && (gearGames.open || gearGames.warn)) { paint.fillStyle = gearGames.open ? 'rgba(255,226,140,.34)' : 'rgba(255,214,130,.14)'; paint.fill() }
    paint.lineWidth = 1.5; paint.strokeStyle = 'rgba(22,12,24,.55)'
    for (let k = 1; k < 6; k++) { const a = lane3(lane, k / 6); paint.beginPath(); paint.moveTo(a.x - a.hw, a.y); paint.lineTo(a.x + a.hw, a.y); paint.stroke() }
    paint.lineWidth = 2; paint.strokeStyle = 'rgba(255,210,150,.25)'; paint.stroke(new Path2D(`M${n.x - n.hw} ${n.y}L${f.x - f.hw} ${f.y}`))
  }
  const gx = 360, gy = FAR_Y - 22 // the gear at the far end
  paint.save(); paint.translate(gx, gy); paint.rotate(now * 0.3)
  paint.beginPath(); for (let i = 0; i < 32; i++) { const a = i / 32 * 6.2832, r = i % 4 < 2 ? 31 : 24; i ? paint.lineTo(Math.cos(a) * r, Math.sin(a) * r) : paint.moveTo(Math.cos(a) * r, Math.sin(a) * r) } paint.closePath()
  const brass = paint.createRadialGradient(-8, -8, 3, 0, 0, 32); brass.addColorStop(0, '#fff0b8'); brass.addColorStop(0.6, '#e1ae52'); brass.addColorStop(1, '#8c5a24')
  paint.fillStyle = brass; paint.fill(); paint.lineWidth = 2; paint.strokeStyle = '#5b3a1a'; paint.stroke()
  paint.fillStyle = '#4a2f2a'; paint.beginPath(); paint.arc(0, 0, 8, 0, 6.2832); paint.fill()
  paint.restore()
  const target = 0.05 + round * STEP_T
  const hopping = Math.abs(target - markT) > 0.004
  markT += (target - markT) * Math.min(1, clockDt * 5)
  const order = [0, 1, 2].sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1))
  for (const lane of order) drawCurtain(lane, lane3(lane, markT + 0.1), now)
  if (gearGames.mistakes < lastMistakes) splashAt = -9
  if (gearGames.mistakes > lastMistakes) splashAt = now
  lastMistakes = gearGames.mistakes
  const mark = lane3(laneNow, markT)
  drawFriesMarker(mark.x, mark.y, mark.s, hopping ? Math.abs(Math.sin(now * 14)) * 7 : 0)
  const splash = now - splashAt
  if (splash < 0.7) {
    paint.fillStyle = `rgba(222,138,40,${1 - splash / 0.7})`
    for (let i = 0; i < 12; i++) { const a = -Math.PI * (0.1 + i / 12 * 0.8), v = 40 + (i * 53 % 50); paint.beginPath(); paint.arc(mark.x + Math.cos(a) * v * splash, mark.y - 24 + Math.sin(a) * v * splash + 120 * splash * splash, 3.2 * mark.s * 1.4, 0, 6.2832); paint.fill() }
    paint.fillStyle = `rgba(222,138,40,${0.5 * (1 - splash / 0.7)})`; paint.beginPath(); paint.ellipse(mark.x, mark.y - 14, 20 * mark.s * 1.4, 22 * mark.s * 1.4, 0, 0, 6.2832); paint.fill()
  }
  const vig = paint.createRadialGradient(360, 175, 150, 360, 175, 440)
  vig.addColorStop(0, 'rgba(14,8,20,0)'); vig.addColorStop(1, 'rgba(14,8,20,.7)'); paint.fillStyle = vig; paint.fillRect(0, 0, 720, 350)
  const text = tr(gearGames.open ? 'A quiet gap — step now' : 'Listen. Let the syrup fall.')
  paint.font = '16px "Microsoft YaHei", Georgia, serif'; paint.textAlign = 'center'
  const w = paint.measureText(text).width + 28
  paint.fillStyle = 'rgba(26,19,32,.72)'; paint.beginPath(); paint.roundRect(360 - w / 2, 324, w, 24, 12); paint.fill()
  paint.fillStyle = gearGames.open ? '#ffe9a6' : '#f9eed8'; paint.fillText(text, 360, 341)
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
      const heat = warmth(distance)
      if (tick <= 0) { playSfx('clock_tick', { pitch: 0.65 + heat * 0.5, gain: (0.08 + heat * 0.42) * 0.08 }); tick = 0.16 + (1 - heat) ** 2 * 1.4 }
      if (held || keys.has('Space')) {
        if (distance < 0.075) { charge += dt; strain = 0 }
        else { charge = Math.max(0, charge - dt); strain += dt }
        if (strain > 1.8) { strain = charge = 0; fail('Only rough bark there. Ease your hand towards the ticking.') }
      } else { strain = 0; charge = Math.max(0, charge - dt * 0.3) }
      if (charge >= TREE_HOLD) {
        charge = 0; gearGames.round++; playSfx('success', { gain: 0.22, pitch: 0.8 + gearGames.round * 0.04 })
        gearGames.progress = gearGames.round / TREE_POINTS.length
        if (gearGames.round >= TREE_POINTS.length) { complete(true); return }
        message('A tooth of brass. Feel along its edge to the next groove.')
      }
    }
  } else if (gearGames.kind === 'fountain') {
    const gate = Math.floor(gearGames.elapsed / GATE_SECONDS), phase = gearGames.elapsed % GATE_SECONDS
    gearGames.safeLane = SAFE_LANES[gearGames.round % SAFE_LANES.length]
    gearGames.open = !gearGames.failed && phase > GATE_OPENS && phase < GATE_OPENS + GATE_OPEN_FOR && gate !== gearGames.gate
    gearGames.warn = !gearGames.failed && phase > GATE_OPENS - GATE_WARNS && phase <= GATE_OPENS && gate !== gearGames.gate
    if (gate !== lastTick) { lastTick = gate; playSfx('syrup_drop', { gain: 0.28, pitch: 1.25 }) }
    drawFountain()
  } else if (gearGames.listenRemaining > 0 && !gearGames.failed) {
    const listened = 3.6 - gearGames.listenRemaining
    const correct = gearGames.selected === gearGames.correctWatch
    const pattern = correct ? PAIRS : WRONG[gearGames.selected]
    if (nextListenTick < pattern.length && listened >= pattern[nextListenTick]) {
      playSfx('watch_tick', { gain: 0.6 })
      const button = watches.children[gearGames.selected]
      button.classList.add('tick')
      button.style.setProperty('--sec', ++button.beats * 36 + 'deg')
      setTimeout(() => button.classList.remove('tick'), 110)
      nextListenTick++
    }
    gearGames.listenRemaining = Math.max(0, gearGames.listenRemaining - dt)
    if (!gearGames.listenRemaining) {
      roundWatches.add(gearGames.selected)
      gearGames.listened = [...roundWatches]
      watches.children[gearGames.selected].classList.add('heard')
      choose.disabled = false
      message('Heard watch {number}. Open it, or listen to another.',{number:gearGames.selected+1})
    }
  }
  const slots = gearGames.kind === 'tree' ? TREE_POINTS.length : gearGames.kind === 'fountain' ? SAFE_LANES.length : 0
  if (pips.children.length !== slots + 3) pips.innerHTML = '<i class="win"></i>'.repeat(slots) + '<i class="slip"></i>'.repeat(3)
  ;[...pips.children].forEach((pip, i) => pip.classList.toggle('on', i < slots ? i < gearGames.round : i - slots < gearGames.mistakes))
  meter.value = gearGames.progress
  score.textContent = tr('{progress}% · {mistakes}/3 slips',{progress:Math.round(gearGames.progress*100),mistakes:gearGames.mistakes})
}
