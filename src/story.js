import * as THREE from 'three/webgpu'
import { scene, camera } from './scene.js'
import { things, gears, wake } from './garden.js'
import { model } from './models.js'
import { start } from './layout.js'
import { player, placePlayer } from './player.js'
import { setMusic, say } from './audio.js'
import { tween, wait } from './tweens.js'
import { startExplore } from './explore.js'
import { setFloatingLevel } from './floating.js'
import { playSong } from './song.js'
import { game } from './state.js'

const v = (...a) => new THREE.Vector3(...a)

// Starts the chapter. `from` (the ?start= parameter) skips ahead for testing: explore or song.
export async function begin(from) {
  if (from === 'song') {
    for (const g of gears) {
      g.found = true
      g.object.visible = false
      wake(g.layer)
    }
    game.gears = 3
    setFloatingLevel(3)
  }
  if (from === 'song') return finale()
  if (from !== 'explore') await opening()
  startExplore(finale)
}

async function finale() {
  await playSong()
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
