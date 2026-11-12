import * as THREE from 'three/webgpu'
import contacts from '../docs/fries_hand_contacts.json'
import { player, act, walkTo, anim } from './player.js'
import { tween, wait } from './tweens.js'
import { contactWeight, clipInfo } from './clip-catalog.js'
import { setHandTarget, clearHandTarget, updateContactIK, mouthPoint, contactMetrics, rigAction, poseCupHand, handPalm, handFrame, posePinchHand } from './contact-ik.js'

const bone = name => player.mesh.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name))
const bones = { right: bone('mixamorig:RightHand'), left: bone('mixamorig:LeftHand'), head: bone('mixamorig:Head') }

// Props in Fries's hands: object -> { hand, grip, clip }.
const held = new Map()
const castHeld = new Map()
const offset = new THREE.Vector3(), turn = new THREE.Quaternion()
const handGoal = new THREE.Vector3(), forward = new THREE.Vector3(), parentTurn = new THREE.Quaternion()
const interactionKey = Symbol('interaction hand')
const cupPoint=new THREE.Vector3(),cupRotation=new THREE.Quaternion(),cupTilt=new THREE.Quaternion(),cupFacing=new THREE.Quaternion()
const isCup=object=>/^(?:blue_|pink_)?teacup$/.test(object.userData.asset??'')
const isGear=object=>object.userData.asset==='gear'
const isPaper=object=>object.userData.asset==='book_page'
const paperCorners = new WeakMap()

function paperPose(object, target, rotation) {
  let corner = paperCorners.get(object)
  if (!corner) {
    const vertices = [], inverse = object.matrixWorld.clone().invert()
    object.updateWorldMatrix(true, true);inverse.copy(object.matrixWorld).invert()
    object.traverse(mesh => {
      if (!mesh.isMesh) return
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld), position = mesh.geometry.attributes.position
      for (let i = 0; i < position.count; i++) vertices.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix))
    })
    // Pinch the lower right corner: the whole sheet extends away from the hand.
    corner = vertices.sort((a, b) => (a.z - a.x) - (b.z - b.x))[0] ?? new THREE.Vector3()
    paperCorners.set(object, corner)
  }
  const normal = new THREE.Vector3(0, .15, 1).applyQuaternion(player.mesh.getWorldQuaternion(new THREE.Quaternion())).normalize()
  const pinch = posePinchHand(player.mesh, 'right', normal)
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize()
  const right = new THREE.Vector3().crossVectors(normal, up).normalize()
  rotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, up))
  object.userData.pinchGap = pinch.gap
  object.userData.pinchPoint = pinch.point.toArray()
  return target.copy(pinch.point).sub(corner.clone().multiply(object.scale).applyQuaternion(rotation))
}

function worldRotation(object, rotation) {
  object.quaternion.copy(rotation)
  if (object.parent) object.quaternion.premultiply(object.parent.getWorldQuaternion(parentTurn).invert())
}
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t)}
function cupPose(object,target,rotation){
  const scale=player.p.scale,time=anim.current?.getClip().name==='drink'?anim.current.time:0
  const raised=smooth((time-2.8)/1.25)*(1-smooth((time-5.3)/1.1))
  const tilt=-.32*raised
  player.mesh.getWorldQuaternion(cupFacing);cupTilt.setFromAxisAngle(THREE.Object3D.DEFAULT_UP.clone().set(1,0,0),tilt)
  rotation.copy(cupFacing).multiply(cupTilt)
  const rest=player.mesh.localToWorld(new THREE.Vector3(0,.66,.28))
  const lip=mouthPoint(player.mesh,new THREE.Vector3()),rim=new THREE.Vector3(0,.065,-.044).multiplyScalar(scale).applyQuaternion(rotation)
  target.copy(lip).sub(rim).lerp(rest,1-raised)
}

// A recovered gear rests over an open palm. Its world size is unchanged at all
// body sizes; keep the fingers below the disc instead of passing through its
// central hole or burying a tiny gear in the giant's fist.
function gearPose(hand,target){
  const s=player.p.scale,ahead=new THREE.Vector3(0,0,1).applyQuaternion(player.mesh.getWorldQuaternion(turn))
  poseCupHand(player.mesh,hand,ahead,THREE.Object3D.DEFAULT_UP,.08)
  bones[hand].getWorldPosition(target).addScaledVector(ahead,.05*s)
  let top=target.y
  const prefix=hand==='left'?'Left':'Right'
  for(const digit of ['Index','Middle','Ring','Pinky','Thumb'])for(let part=1;part<=3;part++){
    const joint=bone(`mixamorig:${prefix}Hand${digit}${part}`);if(joint)top=Math.max(top,joint.getWorldPosition(new THREE.Vector3()).y)
  }
  target.y=top+.012*s+.007
  return target
}

export function setInteractionHandTarget(character, side, targetOrNull) {
  if (targetOrNull === null) clearHandTarget(character, interactionKey)
  else setHandTarget(character, side, interactionKey, targetOrNull, 1)
}

