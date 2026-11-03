import * as THREE from 'three/webgpu'
import { player, placePlayer, setSize, reaches, nearProp, facePoint, act, walkTo, anim } from './player.js'
import { camera, lens } from './scene.js'
import { lookAt, headOf } from './gaze.js'
import speakers from './speakers.json'
import { cast, chairs, rest, standUp, walk, sitDown, moveChair, PULL } from './cast.js'
import { updateBanter, event, banter } from './banter.js'
import { stream, surface, CUP_PROFILE } from './liquids.js'
import { use, release, fly, toHand } from './hands.js'
import contacts from '../docs/fries_hand_contacts.json'
import { things, drinks, gears, doors, wake } from './garden.js'
import { world } from './physics.js'
import { setMusic, say, speaking, burst } from './audio.js'
import { tween, wait } from './tweens.js'
import { game } from './state.js'
import { teaService, hallNote, insideHall } from './tasks.js'
import { setFloatingLevel } from './floating.js'
import { underTable } from './layout.js'

const FIRST_HINT = 45 // seconds without finding a gear before the Dormouse sleep-talks a hint
const NEXT_HINT = 35

const prompt = document.getElementById('prompt')
const hud = document.getElementById('hud')
const head = (character, height) => character.localToWorld(new THREE.Vector3(0, height, 0))

// What E can do: { pos, label, can(), use() }. The nearest one Fries can use is offered.
const uses = drinks.map(d => ({ ...d, can: () => nearProp(d, d.pos), use: () => drink(d) }))
for (const gear of gears) uses.push({
  pos: gear.pos, label: 'Pick up the gear',
  can: () => !gear.found && nearProp(gear, gear.pos) && (gear.in !== 'house' || insideHall()), use: () => pickUp(gear),
})
uses.push(teaService, hallNote)
let target, toldAboutTea = false, drank = false

// Any empty armchair at the table, from either side: Fries walks to that side, the chair slides out, he steps in,
// sits down and the chair carries him in to the table. A two-shot finds him and the Hatter, the hosts tell him off in
// one of a few exchanges (a different one each time) and he answers back, and the chair slides out again and he gets
// up by himself.
const SEATED = [['ST-01', 'ST-02', 'ST-03'], ['ST-04', 'ST-05', 'ST-06'], ['ST-07', 'ST-08', 'ST-09'], ['ST-10', 'ST-11', 'ST-12']]
let sits = Math.floor(Math.random() * SEATED.length)
const otherSide = chair => chair.home.clone().multiplyScalar(2).sub(chair.front).setY(0)
const nearSide = chair => [chair.front, otherSide(chair)].reduce((a, b) => (a.distanceTo(player.feet) < b.distanceTo(player.feet) ? a : b))
const SITTING = rest('fries', 'sit_down', true, 1, true).lows[0]
for (const chair of chairs) {
  uses.push({
    pos: chair.seat, label: 'Sit down', use: () => sit(chair),
    can: () => !chair.by && player.size === 'normal' && Math.hypot(nearSide(chair).x - player.feet.x, nearSide(chair).z - player.feet.z) < 0.9,
  })
}
async function sit(chair) {
  player.control = false
  chair.by = 'fries'
  const side = nearSide(chair)
  await walkTo([side.x, 0, side.z], chair.rot / DEG)
  await moveChair(chair, PULL)
  await walkTo([chair.step.x, 0, chair.step.z], chair.rot / DEG)
  act('sit_down')
  const from = player.feet.clone(), to = chair.seat.clone().addScaledVector(chair.forward, -PULL).setY(chair.seat.y - SITTING)
  await tween(anim.actions.sit_down.getClip().duration, t => player.feet.lerpVectors(from, to, Math.min(1, t * 1.25)))
  anim.hold('sit_down')
  await moveChair(chair, 0, player.feet)
  banter.seated = true
  // A two-shot from the open side of Fries's chair, across the table at the Hatter.
  player.cinematic = true
  const fries = headOf('fries'), hatter = headOf('hatter'), middle = fries.clone().lerp(hatter, 0.5)
  const across = new THREE.Vector3(hatter.z - fries.z, 0, fries.x - hatter.x).normalize()
  if (across.dot(chair.forward) > 0) across.negate()
  camera.position.copy(middle).addScaledVector(across, Math.max(2.2, fries.distanceTo(hatter) * 0.75)).setY(middle.y + 0.35)
  camera.lookAt(middle)
  lens.target = middle
  lookAt('fries', hatter)
  for (const id of SEATED[sits++ % SEATED.length]) {
    if (speakers[id] !== 'fries') lookAt(speakers[id], fries)
    await say(id)
  }
  for (const name of ['fries', 'hatter', 'hare']) lookAt(name, null)
  await rise(chair, side)
}
async function rise(chair, side) {
  await moveChair(chair, PULL, player.feet)
  anim.hold('sit_down', false)
  act('stand_up')
  const from = player.feet.clone(), to = chair.step.clone().setY(0)
  await tween(anim.actions.stand_up.getClip().duration, t => player.feet.lerpVectors(from, to, Math.max(0, t * 1.6 - 0.6)))
  await walkTo([side.x, 0, side.z], chair.rot / DEG)
  await moveChair(chair, 0)
  chair.by = null
  banter.seated = false
  player.cinematic = false
  player.control = true
  event('standUp')
}

