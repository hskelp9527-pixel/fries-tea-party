import * as THREE from 'three/webgpu'
import { Animator, Blink } from './animation.js'
import { model } from './models.js'
import { things, placedAll, glints } from './garden.js'
import { currentLine } from './audio.js'
import speakers from './speakers.json'
import { cast as stage } from './layout.js'
import { tween } from './tweens.js'
import { game } from './state.js'
import { scene } from './scene.js'
import { holdCast, release } from './hands.js'
import { wait } from './tweens.js'

const DEG = Math.PI / 180

// Lines on which someone does more than talk: yells "No room!", points at Fries, or laughs (listeners too).
const BEATS = {
  'OP-01': { hatter: 'yell' },
  'OP-02': { hare: 'yell' },
  'OP-03': { hatter: 'laugh', hare: 'laugh' },
  'OP-04': { hatter: 'point' },
  'BK-02': { hare: 'laugh' },
  'BK-03': { hatter: 'point' },
  'BK-07': { hatter: 'laugh' },
  'BK-08': { hare: 'laugh' },
  'BK-10': { hatter: 'point' },
  'BK-12': { hatter: 'point' },
  'BK-13': { hare: 'laugh' },
  'SZ-05': { hare: 'laugh' },
  'SG-02': { hare: 'laugh' },
  'ED-02': { hare: 'laugh' },
}
const SITTING = { idle: 'sit_idle', talk: 'sit_talk', laugh: 'sit_laugh', yell: 'sit_yell', point: 'sit_point' }
const STANDING = { idle: 'idle', talk: 'talk', laugh: 'laugh', yell: 'talk', point: 'talk' }

// Where a clip's body rests, in the model's own frame, at `samples` evenly spaced times through the clip (or at
// its end): for sitting, the height of the buttocks (the lowest point just behind the hip joint); otherwise the
// lowest point of the body, which moves as it breathes and curls. `middle` is where the body is centred at the
// clip's start.
export function rest(name, clip, buttocks, samples = 1, end = false) {
  const object = model(name), anim = new Animator(object, name), action = anim.actions[clip]
  action.play()
  const v = new THREE.Vector3(), middle = new THREE.Vector3(), lows = []
  for (let k = 0; k < samples; k++) {
    action.time = end ? action.getClip().duration - 0.01 : action.getClip().duration * k / samples
    anim.mixer.update(0)
    object.updateMatrixWorld(true)
    const hips = object.getObjectByName('mixamorigHips').getWorldPosition(new THREE.Vector3())
    let low = Infinity, n = 0
    object.traverse(o => {
      if (!o.isSkinnedMesh) return
      for (let i = 0; i < o.geometry.attributes.position.count; i++) {
        o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld)
        if (buttocks && (Math.abs(v.x - hips.x) > 0.1 || v.z > hips.z || v.z < hips.z - 0.1 || v.y > hips.y)) continue
        low = Math.min(low, v.y)
        if (k === 0) middle.add(v)
        n++
      }
    })
    if (k === 0) middle.divideScalar(n)
    lows.push(low)
  }
  return { middle, lows }
}

// The Hatter, the March Hare and the Dormouse. The game moves their roots; this plays their clips and shifts each
// model's armature so the clip's body rests on its seat, plate, tabletop or lawn: the Dormouse, in every clip,
// touches his plate or the table at every moment, centred over it.
export const cast = Object.fromEntries(['hatter', 'hare', 'dormouse'].map(name => {
  const object = things[name], anim = new Animator(object, name)
  const member = { name, object, anim, blink: new Blink(object), armature: object.getObjectByName('Armature'), seated: 'seat' in stage[name], rests: {} }
  if (member.seated && anim.has('sit_idle')) member.rests.sitting = rest(name, 'sit_idle', true)
  if (name === 'dormouse') {
    for (const clip in anim.actions) member.rests[clip] = rest(name, clip, false, 12)
    const bubble = object.children.find(o => o.geometry?.type === 'SphereGeometry'), head = object.getObjectByName('mixamorigHead')
    head.attach(bubble)
    bubble.position.set(0, 0, 0.05).applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion())).add(head.getWorldPosition(new THREE.Vector3()))
    head.worldToLocal(bubble.position)
  }
  return [name, member]
}))