function worldPosition(object, position) {
  object.position.copy(position)
  if (object.parent) object.parent.worldToLocal(object.position)
}

function wristForProp(character, side, propPosition, grip, target) {
  const hand = character.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(`mixamorig:${side === 'left' ? 'Left' : 'Right'}Hand`))
  const scale = character.getWorldScale(offset).x
  target.copy(propPosition)
  if (hand) target.sub(offset.set(...grip).multiplyScalar(scale).applyQuaternion(hand.getWorldQuaternion(turn)))
  return target
}

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
export async function toHand(object, prop, {seconds=.6,height=.08}={}) {
  await fly(object, end => {if(isPaper(object)){paperPose(object,end,cupRotation);worldRotation(object,cupRotation);return end}if(isCup(object)&&prop.clip==='drink'){cupPose(object,end,cupRotation);return end}if(isGear(object))return gearPose(contacts[prop.clip].hand,end);return inHand({ hand: contacts[prop.clip].hand, grip: prop.grip, clip: prop.clip }, end)}, seconds, height)
  hold(object, prop)
}

export function hold(object, prop) {
  const hand = contacts[prop.clip].hand, grip = prop.grip ?? [0, 0, 0]
  const anchor = object.getWorldPosition(new THREE.Vector3())
  const how = { hand, grip, clip: prop.clip, anchor }
  held.set(object, how)
  if(isPaper(object)){
    how.paper=true;how.wristLocal=player.mesh.worldToLocal(bones[hand].getWorldPosition(new THREE.Vector3()))
    setHandTarget(player.mesh,hand,object,target=>player.mesh.localToWorld(target.copy(how.wristLocal)),()=>/walk|run|jump/.test(anim.current?.getClip().name??'')?0:1)
    return
  }
  if(isGear(object)){
    how.gear=true;how.wrist=bones[hand].getWorldPosition(new THREE.Vector3())
    setHandTarget(player.mesh,hand,object,target=>target.copy(how.wrist),1)
    return
  }
  if(isCup(object)&&prop.clip==='drink'){
    how.cup=true
    setHandTarget(player.mesh,'left',object,target=>object.localToWorld(target.set(.088,.033,-.018)),1)
    setHandTarget(player.mesh,'right',object,target=>object.localToWorld(target.set(-.012,-.025,-.052)),1)
    return
  }
  setHandTarget(player.mesh, hand, object, target => {
    if (how.clip === 'drink') {
      const scale = player.p.scale
      mouthPoint(player.mesh, handGoal)
      forward.set(0, 0, 1).applyQuaternion(player.mesh.getWorldQuaternion(turn))
      // The cup stays upright: the actual inner rim meets the mouth. IK moves
      // the wrist to the vessel, instead of pushing a vessel away from the head.
      handGoal.addScaledVector(forward, 0.038 * scale).y -= 0.065 * scale
      return wristForProp(player.mesh, hand, handGoal, grip, target)
    }
    return wristForProp(player.mesh, hand, anchor, grip, target)
  }, () => {
    const action = anim.current
    return action?.getClip().name === how.clip ? contactWeight(how.clip, action.time, action.getClip().duration) : 0
  })
}

export function holdCast(object, character, hand = 'RightHand', grip = [0, 0, 0]) {
  const bone = character.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(`mixamorig:${hand}`))
  const rotation = bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(object.getWorldQuaternion(new THREE.Quaternion()))
  const side = hand.startsWith('Left') ? 'left' : 'right', anchor = object.getWorldPosition(new THREE.Vector3())
  castHeld.set(object, { bone, character, side, grip, rotation, anchor, flight: 0 })
  setHandTarget(character, side, object, target => wristForProp(character, side, anchor, grip, target), 1)
  const otherSide = side === 'left' ? 'right' : 'left'
  setHandTarget(character, otherSide, object, target => {
    object.getWorldPosition(target)
    return target.add(new THREE.Vector3(otherSide === 'left' ? -0.025 : 0.025, 0, 0).applyQuaternion(character.getWorldQuaternion(turn)))
  }, () => {
    const action = rigAction(character), clip = action?.getClip()
    return clip && clipInfo(clip.name).contact?.hands?.includes(otherSide) ? contactWeight(clip.name, action.time, clip.duration) : 0
  })
}

// Attach a measured point on the prop, rather than assuming its origin is its
// handle. This keeps the spoon's bowl clear of the Hare's fingers.
export function holdCastAt(object,character,handName,point){
  const hand=character.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(`mixamorig:${handName}`))
  const side=handName.startsWith('Left')?'left':'right'
  const frame=handFrame(character,side)
  object.quaternion.copy(frame).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2))
  if(object.parent)object.quaternion.premultiply(object.parent.getWorldQuaternion(new THREE.Quaternion()).invert())
  const pivot=point.clone().multiply(object.scale).applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion()))
  const palm=handPalm(character,side),wrist=hand.getWorldPosition(new THREE.Vector3())
  worldPosition(object,palm.clone().sub(pivot))
  const grip=palm.sub(wrist).sub(pivot).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()).invert()).divideScalar(character.getWorldScale(new THREE.Vector3()).x)
  holdCast(object,character,handName,grip.toArray())
  castHeld.get(object).grasp=true
}