addEventListener('keydown', e => {
  if (e.code === 'KeyE' && !e.repeat && player.control && target) {
    const useTarget = target
    target = undefined
    useTarget.use()
  }
})

let exploring = false, onMended
// Hands control to the player. onMended runs once the three gears are back in the watch.
export function startExplore(mended) {
  onMended = mended
  exploring = true
  player.control = true
  player.cinematic = false
  document.getElementById('controls').textContent = 'WASD move  |  Shift run  |  Space jump  |  E interact  |  V change view  |  Blue tea: big tree  |  Pink tea: fountain grotto  |  Cake: normal size for the hall'
  setMusic({ frozen: 1 - game.gears / 3, awake: game.gears / 3 })
}

// Drinking a tea or eating a cake: it flies into his hand, goes to his mouth and back to its place, then he
// changes size. A teacup is first filled at the table (see pour).
async function drink(d) {
  drank = true
  player.control = false
  if (d.pot) await pour(d)
  else await eat(d)
  if (d.pot) {
    release(d.object)
    await fly(d.object, end => end.copy(d.home), 0.6, 0.08)
  }
  if (d.grow) await walkTo(d.grow, 90)
  setSize(d.becomes)
  if (d.becomes === 'small' && player.shrinks === 1) await firstShrink()
  else if (d.becomes === 'big' && player.grows === 1) await firstGrow()
  else {
    if (d.becomes !== 'normal') event(d.becomes === 'small' ? 'shrink' : 'grow')
    player.control = true
  }
}

// The cake stays on the ground while Fries bends over it and takes two bites.
async function eat(d) {
  await walkTo(d.stand, d.rot)
  act('pick_up')
  await wait(contacts.pick_up.time)
  anim.hold('pick_up')
  for (let bite = 0; bite < 2; bite++) {
    await tween(0.65, t => { player.nod = 0.22 * Math.sin(Math.PI * t) })
    player.nod = 0
    d.object.scale.multiplyScalar(0.8)
    await wait(0.2)
  }
  anim.hold('pick_up', false)
  await wait(contacts.pick_up.duration - contacts.pick_up.time)
}

// Fries takes up the empty cup and holds it out; the Hatter beckons from his chair and the teapot flies over from
// the tray, tilts and pours, the tea rising in the cup. Then, seen by a fixed camera from his front three-quarters,
// he lifts the cup to his mouth, drinks and lowers it.
const SPOUT = new THREE.Vector3(0.001, 0.198, 0.172), TILT = 0.8
async function pour(d) {
  const pot = things[d.pot], home = pot.position.clone(), homeTurn = pot.quaternion.clone()
  await walkTo(d.stand, d.rot)
  const yaw = d.rot * DEG, side = yaw + 1.1, f = player.feet
  player.cinematic = true
  camera.fov = 45
  camera.updateProjectionMatrix()
  camera.position.set(f.x + Math.sin(side) * 1.35, f.y + 1.12, f.z + Math.cos(side) * 1.35)
  camera.lookAt(f.x, f.y + 0.88, f.z)

  act('drink')
  await toHand(d.object, d)
  anim.hold('drink')
  const tea = surface(d.object, new THREE.Vector3(0, 0.012, 0), 0.044, 0.065, { colour: new THREE.Color(d.tea), fill: 0, profile: CUP_PROFILE })

  cast.hatter.doing = 'sit_beckon'
  const cup = d.object.getWorldPosition(new THREE.Vector3())
  const chest = player.mesh.getObjectByName('mixamorigSpine2').getWorldPosition(new THREE.Vector3())
  const elbow = player.mesh.getObjectByName('mixamorigLeftForeArm').getWorldPosition(new THREE.Vector3())
  const away = cup.clone().sub(chest.lerp(elbow, 0.5)).setY(0).normalize(), potYaw = Math.atan2(-away.x, -away.z)
  const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, potYaw, 0, 'YXZ'))
  const pouringTurn = new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, potYaw, 0, 'YXZ'))
  const tip = new THREE.Vector3(), above = cup.clone().setY(cup.y + 0.2)
  const over = above.clone().sub(tip.copy(SPOUT).applyQuaternion(pouringTurn))
  // Tilt outside the arms, then slide in with only the spout over the rim. The two GLBs' bodies clear the
  // posed arm/chest bone envelopes by over 0.10 m throughout this corridor (including the return).
  const stageSpout = above.clone().addScaledVector(away, 0.45).add(new THREE.Vector3(0, 0.25, 0))
  const parked = stageSpout.clone().sub(tip.copy(SPOUT).applyQuaternion(upright))
  await Promise.all([
    fly(pot, end => end.copy(parked), 1.3, 0.25),
    tween(1.3, t => pot.quaternion.slerpQuaternions(homeTurn, upright, t)),
  ])
  const tilt = t => {
    pot.rotation.set(TILT * t, potYaw, 0)
    pot.position.copy(stageSpout).sub(tip.copy(SPOUT).applyQuaternion(pot.quaternion))
  }
  await tween(0.5, tilt)
  const stage = pot.position.clone()
  await fly(pot, end => end.copy(over), 0.65, 0)
  const spout = pot.localToWorld(SPOUT.clone()), pouring = stream(spout, tea.disc.getWorldPosition(cup.clone()), { height: 0, radius: 0.0045, colour: new THREE.Color(d.tea) })
  await tween(2.2, t => { tea.set(t); tea.disc.getWorldPosition(pouring.to) })
  pouring.remove()
  cast.hatter.doing = null
  await fly(pot, end => end.copy(stage), 0.65, 0)
  await tween(0.5, t => tilt(1 - t))
  await Promise.all([
    fly(pot, end => end.copy(home), 1.2, 0.3),
    tween(1.2, t => pot.quaternion.slerpQuaternions(upright, homeTurn, t)),
  ])

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
  act('examine')
  await wait(anim.actions.examine.getClip().duration)
  release(gear.object)
  player.control = true
  await fly(gear.object, end => end.copy(watchPoint), 1.2, 0.6)
  gear.object.visible = false
}

