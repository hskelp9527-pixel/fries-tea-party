import * as THREE from 'three/webgpu'
import { renderer, scene, camera, SKY, hemi } from './scene.js'
import { things, gears, clocks, drinks, wake } from './garden.js'
import { model } from './models.js'
import { start, song } from './layout.js'
import { player, placePlayer, act, take } from './player.js'
import { setMusic, say, burst } from './audio.js'
import { tween, wait } from './tweens.js'
import { startExplore } from './explore.js'
import { setFloatingLevel } from './floating.js'
import { playSong } from './song.js'
import { game } from './state.js'

const DEG = Math.PI / 180
const v = (...a) => new THREE.Vector3(...a)
const PINK = new THREE.Color(0xf6c4d4)

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

  // Shot 1: the camera glides along the long table to Fries. "No room!"
  placePlayer(start.pos, start.rot)
  const fries = v(...start.pos).setY(1.05)
  const glide = shot(v(0.9, 1.5, -8.2), fries, v(0, 1.35, 2.2), fries, 7)
  await wait(0.8)
  await say('OP-01')
  await say('OP-02')
  await glide
  await say('OP-03')

  // Shot 2: Fries reaches for the glowing page in the Hatter's watch; it snaps shut.
  placePlayer([-1.3, 0, -5.7], 143)
  await shot(v(-2.15, 1.5, -4.55), home)
  take(home)
  await tween(0.8, t => { player.mesh.rotation.x = 0.25 * t })
  await say('OP-04')
  page.visible = false
  await say('OP-05')
  await tween(0.5, t => { player.mesh.rotation.x = 0.25 * (1 - t) })
  await say('OP-06')

  // Shot 3: the watch goes to the March Hare, gets buttered, and bursts; the gears scatter to their hiding places.
  await shot(v(-0.2, 1.9, -3.6), v(0.2, 0.9, -7.2))
  await Promise.all([say('OP-07'), arc(watch, v(0.45, 0.75, -7.3), 0.3, 0.8)])
  const butter = model('butter')
  butter.position.copy(watch.position).setY(watch.position.y + 0.04)
  scene.add(butter)
  await say('OP-08')
  butter.removeFromParent()
  for (const g of gears) {
    g.object.position.copy(watch.position)
    g.object.visible = true
  }
  await Promise.all([say('OP-09'), ...gears.map(g => arc(g.object, g.pos, 2.5, 1.6))])
  await Promise.all([say('OP-10'), arc(watch, home, 0.3, 0.8)])

  player.mesh.rotation.x = 0
  placePlayer([-1.3, 0, -5.7], 200)
}

async function ending() {
  cutscene()
  document.getElementById('hud').textContent = ''
  const watch = things.pocket_watch, page = things.book_page, door = things.tree_door

  // 6:01: the click, every clock moves on a minute, the sky turns pink.
  await shot(v(-2.8, 2.2, -1.8), v(0, 1.2, -8))
  burst(4, 1)
  for (const c of clocks) {
    c.minute.rotation.z = -6 * DEG
    c.hour.rotation.z = Math.PI - 0.5 * DEG
  }
  setMusic({ ending: 1 }, 0)
  act('cheer')
  tween(3, t => {
    scene.background.lerpColors(SKY, PINK, t)
    scene.fog.color.lerpColors(SKY, PINK, t)
    hemi.color.lerpColors(new THREE.Color(0xfff4e6), PINK, t)
  })
  await say('ED-01')

  // The March Hare grabs the Dormouse and stuffs him into the pink teapot.
  const hare = things.hare, dormouse = things.dormouse, teapot = drinks.find(d => d.model === 'pink_teapot').object
  await Promise.all([say('ED-02'), arc(hare, v(0.95, 0, -7.7), 0.2, 0.8)])
  await Promise.all([say('ED-03'), arc(dormouse, teapot.position.clone().setY(teapot.position.y + 0.12), 0.5, 1.2)])

  // The page flies into Fries's hands and the door at the foot of the big tree opens.
  page.position.copy(watch.position)
  page.visible = true
  const hands = player.feet.clone().setY(0.8)
  take(hands)
  await arc(page, hands, 1, 1.5)
  page.visible = false
  await Promise.all([say('ED-04'), tween(1.5, t => { door.rotation.y = -100 * DEG * t })])

  // Fries walks to the door; the three ignore him completely.
  const walking = walk([[-2.2, -5.4], [-2.2, -9.2], [0, -9.9], [0, -10.4]], 1.3)
  await say('ED-05')
  await say('ED-06')
  await walking
  await say('ED-07')

  // He steps through and sees red roses; the picture freezes.
  things.roses.visible = true
  await shot(v(0, 1.35, -8.6), v(0, 1.05, -12.6))
  await Promise.all([say('ED-08'), walk([[0, -11.3]], 1)])
  await wait(0.4)
  renderer.setAnimationLoop(null)
}

// Scripted walk along [x, z] points at `speed` metres per second.
async function walk(points, speed) {
  for (const [x, z] of points) {
    const from = player.feet.clone(), to = v(x, 0, z)
    player.mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
    await tween(from.distanceTo(to) / speed, t => player.feet.lerpVectors(from, to, t))
  }
}