// The armchairs at the table: `object`, the point the hips settle over (`seat`, at the seat's height, with the chair
// at home), `front` (where a sitter comes to: beside the chair, in the aisle, since the chairs are pulled in under
// the table), `step` (between the pulled-out chair and the table, where a sitter backs onto the seat from), the way
// a sitter faces (`forward`, `rot`, radians, toward the table) and who sits in it (`by`). The hosts start in theirs.
export const PULL = 0.55
const CHAIR_TIME = 0.8
export const chairs = placedAll.armchair.map(object => {
  const forward = new THREE.Vector3(Math.sin(object.rotation.y), 0, Math.cos(object.rotation.y)), side = new THREE.Vector3(forward.z, 0, -forward.x)
  const seat = object.position.clone().addScaledVector(forward, 0.05).setY(0.48)
  const sparkle = glints[0].clone()
  sparkle.position.set(0, 0.8, 0)
  sparkle.scale.setScalar(0.18)
  sparkle.visible = false
  object.add(sparkle)
  return {
    object, seat, forward, front: object.position.clone().addScaledVector(side, 0.8), step: seat.clone().addScaledVector(forward, 0.55 - PULL).setY(0),
    rot: object.rotation.y, home: object.position.clone(), sparkle, by: null,
  }
})
for (const m of Object.values(cast)) if (m.seated) (m.chair = chairs.find(c => c.home.distanceTo(m.object.position) < 0.1)).by = m.name

const ONCE = new Set(['sit_down', 'stand_up', 'sit_scared', 'conduct', 'serve', 'show_watch', 'lean_over', 'mend', 'butter', 'dunk_watch', 'lay_spoon', 'stuff'])

// Magic: the chair slides by itself to `distance` metres back from its home, sparkling, carrying `rider` (a
// position: a sitter's feet) along with it.
export async function moveChair(chair, distance, rider) {
  const from = chair.object.position.clone(), to = chair.home.clone().addScaledVector(chair.forward, -distance)
  const start = rider?.clone()
  chair.sparkle.visible = true
  await tween(CHAIR_TIME, t => {
    chair.object.position.lerpVectors(from, to, t * t * (3 - 2 * t))
    if (rider) rider.copy(start).add(chair.object.position).sub(from)
  })
  chair.sparkle.visible = false
}

// A few steps straight to a point, beside or in front of a chair, where `walk` would route round the table.
async function step(m, [x, z]) {
  const from = m.object.position.clone(), to = new THREE.Vector3(x, from.y, z)
  m.moving = true
  m.object.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
  await tween(from.distanceTo(to) / 0.9, t => m.object.position.lerpVectors(from, to, t))
  m.moving = false
}

// Walks a character along [x, z] points at walking speed, facing where it goes.
export async function walk(name, points) {
  const m = cast[name]
  m.moving = true
  for (const [x, z] of points) {
    const start = m.object.position
    if (start.y < 0.1 && Math.abs(start.x) > 1.1 && Math.abs(x) > 1.1 && start.z > -8.8 && start.z < 1.8 && z > -8.8 && z < 1.8) {
      const a = Math.sign(start.x) * 2.5, b = Math.sign(x) * 2.5
      const route = [[a, start.z]]
      if (a !== b) {
        const end = start.z + z < -7 ? -8.8 : 1.8
        route.push([a, end], [b, end])
      }
      route.push([b, z])
      for (const [rx, rz] of route) {
        const from = m.object.position.clone(), to = new THREE.Vector3(rx, from.y, rz)
        if (from.distanceTo(to) < 0.01) continue
        m.object.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
        await tween(from.distanceTo(to) / 0.9, t => m.object.position.lerpVectors(from, to, t))
      }
    }
    const from = m.object.position.clone(), to = new THREE.Vector3(x, from.y, z)
    m.object.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
    await tween(from.distanceTo(to) / 0.9, t => m.object.position.lerpVectors(from, to, t))
  }
  m.moving = false
}

// Sits a character down: to the chair's side, the chair slides out by magic, a step in between it and the table,
// sit_down backing onto the seat, and the chair glides back in to the table with the sitter.
export async function sitDown(name, chair) {
  const m = cast[name]
  chair.by = name
  await walk(name, [[chair.front.x, chair.front.z]])
  await moveChair(chair, PULL)
  await step(m, [chair.step.x, chair.step.z])
  m.object.rotation.y = chair.rot
  m.chair = chair
  m.doing = 'sit_down'
  const from = m.object.position.clone(), to = chair.seat.clone().addScaledVector(chair.forward, -PULL).setY(from.y)
  await tween(m.anim.actions.sit_down.getClip().duration, t => m.object.position.lerpVectors(from, to, Math.min(1, t * 1.6)))
  m.seated = true
  m.doing = null
  await moveChair(chair, 0, m.object.position)
}