// The first shrink: the Hatter comes over, his huge face filling the sky;
// then he returns to his chair and Fries lands on the upturned cup under the table.
async function firstShrink() {
  player.control = false
  const hatter = cast.hatter, chair = hatter.chair, p = player.feet
  await wait(0.6)
  act('surprised')
  await standUp('hatter')
  const from = hatter.object.position, away = new THREE.Vector3(from.x - p.x, 0, from.z - p.z).normalize()
  await walk('hatter', [[p.x + away.x * 0.55, p.z + away.z * 0.55]])
  hatter.object.rotation.y = Math.atan2(-away.x, -away.z)
  hatter.doing = 'lean_over'
  const look = tween(hatter.anim.actions.lean_over.getClip().duration, () => facePoint(head(hatter.object, 1.1), 0.15))
  await say('SZ-01')
  await say('SZ-02')
  await look
  hatter.doing = null
  await sitDown('hatter', chair)
  placePlayer(underTable.landing, 180)
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
  say(gear.hints[gear.hinted], cast.dormouse.object.position.distanceTo(player.feet))
  sinceGear = FIRST_HINT - NEXT_HINT
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
  document.getElementById('objective').textContent = ''
  onMended()
}

// Things Fries does that the hosts remark on: falling into the fountain's basin, stepping into the cottage's hall.
let inBasin = false, inHall = false
function happenings() {
  const f = player.feet, basin = things.fountain.position
  const basinNow = Math.hypot(f.x - basin.x, f.z - basin.z) < 1.3 && f.y > 0.25
  if (basinNow && !inBasin) event('fountain')
  inBasin = basinNow
  const hallNow = insideHall()
  if (hallNow && !inHall) event('cottage')
  inHall = hallNow
}

let quiet = 0
export function updateExplore(dt) {
  if (!exploring) return
  document.getElementById('objective').textContent = game.gears === 3
    ? (player.size === 'normal' ? "Bring the gears back to the Hatter's watch" : "Eat a cake to grow back, then return to the Hatter's watch")
    : player.size === 'small'
      ? (Math.hypot(player.feet.x - underTable.cup[0], player.feet.z - underTable.cup[1]) < 1
        ? 'Cross the spoon bridge to the "eat me" cake to grow back'
        : !gears[1].found ? "Slip into the fountain's grotto and find the gear" : 'Eat a cake to grow back')
    : player.size === 'big' ? (!gears[0].found ? "Reach into the hollow high in the big tree's trunk" : 'Eat a cake to grow back')
    : !gears[0].found ? 'Drink the blue tea to grow tall: something glints high in the big tree'
    : !gears[2].found ? "Only an ordinary-sized boy can open the March Hare's door: look on the hall's mantelpiece"
    : "Drink the pink tea to shrink and slip into the fountain's grotto"
  target = undefined
  prompt.textContent = ''
  if (banter.seated) updateBanter(dt)
  if (!player.control) return
  for (const u of uses) {
    if (u.can() && (!target || u.pos.distanceTo(player.feet) < target.pos.distanceTo(player.feet))) target = u
  }
  if (target) prompt.textContent = `E  ${target.label}`

  clock += dt
  tryDoors()
  happenings()

  quiet = speaking() ? 0 : quiet + dt
  sinceGear += dt
  if (target?.model?.endsWith('teacup') && !toldAboutTea) {
    toldAboutTea = true
    say('EX-10', cast.dormouse.object.position.distanceTo(player.feet))
  } else if (game.gears < 3 && sinceGear > FIRST_HINT && quiet > 3) hint()
  else updateBanter(dt)
}
