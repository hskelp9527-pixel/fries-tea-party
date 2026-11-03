import * as THREE from 'three/webgpu'
import contacts from '../docs/fries_hand_contacts.json'
import { player, act, walkTo } from './player.js'
import { tween, wait } from './tweens.js'

const bone = name => player.mesh.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name))
const bones = { right: bone('mixamorig:RightHand'), left: bone('mixamorig:LeftHand'), head: bone('mixamorig:Head') }

// Props in Fries's hands: object -> { hand, grip, clip }.
const held = new Map()
const castHeld = new Map()
const offset = new THREE.Vector3(), turn = new THREE.Quaternion()

// Where a prop held this way sits now: on the hand bone, moved by `grip` (metres at scale 1, in the hand's frame)
// into the palm. A box Fries has no hand bones, so there the prop sits where the clip puts the palm at contact.
function inHand({ hand, grip, clip }, target) {
  const s = player.p.scale
  if (bones[hand]) return bones[hand].getWorldPosition(target).add(offset.set(...grip).multiplyScalar(s).applyQuaternion(bones[hand].getWorldQuaternion(turn)))
  return palmAt(clip, target)
}

// The palm at a clip's contact time, around Fries as he stands now.
export function palmAt(clip, target) {
  return target.set(...contacts[clip].palm).multiplyScalar(player.p.scale).applyAxisAngle(THREE.Object3D.DEFAULT_UP, player.mesh.rotation.y).add(player.feet)
}

// Flies a prop the short way into the hand its clip uses, and holds it there.
export async function toHand(object, prop) {
  await fly(object, end => inHand({ hand: contacts[prop.clip].hand, grip: prop.grip, clip: prop.clip }, end), 0.6, 0.08)
  hold(object, prop)
}

export function hold(object, prop) {
  held.set(object, { hand: contacts[prop.clip].hand, grip: prop.grip, clip: prop.clip, clearOfFace: prop.clip === 'drink' })
}

export function holdCast(object, character, hand = 'RightHand', grip = [0, 0, 0]) {
  const bone = character.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(`mixamorig:${hand}`))
  const rotation = bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(object.getWorldQuaternion(new THREE.Quaternion()))
  castHeld.set(object, { bone, grip, rotation })
}

export function release(object) {
  castHeld.delete(object)
  held.delete(object)
}

// A cup held to the mouth stays clear of his face and glasses: outside a ball round the front of his head.
const face = new THREE.Vector3(), ahead = new THREE.Vector3(), away = new THREE.Vector3()
export function updateHands() {
  for (const [object, { bone, grip, rotation }] of castHeld) {
    bone.getWorldPosition(object.position).add(offset.set(...grip).applyQuaternion(bone.getWorldQuaternion(turn)))
    object.quaternion.copy(turn).multiply(rotation)
  }
  for (const [object, how] of held) {
    inHand(how, object.position)
    if (!how.clearOfFace || !bones.head) continue
    const s = player.p.scale
    bones.head.getWorldPosition(face).add(ahead.set(Math.sin(player.mesh.rotation.y), 0, Math.cos(player.mesh.rotation.y)).multiplyScalar(0.03 * s))
    away.subVectors(object.position, face)
    if (away.length() < 0.13 * s) object.position.copy(face).add(away.setY(Math.min(away.y, -0.02 * s)).setLength(0.13 * s))
  }
}

// Moves a prop along an arc to a target that may itself be moving (`to` fills in a Vector3).
export function fly(object, to, seconds, height) {
  const from = object.position.clone(), end = new THREE.Vector3()
  return tween(seconds, t => {
    object.position.lerpVectors(from, to(end), t)
    object.position.y += Math.sin(t * Math.PI) * height
  })
}

// A one-shot that touches a prop. Fries walks to the prop's stand point and faces it, plays the clip, and
// `contact` runs when his palm meets the prop: pick_up and reach take it into the hand there and keep it to the
// end of the clip; drink holds it from the start, so the prop flies the short way into his hand first.
// Resolves at the end of the clip with the prop still held.
export async function use(prop, object, contact) {
  await walkTo(prop.stand, prop.rot)
  const { time, duration } = contacts[prop.clip]
  act(prop.clip)
  if (prop.clip === 'drink') {
    await toHand(object, prop)
    await wait(time - 0.6)
  } else {
    await wait(time)
    hold(object, prop)
  }
  contact()
  await wait(duration - time)
}