export function release(object) {
  const owner = castHeld.get(object)?.character ?? player.mesh
  clearHandTarget(owner, object)
  castHeld.delete(object)
  held.delete(object)
}

let lastUpdate = performance.now()
export function updateHands(dt) {
  const now = performance.now()
  dt ??= Math.min(0.05, Math.max(0, (now - lastUpdate) / 1000))
  lastUpdate = now
  const cups=[...held].filter(([,how])=>how.cup)
  for(const [object]of cups){
    anim.relaxUpperBody();cupPose(object,cupPoint,cupRotation);worldPosition(object,cupPoint);object.quaternion.copy(cupRotation)
    if(object.parent)object.quaternion.premultiply(object.parent.getWorldQuaternion(parentTurn).invert())
    object.updateWorldMatrix(true,true)
  }
  updateContactIK()
  for(const [object]of cups){
    const ahead=new THREE.Vector3(0,0,1).applyQuaternion(cupRotation)
    poseCupHand(player.mesh,'left',ahead,new THREE.Vector3(-1,0,0).applyQuaternion(cupRotation))
    poseCupHand(player.mesh,'right',ahead,new THREE.Vector3(0,1,0).applyQuaternion(cupRotation))
  }
  for (const [object, how] of castHeld) {
    const { bone, grip, rotation, anchor } = how
    if(how.grasp){const frame=handFrame(how.character,how.side);poseCupHand(how.character,how.side,new THREE.Vector3(0,1,0).applyQuaternion(frame),new THREE.Vector3(0,0,1).applyQuaternion(frame),1.2)}
    const scale = how.character.getWorldScale(offset).x
    bone.getWorldPosition(handGoal).add(offset.set(...grip).multiplyScalar(scale).applyQuaternion(bone.getWorldQuaternion(turn)))
    how.flight = Math.min(1, how.flight + dt / 0.45)
    handGoal.lerpVectors(anchor, handGoal, how.flight * how.flight * (3 - 2 * how.flight))
    worldPosition(object, handGoal)
    object.quaternion.copy(turn).multiply(rotation)
    if (object.parent) object.quaternion.premultiply(object.parent.getWorldQuaternion(parentTurn).invert())
  }
  for (const [object, how] of held) {
    if(how.paper){paperPose(object,handGoal,cupRotation);worldPosition(object,handGoal);worldRotation(object,cupRotation)}
    else if(how.gear){worldPosition(object,gearPose(how.hand,handGoal));object.quaternion.copy(player.mesh.getWorldQuaternion(turn));if(object.parent)object.quaternion.premultiply(object.parent.getWorldQuaternion(parentTurn).invert())}
    else if(!how.cup)worldPosition(object, inHand(how, handGoal))
  }
}

export function clearHeldProps() {
  for (const object of [...held.keys(), ...castHeld.keys()]) release(object)
}

// Short-armed hosts receive a floating cup instead of an impossible hand-to-face pose.
export async function sipByMagic(object, character, seconds = 1.2) {
  const home = object.getWorldPosition(new THREE.Vector3()), size = character.getWorldScale(new THREE.Vector3()).x
  const target = end => mouthPoint(character, end).add(new THREE.Vector3(0, -0.055, 0.045).multiplyScalar(size).applyQuaternion(character.getWorldQuaternion(turn)))
  await fly(object, target, 0.65, 0.08 * size)
  await wait(seconds)
  await fly(object, end => end.copy(home), 0.65, 0.08 * size)
}

export const handContactMetrics = contactMetrics

if (new URLSearchParams(location.search).has('diagnostics')) {
  window.__characterContacts = { metrics: contactMetrics, update: updateHands, hold, holdCast, release, clear: clearHeldProps,
    setTarget: setInteractionHandTarget, mouthPoint, solve: updateContactIK,holdCastAt }
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
  const target = object.getWorldPosition(new THREE.Vector3()), side = contacts[prop.clip].hand, grip = prop.grip ?? [0, 0, 0]
  setHandTarget(player.mesh, side, object, end => wristForProp(player.mesh, side, target, grip, end), () => {
    const action = anim.current
    return action?.getClip().name === prop.clip ? contactWeight(prop.clip, action.time, action.getClip().duration) : 0
  })
  if (prop.clip === 'drink') {
    await toHand(object, prop)
    await wait(time - 0.6)
  } else {
    await wait(time)
    // Acquire the last small gap magically when the real arm cannot reach it.
    await toHand(object, prop)
  }
  contact()
  await wait(duration - time)
}
