import * as THREE from 'three/webgpu'
import { Animator } from './animation.js'
import { model } from './models.js'
import { things } from './garden.js'
import { currentLine } from './audio.js'
import speakers from './speakers.json'
import { cast as stage } from './layout.js'
import { tween } from './tweens.js'
import { game } from './state.js'

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

// Where a clip's body rests, in the model's own frame: for sitting, the height of the buttocks in sit_idle (the
// lowest point just behind the hip joint); otherwise the lowest point of the body, under its middle.
function rest(name, clip, buttocks) {
  const object = model(name), anim = new Animator(object, name)
  anim.actions[clip].play()
  anim.mixer.update(0)
  object.updateMatrixWorld(true)
  const hips = object.getObjectByName('mixamorigHips').getWorldPosition(new THREE.Vector3()), v = new THREE.Vector3()
  const middle = new THREE.Vector3()
  let low = Infinity, n = 0
  object.traverse(o => {
    if (!o.isSkinnedMesh) return
    for (let i = 0; i < o.geometry.attributes.position.count; i++) {
      o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld)
      if (buttocks && (Math.abs(v.x - hips.x) > 0.1 || v.z > hips.z || v.z < hips.z - 0.1 || v.y > hips.y)) continue
      low = Math.min(low, v.y)
      middle.add(v)
      n++
    }
  })
  return buttocks ? new THREE.Vector3(0, low, 0) : middle.divideScalar(n).setY(low)
}

// The Hatter, the March Hare and the Dormouse. The game moves their roots; this plays their clips and shifts each
// model's armature so the clip's body rests on its seat, plate, tabletop or lawn (the Dormouse's lying and
// sitting bodies centred over its plate).
export const cast = Object.fromEntries(['hatter', 'hare', 'dormouse'].map(name => {
  const object = things[name], anim = new Animator(object, name)
  const member = { name, object, anim, armature: object.getObjectByName('Armature'), seated: 'seat' in stage[name], rests: {} }
  if (member.seated && anim.has('sit_idle')) member.rests.sitting = rest(name, 'sit_idle', true)
  for (const clip of ['sleep', 'wake', 'sit_talk', 'sit_idle']) if (name === 'dormouse' && anim.has(clip)) member.rests[clip] = rest(name, clip)
  return [name, member]
}))

// Gets a character up and moves it to a standing spot { pos, rot } over `seconds`, hopping `hop` metres.
export function stand(name, { pos, rot }, seconds, hop = 0) {
  const m = cast[name], from = m.object.position.clone(), to = new THREE.Vector3(...pos)
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
  if (m.trying) m.anim.play(m.trying)
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
    if (!m.armature) continue
    if (m.seated) lift.set(0, stage[m.name].seat - m.object.position.y - m.rests.sitting.y, 0)
    else lift.copy(m.rests[m.anim.current.getClip().name] ?? lift.set(0, 0, 0)).negate()
    m.armature.position.lerp(lift, Math.min(1, dt * 10))
  }
}
