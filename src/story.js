import * as THREE from 'three/webgpu'
import { renderer, scene, camera, air, pink } from './scene.js'
import { things, gears, clocks, doors, wake } from './garden.js'
import { roses } from './foliage.js'
import { model } from './models.js'
import { start, song, page as pageStand } from './layout.js'
import contacts from '../docs/fries_hand_contacts.json'
import { player, placePlayer, act, walkTo, anim } from './player.js'
import { hold, holdCast, release, fly, palmAt } from './hands.js'
import { setMusic, say, burst } from './audio.js'
import { tween, wait } from './tweens.js'
import { startExplore } from './explore.js'
import { setFloatingLevel } from './floating.js'
import { playSong } from './song.js'
import { cast, stand } from './cast.js'
import { game } from './state.js'

const DEG = Math.PI / 180
const v = (...a) => new THREE.Vector3(...a)
const PINK_SKY = { horizon: new THREE.Color(1.1, 0.55, 0.62), zenith: new THREE.Color(0.85, 0.5, 0.72), glow: new THREE.Color(1.7, 0.75, 0.75) }
const EVENING = Object.fromEntries(Object.keys(PINK_SKY).map(k => [k, air[k].value.clone()]))

// 6:01: the sky and the whole picture turn pink, `t` from 0 to 1.
export function turnPink(t) {
  for (const k in PINK_SKY) air[k].value.lerpColors(EVENING[k], PINK_SKY[k], t)
  pink.value = t
}

// Starts the chapter. `from` (the ?start= parameter) skips ahead for testing: explore, song or ending.
export async function begin(from) {
  if (from === 'song' || from === 'ending') {
    for (const g of gears) {
      g.found = true
      g.object.visible = false
      wake(g.layer)
    }
    game.gears = 3
    setFloatingLevel(3)
  }
  if (from === 'ending') {
    placePlayer(song.fries.pos, song.fries.rot)
    return ending()
  }
  if (from === 'song') return finale()
  if (from !== 'explore') await opening()
  startExplore(finale)
}

async function finale() {
  const hatter = cast.hatter, watch = things.pocket_watch
  await walkTo([hatter.object.position.x + 0.8, 0, hatter.object.position.z + 0.7], 220)
  hatter.doing = 'mend'
  act('mend')
  holdCast(watch, hatter.object, 'RightHand', [0, 0.025, 0])
  await wait(Math.max(hatter.anim.actions.mend.getClip().duration, anim.actions.mend.getClip().duration))
  release(watch)
  hatter.doing = null
  await playSong()
  await wait(1.5)
  await ending()
}

// Cutscene camera: from one position and target to another over `seconds` (0 cuts).
function shot(pos0, look0, pos1 = pos0, look1 = look0, seconds = 0) {
  const look = new THREE.Vector3()
  return tween(seconds, t => {
    const k = t * t * (3 - 2 * t)
    camera.position.lerpVectors(pos0, pos1, k)
    camera.lookAt(look.lerpVectors(look0, look1, k))
  })
}

function cutscene() {
  player.control = false
  player.cinematic = true
  camera.fov = 55
  camera.near = 0.05
  camera.updateProjectionMatrix()
}

// Moves an object along an arc.
const arc = (object, to, height, seconds) => {
  const from = object.position.clone()
  return tween(seconds, t => {
    object.position.lerpVectors(from, to, t)
    object.position.y += Math.sin(t * Math.PI) * height
  })
}

