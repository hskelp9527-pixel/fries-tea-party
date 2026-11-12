import * as THREE from 'three/webgpu'
import { renderer, scene, camera, air, pink, lens } from './scene.js'
import { things, gears, clocks, doors, wake } from './garden.js'
import { roses } from './foliage.js'
import { model } from './models.js'
import { start, song, repair, page as pageStand } from './layout.js'
import { centreProp } from './prop-staging.js'
import contacts from '../docs/fries_hand_contacts.json'
import { player, placePlayer, act, walkTo, anim } from './player.js'
import { hold, holdCast, release, fly, toHand } from './hands.js'
import { setMusic, say, burst, prepareMusic } from './audio.js'
import { tween, wait } from './tweens.js'
import { startExplore } from './explore.js'
import { setFloatingLevel } from './floating.js'
import { playSong } from './song.js'
import { cast, stand, standUp } from './cast.js'
import { setHandTarget, clearHandTarget } from './contact-ik.js'
import { contactWeight } from './clip-catalog.js'
import { onSceneCleanup } from './cutscene.js'
import { tr } from './i18n.js'
import { game, setPhase, savedGame } from './state.js'

const DEG = Math.PI / 180
const v = (...a) => new THREE.Vector3(...a)

// 6:01: the sky and the whole picture turn pink, `t` from 0 to 1.
export function turnPink(t) {
  pink.value = t
}

// Starts the chapter. `from` (the ?start= parameter) skips ahead for testing: explore, song or ending.
export async function begin(from) {
  if (from === 'resume') {
    const save = savedGame()
    if (save) {
      game.elapsed = save.elapsed ?? 0
      Object.assign(game.rhythm, save.rhythm)
      game.discovered = save.discovered ?? []
      game.puzzles = save.puzzles ?? {}
      game.puzzleMistakes = save.puzzleMistakes ?? 0
      for (const g of gears) if (save.found.includes(g.layer)) {
        g.found = true; g.object.visible = false; wake(g.layer)
      }
      game.found = gears.filter(g => g.found).map(g => g.layer)
      game.gears = game.found.length
      setFloatingLevel(game.gears)
      from = save.phase === 'explore' ? 'explore' : save.phase === 'ending' ? 'ending' : 'song'
    }
  }
  if (from === 'song' || from === 'ending') {
    for (const g of gears) {
      g.found = true
      g.object.visible = false
      wake(g.layer)
    }
    game.gears = 3
    game.found = gears.map(g => g.layer)
    setFloatingLevel(3)
  }
  if (from === 'ending') {
    placePlayer(song.fries.pos, song.fries.rot)
    return ending()
  }
  if (from === 'song') return finale()
  if (from !== 'explore') { setPhase('opening'); await opening() }
  else placePlayer(start.pos, start.rot) // where the opening leaves him; the default origin is under the table
  startExplore(finale)
}

async function finale() {
  setPhase('mending')
  const hatter = cast.hatter, watch = things.pocket_watch
  const watchHome=watch.position.clone()
  await walkTo([-2.5,0,-6.05],180)
  if(hatter.seated)await standUp('hatter')
  await stand('hatter',{pos:[-2.5,0,-6.85],rot:0},.8)
  await arc(watch,v(-2.5,1.02,-6.45),.12,.65)
  hatter.doing = 'mend'
  act('mend')
  const watchScale=watch.scale.clone(),watchRotation=watch.quaternion.clone()
  watch.scale.multiplyScalar(repair.scale);watch.rotation.set(-Math.PI/2,0,0)
  const work=new THREE.Vector3(...repair.centre);centreProp(watch,work)
  const restoreWatch=()=>{watch.scale.copy(watchScale);watch.quaternion.copy(watchRotation);watch.position.copy(watchHome)}
  onSceneCleanup(restoreWatch)
  for(const actor of [player.mesh,hatter.object])for(const side of ['left','right']){
    const [x,y,z]=repair.hands[actor===player.mesh?'fries':'hatter']
    setHandTarget(actor,side,'watch-repair',target=>target.copy(work).add(new THREE.Vector3((side==='left'?-1:1)*x,y,z)),()=>contactWeight('mend',anim.current?.time??0,18.54))
  }
  onSceneCleanup(()=>{clearHandTarget(player.mesh,'watch-repair');clearHandTarget(hatter.object,'watch-repair')})
  // Keep the work and both hands readable during the repair, rather than a distant view.
  player.cinematic = true
  await shot(v(...repair.camera),work)
  await wait(Math.max(hatter.anim.actions.mend.getClip().duration, anim.actions.mend.getClip().duration))
  release(watch)
  clearHandTarget(player.mesh,'watch-repair')
  clearHandTarget(hatter.object,'watch-repair')
  hatter.doing = null
  restoreWatch()
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
    lens.target = look // keep the focal plane on this shot's authored subject throughout the glide
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
  await prepareMusic('opening')
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
  await prepareMusic('ending')
  setPhase('ending')
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
  await Promise.all([say('ED-03'), stand('dormouse', { pos: [teapot.x, teapot.y + 0.12, teapot.z], rot: 90 }, 1.2, 0.5),wait(4.5)])

  cast.hatter.doing = null
  cast.hare.doing = null

  // Fries reaches out and the page flies from the watch into his palm, arriving as his hand does; it stays in
  // his hand. The door at the mouth of the tunnel through the big tree's roots swings open.
  await walkTo(pageStand.stand, pageStand.rot)
  page.position.copy(watch.position)
  page.visible = true
  act('reach')
  await wait(contacts.reach.time - 1.5)
  await toHand(page, { clip: 'reach', grip: pageStand.grip }, { seconds: 1.5, height: .4 })
  await Promise.all([say('ED-04'), tween(1.5, t => { door.rotation.y = 100 * DEG * t })])

  // Fries walks round the table to the door; the three ignore him completely.
  const walking = walk([[-2.6, 0, -5.6], [-5.38, 0, -10.09], [-7.74, 0, -11.64]], 1.3)
  await say('ED-05')
  await say('ED-06')
  await walking
  await say('ED-07')

  // He steps into the tunnel and sees the red roses beyond it; the picture freezes.
  roses.visible = true
  doors.tree.unplug()
  await shot(v(-8.38, 1.6, -10.59), v(-4.78, 1.3, -16.89))
  await Promise.all([say('ED-08'), walk([[-6.38, 0, -13.99]], 1)])
  await wait(0.4)
  setPhase('complete')
  document.exitPointerLock()
  const minutes = Math.floor(game.elapsed / 60), seconds = Math.floor(game.elapsed % 60)
  document.getElementById('result-time').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`
  document.getElementById('result-rhythm').textContent = tr('{hits}/{total} notes · best streak {best}',{hits:game.rhythm.hits,total:game.rhythm.total,best:game.rhythm.best})
  document.getElementById('results').hidden = false
  document.getElementById('replay').focus()
  renderer.setAnimationLoop(null)
}

// Scripted walk along [x, y, z] points at `speed` metres per second.
async function walk(points, speed) {
  for (const point of points) {
    const from = player.feet.clone(), to = v(...point)
    await walkTo(point, Math.atan2(to.x-from.x,to.z-from.z)/DEG)
  }
}