// Gets a character up the same way in reverse: the chair slides out with them, stand_up stepping forward off the
// seat, a step to the chair's side, and the empty chair glides home.
export async function standUp(name) {
  const m = cast[name], chair = m.chair
  await moveChair(chair, PULL, m.object.position)
  m.doing = 'stand_up'
  m.seated = false
  const from = m.object.position.clone(), to = chair.step.clone().setY(from.y)
  await tween(m.anim.actions.stand_up.getClip().duration, t => m.object.position.lerpVectors(from, to, Math.max(0, t * 1.6 - 0.6)))
  m.doing = null
  await step(m, [chair.front.x, chair.front.z])
  await moveChair(chair, 0)
  chair.by = null
  m.chair = null
}

// The March Hare changes seats: up, round the head of the table if he crosses it, and down in an empty chair.
export async function changeSeats(name) {
  const m = cast[name], free = chairs.filter(c => !c.by)
  const chair = free[Math.floor(Math.random() * free.length)]
  await standUp(name)
  await sitDown(name, chair)
}

// Gets a character up and moves it to a standing spot { pos, rot } over `seconds`, hopping `hop` metres.
export function stand(name, { pos, rot }, seconds, hop = 0) {
  const m = cast[name], from = m.object.position.clone(), to = new THREE.Vector3(...pos)
  if (m.chair) m.chair.by = null
  m.chair = null
  m.seated = false
  m.moving = true
  m.object.rotation.set(0, rot * DEG, 0)
  return tween(seconds, t => {
    m.object.position.lerpVectors(from, to, t)
    m.object.position.y += Math.sin(t * Math.PI) * hop
  }).then(() => { m.moving = false })
}

function play(m, line) {
  const speaking = line && speakers[line] === m.name
  if (m.doing) {
    if (m.anim.current !== m.anim.actions[m.doing]) m.anim.play(m.doing, ONCE.has(m.doing))
  }
  else if (m.moving) m.anim.play('walk')
  else if (game.pass >= 1) m.anim.play(game.pass === 1 ? 'dance_swing' : 'dance_silly')
  else if (game.pass === 0 && m.name === 'hatter') m.anim.play('sing')
  else if (m.name === 'dormouse') {
    // Asleep on the plate; on each of its lines it wakes, sits up and talks, then sleeps again.
    if (!speaking) {
      m.woken = false
      m.anim.play('sleep')
    } else if (!m.woken) {
      m.woken = true
      m.anim.play('wake', true)
    } else if (m.anim.current !== m.anim.actions.wake || !m.anim.current.isRunning()) m.anim.play('sit_talk')
  } else m.anim.play((m.seated ? SITTING : STANDING)[(line && BEATS[line]?.[m.name]) ?? (speaking ? 'talk' : 'idle')])
}

const lift = new THREE.Vector3()
export function updateCast(dt) {
  const line = currentLine()
  for (const m of Object.values(cast)) {
    play(m, line)
    m.anim.mixer.update(dt)
    m.blink.update(dt, m.anim.current?.getClip().name.includes('sleep'))
    if (!m.armature) continue
    const action = m.anim.current, clip = action.getClip(), r = m.rests[clip.name], onSeat = stage[m.name].seat - m.object.position.y - m.rests.sitting?.lows[0]
    // Sitting down the hips lower onto the seat through the clip; standing up they rise from it.
    if (clip.name === 'sit_down' || clip.name === 'stand_up') {
      const k = Math.min(1, action.time / clip.duration * 1.25)
      lift.set(0, onSeat * (clip.name === 'sit_down' ? k : 1 - k), 0)
    } else if (m.seated && (clip.name.startsWith('sit_') || ['show_watch', 'mend', 'butter', 'dunk_watch', 'stuff', 'lean_over'].includes(clip.name))) lift.set(0, onSeat, 0)
    else if (r) lift.set(-r.middle.x, -r.lows[Math.floor(action.time / clip.duration * r.lows.length) % r.lows.length], -r.middle.z)
    else lift.set(0, 0, 0)
    if (m.name === 'dormouse') {
      m.armature.position.copy(lift)
      m.object.updateMatrixWorld(true)
    } else m.armature.position.lerp(lift, Math.min(1, dt * 10))
  }
}

// The under-table task chooses the bridge point and calls this when the Hare is needed.
export async function laySpoon(point, spoon = model('spoon'), approach = point) {
  const m = cast.hare, chair = m.chair
  if (m.seated) await standUp('hare')
  await walk('hare', [[approach.x, approach.z]])
  m.object.rotation.y = Math.atan2(point.x - approach.x, point.z - approach.z)
  scene.add(spoon)
  holdCast(spoon, m.object, 'RightHand', [0, 0.03, 0])
  m.doing = 'lay_spoon'
  await wait(m.anim.actions.lay_spoon.getClip().duration)
  release(spoon)
  const from = spoon.position.clone()
  await tween(0.35, t => spoon.position.lerpVectors(from, point, t))
  m.doing = null
  sitDown('hare', chair)
  return spoon
}