async function opening() {
  cutscene()
  setMusic({ opening: 1 }, 0)
  const watch = things.pocket_watch, page = things.book_page, home = watch.position.clone()
  for (const g of gears) {
    g.object.visible = false
    g.object.position.copy(home)
  }

  // Shot 1: over Fries's right shoulder, up the long table at the hosts, pushing in slowly. "No room!"
  placePlayer(start.pos, start.rot)
  const facing = start.rot * DEG, feet = v(...start.pos)
  const ahead = v(Math.sin(facing), 0, Math.cos(facing)), right = v(-Math.cos(facing), 0, Math.sin(facing))
  const shoulder = back => feet.clone().addScaledVector(ahead, -back).addScaledVector(right, 0.42).setY(feet.y + 1.32)
  const hosts = things.hatter.position.clone().add(things.hare.position).multiplyScalar(0.5).setY(1.05)
  const glide = shot(shoulder(1.1), hosts, shoulder(0.6), hosts, 7)
  await wait(0.8)
  await say('OP-01')
  await say('OP-02')
  await glide
  await say('OP-03')

  // Shot 2: Fries reaches for the glowing page in the Hatter's watch; it snaps shut.
  placePlayer([-1.5, 0, -5.9], 143)
  await shot(v(-2.15, 1.5, -4.55), home)
  cast.hatter.doing = 'show_watch'
  holdCast(watch, things.hatter, 'RightHand', [0, 0.025, 0])
  act('reach')
  await tween(0.8, t => { player.mesh.rotation.x = 0.25 * t })
  await say('OP-04')
  page.visible = false
  cast.hatter.anim.play('show_watch', true, true)
  await say('OP-05')
  await tween(0.5, t => { player.mesh.rotation.x = 0.25 * (1 - t) })
  await say('OP-06')

  // Shot 3: the watch goes to the March Hare, gets buttered, and bursts; the gears scatter to their hiding places.
  await shot(v(-0.2, 1.9, -3.6), v(0.2, 0.9, -7.2))
  cast.hatter.doing = null
  release(watch)
  await Promise.all([say('OP-07'), arc(watch, v(0.45, 0.75, -7.3), 0.3, 0.8)])
  cast.hare.doing = 'butter'
  const butter = model('butter')
  butter.position.copy(watch.position).setY(watch.position.y + 0.04)
  scene.add(butter)
  holdCast(butter, things.hare, 'RightHand', [0, 0.03, 0])
  await say('OP-08')
  release(butter)
  butter.removeFromParent()
  cast.hare.doing = 'dunk_watch'
  holdCast(watch, things.hare, 'RightHand', [0, 0.025, 0])
  await wait(cast.hare.anim.actions.dunk_watch.getClip().duration)
  release(watch)
  for (const m of Object.values(cast)) m.doing = 'sit_scared'
  for (const g of gears) {
    g.object.position.copy(watch.position)
    g.object.visible = true
  }
  await Promise.all([say('OP-09'), ...gears.map(g => arc(g.object, g.pos, 2.5, 1.6))])
  await Promise.all([say('OP-10'), arc(watch, home, 0.3, 0.8)])
  for (const m of Object.values(cast)) m.doing = null

  player.mesh.rotation.x = 0
  placePlayer([-1.5, 0, -5.9], 200)
}

async function ending() {
  cutscene()
  document.getElementById('hud').textContent = ''
  const watch = things.pocket_watch, page = things.book_page, door = doors.tree.pivot

  // 6:01: the click, every clock moves on a minute, the sky and the whole picture turn pink.
  await shot(v(-2.8, 2.2, -1.8), v(0, 1.2, -8))
  burst(4, 1)
  for (const c of clocks) {
    c.minute.rotation.z = -6 * DEG
    c.hour.rotation.z = Math.PI - 0.5 * DEG
  }
  setMusic({ ending: 1 }, 0)
  act('cheer')
  tween(3, turnPink)
  await say('ED-01')

  // The March Hare grabs the Dormouse and stuffs him into the pink teapot.
  const teapot = things.pink_teapot.position
  await Promise.all([say('ED-02'), stand('hare', { pos: [0.6, 0, -8.4], rot: -60 }, 0.8)])
  cast.hatter.doing = 'stuff'
  cast.hare.doing = 'stuff'
  await Promise.all([say('ED-03'), stand('dormouse', { pos: [teapot.x, teapot.y + 0.12, teapot.z], rot: 90 }, 1.2, 0.5)])

  cast.hatter.doing = null
  cast.hare.doing = null

  // Fries reaches out and the page flies from the watch into his palm, arriving as his hand does; it stays in
  // his hand. The door at the mouth of the tunnel through the big tree's roots swings open.
  await walkTo(pageStand.stand, pageStand.rot)
  page.position.copy(watch.position)
  page.visible = true
  act('reach')
  await wait(contacts.reach.time - 1.5)
  await fly(page, end => palmAt('reach', end), 1.5, 0.4)
  hold(page, { clip: 'reach', grip: pageStand.grip })
  await Promise.all([say('ED-04'), tween(1.5, t => { door.rotation.y = 100 * DEG * t })])

  // Fries walks round the table to the door; the three ignore him completely.
  const walking = walk([[-2.6, 0, -5.6], [-3.6, 0, -8.2], [-5.96, 0, -9.75]], 1.3)
  await say('ED-05')
  await say('ED-06')
  await walking
  await say('ED-07')

  // He steps into the tunnel and sees the red roses beyond it; the picture freezes.
  roses.visible = true
  await shot(v(-6.6, 1.6, -8.7), v(-3, 1.3, -15))
  await Promise.all([say('ED-08'), walk([[-4.6, 0, -12.1]], 1)])
  await wait(0.4)
  renderer.setAnimationLoop(null)
}

// Scripted walk along [x, y, z] points at `speed` metres per second.
async function walk(points, speed) {
  for (const point of points) {
    const from = player.feet.clone(), to = v(...point)
    player.mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
    await tween(from.distanceTo(to) / speed, t => player.feet.lerpVectors(from, to, t))
  }
}
