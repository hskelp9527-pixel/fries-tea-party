import * as THREE from 'three/webgpu'
import { player, setSize, reaches, facePoint } from './player.js'
import { things, drinks, gears, wake } from './garden.js'
import { zones } from './layout.js'
import { setMusic, say, speaking } from './audio.js'
import { tween, wait } from './tweens.js'
import { game } from './state.js'
import { setFloatingLevel, cupDodging } from './floating.js'

// Ambient lines, highest priority first. Each plays once, when the garden has been quiet for a while;
// `then` follows straight after. c describes what Fries is doing (see context() below).
const BARKS = [
  { id: 'SZ-05', when: c => c.size === 'small' && c.shrinks > 1 && c.near('table') },
  { id: 'SZ-06', when: c => c.size === 'small' && c.shrinks > 1 && c.near('dormouse') },
  { id: 'SZ-07', when: c => c.size === 'big' && c.grows > 1 && c.near('table') },
  { id: 'SZ-08', when: c => c.size === 'big' && c.grows > 1 && c.near('cottage') },
  { id: 'BK-10', when: c => c.size === 'small' && c.near('table') },
  { id: 'BK-11', when: c => c.size === 'small' && c.near('table') },
  { id: 'BK-12', when: c => c.size === 'big' && c.near('table') },
  { id: 'BK-13', when: c => c.size === 'big' && c.near('table') },
  { id: 'BK-04', when: c => c.near('hareChair') },
  { id: 'BK-03', when: c => c.cupDodging },
  { id: 'BK-02', when: c => c.near('tray') && c.still > 3 },
  { id: 'BK-06', when: c => c.near('tray') && !c.drank && c.still > 6 },
  { id: 'BK-05', when: c => c.circled, then: 'BK-09' },
  { id: 'BK-01', when: c => c.near('table'), then: 'BK-08' },
  { id: 'BK-07', when: c => c.near('table') && c.still > 8 && c.played('BK-01') },
]
const QUIET_BEFORE_BARK = 8 // seconds without a line
const FIRST_HINT = 45 // seconds without finding a gear before the Dormouse sleep-talks a hint
const NEXT_HINT = 35

const prompt = document.getElementById('prompt')
const hud = document.getElementById('hud')
const head = (character, height) => character.localToWorld(new THREE.Vector3(0, height, 0))

// What E can do: { pos, label, can(), use() }. The nearest one in reach is offered.
const uses = drinks.map(d => ({ ...d, can: () => player.size !== d.size, use: () => drink(d) }))
let target, toldAboutTea = false, drank = false

addEventListener('keydown', e => {
  if (e.code === 'KeyE' && target) target.use()
})

let exploring = false, onMended
// Hands control to the player. onMended runs once the three gears are back in the watch.
export function startExplore(mended) {
  onMended = mended
  exploring = true
  player.control = true
  player.cinematic = false
  setMusic({ frozen: 1 - game.gears / 3, awake: game.gears / 3 })
}

async function drink(d) {
  drank = true
  setSize(d.size)
  if (d.size === 'small' && player.shrinks === 1) await firstShrink()
  if (d.size === 'big' && player.grows === 1) await firstGrow()
}

// The first shrink: the Hatter's huge face presses down from the sky.
async function firstShrink() {
  player.control = false
  const hatter = things.hatter
  const seat = hatter.position.clone(), seatYaw = hatter.rotation.y
  const over = seat.clone().lerp(player.feet, 0.5)
  const turn = Math.atan2(player.feet.x - seat.x, player.feet.z - seat.z) - seatYaw
  const lean = t => {
    hatter.position.lerpVectors(seat, over, t)
    hatter.rotation.y = seatYaw + Math.atan2(Math.sin(turn), Math.cos(turn)) * t
    hatter.rotation.x = 0.9 * t
    facePoint(head(hatter, 1.3), 0.2)
  }
  await wait(1.2)
  await tween(1.6, t => lean(t * t * (3 - 2 * t)))
  await say('SZ-01')
  await say('SZ-02')
  await tween(1.2, t => lean(1 - t))
  player.control = true
}

// The first grow: the Hatter and the March Hare shout up from far below.
async function firstGrow() {
  player.control = false
  await wait(1.2)
  await tween(0.8, () => facePoint(head(things.hatter, 1.3), 0.15))
  await say('SZ-03')
  await tween(0.6, () => facePoint(head(things.hare, 1.2), 0.15))
  await say('SZ-04')
  player.control = true
}

function find(gear) {
  gear.found = true
  gear.object.visible = false
  game.gears++
  wake(gear.layer)
  setFloatingLevel(game.gears)
  setMusic({ frozen: 1 - game.gears / 3, awake: game.gears / 3 }, 3)
  hud.textContent = `Gears ${game.gears}/3`
  sinceGear = 0
  say(gear.line)
}

// The Dormouse's sleep-talk: after a while without progress, a hint for the nearest gear, clearer each time.
let sinceGear = 0
function hint() {
  const gear = gears.filter(g => !g.found).sort((a, b) => a.pos.distanceTo(player.feet) - b.pos.distanceTo(player.feet))[0]
  gear.hinted = Math.min((gear.hinted ?? -1) + 1, gear.hints.length - 1)
  say(gear.hints[gear.hinted])
  sinceGear = FIRST_HINT - NEXT_HINT
}

let quiet = 0, circling = 0, lastAngle = null
const played = new Set()
const near = name => Math.hypot(player.feet.x - zones[name].pos[0], player.feet.z - zones[name].pos[1]) < zones[name].r

// Circling the table: the angle Fries has swept round it while nearby.
function trackCircling() {
  const angle = Math.atan2(player.feet.z - zones.table.pos[1], player.feet.x - zones.table.pos[0])
  circling = near('table') && lastAngle !== null ? circling + Math.atan2(Math.sin(angle - lastAngle), Math.cos(angle - lastAngle)) : 0
  lastAngle = angle
}

function context() {
  return {
    size: player.size, shrinks: player.shrinks, grows: player.grows, still: player.still, drank, near,
    circled: Math.abs(circling) > Math.PI * 2, played: id => played.has(id), cupDodging: cupDodging(),
  }
}

function bark() {
  const c = context()
  const b = BARKS.find(b => !played.has(b.id) && b.when(c))
  if (!b) return
  played.add(b.id)
  say(b.id).then(finished => {
    if (finished && b.then) {
      played.add(b.then)
      say(b.then)
    }
  })
}

uses.push({
  pos: things.pocket_watch.position.clone().setY(things.pocket_watch.position.y + 0.06),
  label: 'Mend the watch',
  can: () => game.gears === 3,
  use: mend,
})

function mend() {
  exploring = false
  player.control = false
  prompt.textContent = ''
  hud.textContent = ''
  onMended()
}

export function updateExplore(dt) {
  if (!exploring) return
  target = undefined
  prompt.textContent = ''
  if (!player.control) return
  for (const u of uses) {
    if (u.can() && reaches(u.pos) && (!target || u.pos.distanceTo(player.feet) < target.pos.distanceTo(player.feet))) target = u
  }
  if (target) prompt.textContent = `E  ${target.label}`

  for (const g of gears) if (!g.found && reaches(g.pos)) find(g)

  trackCircling()
  quiet = speaking() ? 0 : quiet + dt
  sinceGear += dt
  if (target?.model?.endsWith('teapot') && !toldAboutTea) {
    toldAboutTea = true
    say('EX-10')
  } else if (game.gears < 3 && sinceGear > FIRST_HINT && quiet > 3) hint()
  else if (quiet > QUIET_BEFORE_BARK) bark()
}
