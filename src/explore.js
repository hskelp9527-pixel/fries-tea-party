import * as THREE from 'three/webgpu'
import { player, setSize, reaches, nearProp, facePoint, act, walkTo, anim } from './player.js'
import { camera } from './scene.js'
import { cast } from './cast.js'
import { stream, surface } from './liquids.js'
import { use, release, fly, toHand } from './hands.js'
import contacts from '../docs/fries_hand_contacts.json'
import { things, drinks, gears, doors, wake } from './garden.js'
import { world } from './physics.js'
import { zones } from './layout.js'
import { setMusic, say, speaking, burst } from './audio.js'
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

// What E can do: { pos, label, can(), use() }. The nearest one Fries can use is offered.
const uses = drinks.map(d => ({ ...d, can: () => nearProp(d, d.pos), use: () => drink(d) }))
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

// Drinking a tea or eating a cake: it flies into his hand, goes to his mouth and back to its place, then he
// changes size. A teacup is first filled at the table (see pour).
async function drink(d) {
  drank = true
  player.control = false
  if (d.pot) await pour(d)
  else await use(d, d.object, () => {})
  release(d.object)
  await fly(d.object, end => end.copy(d.home), 0.6, 0.08)
  if (d.grow) await walkTo(d.grow, 90)
  setSize(d.becomes)
  if (d.becomes === 'small' && player.shrinks === 1) await firstShrink()
  else if (d.becomes === 'big' && player.grows === 1) await firstGrow()
  else player.control = true
}

// Fries takes up the empty cup and holds it out; the Hatter beckons from his chair and the teapot flies over from
// the tray, tilts and pours, the tea rising in the cup. Then, seen by a fixed camera from his front three-quarters,
// he lifts the cup to his mouth, drinks and lowers it.
const SPOUT = new THREE.Vector3(0, 0.2, 0.172), TILT = 0.8
async function pour(d) {
  const pot = things[d.pot], home = pot.position.clone(), turn = pot.rotation.y
  await walkTo(d.stand, d.rot)
  const yaw = d.rot * DEG, side = yaw + 0.7, f = player.feet
  player.cinematic = true
  camera.fov = 45
  camera.updateProjectionMatrix()
  camera.position.set(f.x + Math.sin(side) * 1.7, f.y + 1.05, f.z + Math.cos(side) * 1.7)
  camera.lookAt(f.x, f.y + 0.9, f.z)

  act('drink')
  await toHand(d.object, d)
  anim.hold('drink')
  const tea = surface(d.object, new THREE.Vector3(0, 0.025, 0), 0.032, 0.055, { colour: new THREE.Color(d.tea), fill: 0 })

  cast.hatter.doing = 'sit_beckon'
  const cup = d.object.getWorldPosition(new THREE.Vector3()), potYaw = yaw + Math.PI
  const tip = SPOUT.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), TILT).applyAxisAngle(THREE.Object3D.DEFAULT_UP, potYaw)
  const over = cup.clone().setY(cup.y + 0.2).sub(tip)
  pot.rotation.y = potYaw
  await fly(pot, end => end.copy(over), 1.3, 0.35)
  await tween(0.5, t => { pot.rotation.x = TILT * t })
  const spout = pot.localToWorld(SPOUT.clone()), pouring = stream(spout, cup.clone().setY(cup.y + 0.045), { height: 0.02, radius: 0.007, colour: new THREE.Color(d.tea) })
  await tween(2.2, t => tea.set(t))
  pouring.remove()
  cast.hatter.doing = null
  await tween(0.5, t => { pot.rotation.x = TILT * (1 - t) })
  fly(pot, end => end.copy(home), 1.2, 0.3).then(() => { pot.rotation.y = turn })

  anim.hold('drink', false)
  await wait(contacts.drink.time - 0.6)
  await tween(0.8, t => tea.set(1 - t))
  tea.remove()
  await wait(contacts.drink.duration - contacts.drink.time - 0.8)
  player.cinematic = false
}

// Picking up a gear: it is found the moment it is in his hand, stays there to the end of the clip, then flies
// to the watch.
const watchPoint = things.pocket_watch.position.clone().setY(things.pocket_watch.position.y + 0.03)
async function pickUp(gear) {
  player.control = false
  await use(gear, gear.object, () => find(gear))
  release(gear.object)
  player.control = true
  await fly(gear.object, end => end.copy(watchPoint), 1.2, 0.6)
  gear.object.visible = false
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
  act('surprised')
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
  act('surprised')
  await tween(0.8, () => facePoint(head(things.hatter, 1.3), 0.15))
  await say('SZ-03')
  await tween(0.6, () => facePoint(head(things.hare, 1.2), 0.15))
  await say('SZ-04')
  player.control = true
}

// Doors. The cottage door swings open into its warm hall when Fries comes to it at his normal size (the giant and
// the small Fries are blocked by size alone). The tree door rattles and stays locked until 6:01, and the Hatter
// tells Fries so.
const DEG = Math.PI / 180
let cottageOpen = false, rattled = -Infinity, clock = 0
function tryDoors() {
  const cottage = doors.cottage, tree = doors.tree
  if (!cottageOpen && player.size === 'normal' && cottage.front.distanceTo(player.feet) < 1.2) {
    cottageOpen = true
    for (const c of cottage.colliders) world.removeCollider(c, false)
    tween(1.2, t => { cottage.pivot.rotation.y = 95 * DEG * t * t * (3 - 2 * t) })
  }
  if (player.size !== 'small' && clock - rattled > 12 && tree.front.distanceTo(player.feet) < 1.1 * player.p.scale) {
    rattled = clock
    burst(3, 0.5)
    tween(0.7, t => { tree.pivot.rotation.y = Math.sin(t * 40) * (1 - t) * 1.5 * DEG })
    say('OP-05')
  }
}

function find(gear) {
  gear.found = true
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
  pos: watchPoint,
  label: 'Mend the watch',
  can: () => game.gears === 3 && reaches(watchPoint),
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
    if (u.can() && (!target || u.pos.distanceTo(player.feet) < target.pos.distanceTo(player.feet))) target = u
  }
  if (target) prompt.textContent = `E  ${target.label}`

  for (const g of gears) if (!g.found && nearProp(g, g.pos)) pickUp(g)
  clock += dt
  tryDoors()

  trackCircling()
  quiet = speaking() ? 0 : quiet + dt
  sinceGear += dt
  if (target?.model?.endsWith('teacup') && !toldAboutTea) {
    toldAboutTea = true
    say('EX-10')
  } else if (game.gears < 3 && sinceGear > FIRST_HINT && quiet > 3) hint()
  else if (quiet > QUIET_BEFORE_BARK) bark()
}
