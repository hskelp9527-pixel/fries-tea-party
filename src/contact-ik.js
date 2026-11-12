import * as THREE from 'three/webgpu'
import { contactWeight } from './clip-catalog.js'

const rigs = new Map()
const bone = (root, part) => root.getObjectByName(`mixamorig${part}`) ?? root.getObjectByName(`mixamorig:${part}`)
const EPS = 1e-6
const scratch = Array.from({ length: 22 }, () => new THREE.Vector3())
const worldQ = new THREE.Quaternion(), parentQ = new THREE.Quaternion(), deltaQ = new THREE.Quaternion(), targetQ = new THREE.Quaternion()
const unitScale = new THREE.Vector3()

function sampleHead(root, head, upper) {
  const bounds = new THREE.Box3(), point = new THREE.Vector3()
  const meshes = []
  root.traverse(object => { if (object.isSkinnedMesh && object.geometry.attributes.skinIndex && !/Eyelids|SpeechMouth|eyelid/i.test(object.name)) meshes.push(object) })
  const mesh = meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count)[0]
  root.updateWorldMatrix(true, true)
  // SkinnedMesh updates its attached bind inverse in updateMatrixWorld, not
  // updateWorldMatrix. Registration precedes the first rendered frame.
  root.updateMatrixWorld(true)
  const inverse = root.matrixWorld.clone().invert()
  if (mesh) {
    const joints = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight
    for (let i = 0; i < joints.count; i++) {
      let share = 0
      for (let j = 0; j < joints.itemSize; j++) if (/Head(?:Top_End)?$/.test(mesh.skeleton.bones[joints.getComponent(i, j)]?.name ?? '')) share += weights.getComponent(i, j)
      if (share < 0.65) continue
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse)
      bounds.expandByPoint(point)
    }
  }
  head.getWorldPosition(point).applyMatrix4(inverse)
  if (bounds.isEmpty()) {
    upper.getWorldPosition(scratch[0]).applyMatrix4(inverse)
    const r = Math.max(0.025, Math.abs(point.y - scratch[0].y) * 0.65)
    bounds.set(point.clone().addScalar(-r), point.clone().addScalar(r))
  }
  const width = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z)
  // Ears and tall hats are appendages, not a solid sphere enclosing the whole face.
  const top = Math.min(bounds.max.y, bounds.min.y + width * 1.16)
  const centre = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + top) / 2, (bounds.min.z + bounds.max.z) / 2)
  root.localToWorld(centre)
  head.worldToLocal(centre)
  return { local: centre, radius: Math.max(0.018, Math.max(width, top - bounds.min.y) * 0.42) }
}

export function registerContactRig(root, name) {
  if (rigs.has(root)) return rigs.get(root)
  const head = bone(root, 'Head'), chest = bone(root, 'Spine2'), hips = bone(root, 'Hips')
  if (!head || !chest || !hips) return null
  const arms = {}
  for (const [side, title] of [['left', 'Left'], ['right', 'Right']]) {
    const upper = bone(root, title + 'Arm'), lower = bone(root, title + 'ForeArm'), hand = bone(root, title + 'Hand')
    if (upper && lower && hand) {
      const middle=bone(root,title+'HandMiddle1'),index=bone(root,title+'HandIndex1'),pinky=bone(root,title+'HandPinky1')
      const palmFrame=new THREE.Quaternion()
      if(middle&&index&&pinky){
        root.updateMatrixWorld(true)
        const y=middle.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3())).normalize()
        const x=index.getWorldPosition(new THREE.Vector3()).sub(pinky.getWorldPosition(new THREE.Vector3()));x.addScaledVector(y,-x.dot(y)).normalize()
        const z=new THREE.Vector3().crossVectors(x,y).normalize()
        // The mirrored left hand reverses the index-to-pinky frame's normal.
        // Calibrate both frames to the palm, not one palm and one hand back.
        if(side==='left'){x.negate();z.negate()}
        palmFrame.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)).premultiply(hand.getWorldQuaternion(new THREE.Quaternion()).invert())
      }
      const fingers=[]
      for(const digit of ['Index','Middle','Ring','Pinky','Thumb'])for(let part=1;part<=3;part++){
        const joint=bone(root,title+'Hand'+digit+part);if(joint)fingers.push({joint,quaternion:joint.quaternion.clone()})
      }
      arms[side] = { side, upper, lower, hand, palmFrame, fingers, targets: new Map(), lastElbow: new THREE.Vector3(), initialized: false }
    }
  }
  if (!arms.left || !arms.right) return null
  const headShape = sampleHead(root, head, arms.left.upper)
  const rig = { root, name, head, chest, hips, arms, headShape, action: null, metrics: {}, mouth: null, mouthAnchor:root.getObjectByName('MouthContact') }
  if(rig.mouthAnchor){
    if(!rig.mouthAnchor.isSkinnedMesh)rig.mouthAnchor=rig.mouthAnchor.getObjectsByProperty('isSkinnedMesh',true)[0]
    if(rig.mouthAnchor)rig.mouthAnchor.visible=false
  }
  root.traverse(object => { if (Array.isArray(object.userData.mouthLocal)) rig.mouth = new THREE.Vector3(...object.userData.mouthLocal) })
  // glTF joint axes may differ from Blender's edit-bone axes. Measure the
  // exported skinned mouth itself instead of reusing a Blender-local vector.
  root.traverse(mesh=>{
    if(!mesh.isSkinnedMesh||!mesh.name.startsWith('SpeechMouth'))return
    const centre=new THREE.Vector3(),point=new THREE.Vector3(),count=mesh.geometry.attributes.position.count
    root.updateWorldMatrix(true,true)
    for(let i=0;i<count;i++)centre.add(mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld))
    rig.mouth=head.worldToLocal(centre.divideScalar(count))
  })
  rigs.set(root, rig)
  return rig
}

export function setRigAction(root, action, name) {
  const rig = rigs.get(root) ?? registerContactRig(root, name)
  if (rig) rig.action = action
}

export function setHandTarget(root, side, key, target, weight = 1, options = {}) {
  const rig = rigs.get(root) ?? registerContactRig(root, root.userData.asset ?? 'fries')
  rig?.arms[side]?.targets.set(key, { target, weight, ...options })
}
export function clearHandTarget(root, key) {
  for (const arm of Object.values(rigs.get(root)?.arms ?? {})) arm.targets.delete(key)
}

export function mouthPoint(root, target = new THREE.Vector3()) {
  const rig = rigs.get(root) ?? registerContactRig(root, root.userData.asset ?? 'fries')
  if (!rig) return root.getWorldPosition(target)
  if (rig.mouthAnchor){rig.mouthAnchor.updateMatrixWorld(true);return rig.mouthAnchor.getVertexPosition(0,target).applyMatrix4(rig.mouthAnchor.matrixWorld)}
  if (rig.mouth) return rig.head.localToWorld(target.copy(rig.mouth))
  const scale = root.getWorldScale(scratch[0]).x
  rig.head.getWorldPosition(target)
  return target.add(scratch[1].set(0, 0.025, 0.11).multiplyScalar(scale).applyQuaternion(root.getWorldQuaternion(worldQ)))
}

function distanceSegments(p0, p1, q0, q1) {
  const u = scratch[16].subVectors(p1, p0), v = scratch[17].subVectors(q1, q0), w = scratch[18].subVectors(p0, q0)
  const a = u.dot(u), b = u.dot(v), c = v.dot(v), d = u.dot(w), e = v.dot(w)
  const determinant = a * c - b * b
  let s = determinant > EPS ? THREE.MathUtils.clamp((b * e - c * d) / determinant, 0, 1) : 0
  let t = c > EPS ? (b * s + e) / c : 0
  if (t < 0) { t = 0; s = a > EPS ? THREE.MathUtils.clamp(-d / a, 0, 1) : 0 }
  else if (t > 1) { t = 1; s = a > EPS ? THREE.MathUtils.clamp((b - d) / a, 0, 1) : 0 }
  return scratch[19].copy(w).addScaledVector(u, s).addScaledVector(v, -t).length()
}

function pointSegmentDistance(point, a, b) {
  const line = scratch[16].subVectors(b, a)
  const length = line.lengthSq()
  const t = length > EPS ? THREE.MathUtils.clamp(scratch[17].subVectors(point, a).dot(line) / length, 0, 1) : 0
  return scratch[18].copy(a).addScaledVector(line, t).distanceTo(point)
}

function clearance(rig, a, elbow, wrist, head, hips, chest, scale, torsoRadius) {
  const radius = rig.headShape.radius * scale + 0.012 * scale
  const upperStart = scratch[20].lerpVectors(a, elbow, 0.35)
  const headClearance = Math.min(pointSegmentDistance(head, upperStart, elbow), pointSegmentDistance(head, elbow, wrist)) - radius
  // The proximal upper arm attaches inside the shoulder volume; that anatomical
  // attachment is excluded. The forearm and wrist have no such exemption.
  const torsoClearance = distanceSegments(elbow, wrist, hips, chest) - torsoRadius
  return { head: headClearance, torso: torsoClearance, minimum: Math.min(headClearance, torsoClearance) }
}

function rotateToward(joint, child, desired, strength) {
  const current = scratch[12], direction = scratch[13], origin = scratch[14]
  joint.getWorldPosition(origin)
  child.getWorldPosition(current).sub(origin).normalize()
  direction.subVectors(desired, origin).normalize()
  if (current.lengthSq() < EPS || direction.lengthSq() < EPS) return
  joint.getWorldQuaternion(worldQ)
  deltaQ.setFromUnitVectors(current, direction)
  joint.parent.getWorldQuaternion(parentQ).invert()
  targetQ.copy(parentQ).multiply(deltaQ).multiply(worldQ)
  joint.quaternion.slerp(targetQ, strength)
  joint.updateWorldMatrix(false, true)
}

// Analytic two-bone solution. Bone lengths are never changed or stretched.
export function solveTwoBone(root, side, requested, strength = 1) {
  const rig = rigs.get(root) ?? registerContactRig(root, root.userData.asset ?? 'fries')
  const arm = rig?.arms[side]
  if (!arm) return null
  root.updateWorldMatrix(true, true)
  const a = arm.upper.getWorldPosition(scratch[0]), animatedElbow = arm.lower.getWorldPosition(scratch[1]), wrist = arm.hand.getWorldPosition(scratch[2])
  const lengthA = a.distanceTo(animatedElbow), lengthB = animatedElbow.distanceTo(wrist)
  if (lengthA < EPS || lengthB < EPS) return null
  const scale = root.getWorldScale(unitScale).x
  const head = rig.head.localToWorld(scratch[3].copy(rig.headShape.local))
  const hips = rig.hips.getWorldPosition(scratch[4]), chest = rig.chest.getWorldPosition(scratch[5])
  const shoulderWidth = rig.arms.left.upper.getWorldPosition(scratch[6]).distanceTo(rig.arms.right.upper.getWorldPosition(scratch[7]))
  const torsoRadius = Math.max(0.012 * scale, shoulderWidth * 0.31)
  let initial=clearance(rig,a,animatedElbow,wrist,head,hips,chest,scale,torsoRadius)
  const socket=arm.upper.parent
  if(initial.head<0&&socket?.isBone&&/Shoulder$/.test(socket.name)){
    const origin=socket.getWorldPosition(new THREE.Vector3()),span=origin.distanceTo(a)
    const direction=new THREE.Vector3().subVectors(a,head).normalize()
    const target=origin.clone().addScaledVector(direction,span)
    rotateToward(socket,arm.upper,target,1)
    arm.upper.getWorldPosition(a);arm.lower.getWorldPosition(animatedElbow);arm.hand.getWorldPosition(wrist)
    initial=clearance(rig,a,animatedElbow,wrist,head,hips,chest,scale,torsoRadius)
  }
  if(initial.minimum>=0&&wrist.distanceToSquared(requested)<1e-10){
    arm.lastElbow.copy(animatedElbow);arm.initialized=true
    return {...initial,requestedError:0,resolvedError:0,reachable:true,clampedDistance:0,shoulder:a.toArray(),elbow:animatedElbow.toArray(),wrist:wrist.toArray(),requested:requested.toArray(),resolved:wrist.toArray()}
  }
  const goal = scratch[6].copy(requested)
  const away = scratch[7].subVectors(goal, head)
  const headRadius = rig.headShape.radius * scale + 0.018 * scale
  if (away.length() < headRadius) {
    if (away.lengthSq() < EPS) away.set(side === 'left' ? -1 : 1, -0.15, 1).applyQuaternion(root.getWorldQuaternion(worldQ))
    goal.copy(head).add(away.setLength(headRadius))
  }
  const torsoAxis = scratch[21].subVectors(chest, hips)
  const torsoLength = torsoAxis.lengthSq()
  const torsoT = torsoLength > EPS ? THREE.MathUtils.clamp(scratch[7].subVectors(goal, hips).dot(torsoAxis) / torsoLength, 0, 1) : 0
  const torsoCentre = scratch[8].copy(hips).addScaledVector(torsoAxis, torsoT)
  const torsoAway = scratch[7].subVectors(goal, torsoCentre)
  if (torsoAway.length() < torsoRadius + 0.01 * scale) {
    if (torsoAway.lengthSq() < EPS) torsoAway.set(0, 0, 1).applyQuaternion(root.getWorldQuaternion(worldQ))
    goal.copy(torsoCentre).add(torsoAway.setLength(torsoRadius + 0.012 * scale))
  }
  const axis = scratch[7].subVectors(goal, a)
  const requestedDistance = axis.length(), distance = THREE.MathUtils.clamp(requestedDistance, Math.abs(lengthA - lengthB) + EPS, (lengthA + lengthB) * 0.998)
  if (axis.lengthSq() < EPS) axis.set(0, -1, 0)
  axis.normalize()
  goal.copy(a).addScaledVector(axis, distance)
  const along = (lengthA * lengthA + distance * distance - lengthB * lengthB) / (2 * distance)
  const across = Math.sqrt(Math.max(0, lengthA * lengthA - along * along))
  const pole = scratch[8].subVectors(animatedElbow, a).addScaledVector(axis, -scratch[8].dot(axis))
  if (pole.lengthSq() < EPS) {
    pole.set(side === 'left' ? -1 : 1, -0.25, 0.3).applyQuaternion(root.getWorldQuaternion(worldQ))
    pole.addScaledVector(axis, -pole.dot(axis))
  }
  pole.normalize()
  const lateral = scratch[9].crossVectors(axis, pole).normalize(), elbow = scratch[10], best = scratch[11]
  let bestScore = -Infinity
  for (const angle of [0, 0.4, -0.4, 0.8, -0.8, 1.25, -1.25, 1.8, -1.8, Math.PI]) {
    elbow.copy(a).addScaledVector(axis, along).addScaledVector(pole, Math.cos(angle) * across).addScaledVector(lateral, Math.sin(angle) * across)
    const collision = clearance(rig, a, elbow, goal, head, hips, chest, scale, torsoRadius)
    const continuity = arm.initialized ? elbow.distanceToSquared(arm.lastElbow) / Math.max(lengthA * lengthA, EPS) : 0
    const score = Math.min(collision.minimum / Math.max(scale, EPS), 0.025) * 100 - Math.abs(angle) * 0.015 - continuity * 0.02
    if (score > bestScore) { bestScore = score; best.copy(elbow) }
  }
  // An oversized head can leave the requested wrist outside the skull while
  // the short upper arm still crosses it. Search reachable escape directions
  // for the whole chain rather than stretching the arm or shrinking the proxy.
  if(bestScore < -0.05){
    const baseGoal=goal.clone(),baseAxis=axis.clone(),basePole=pole.clone(),baseLateral=lateral.clone()
    const originalDistance=distance
    const escape=new THREE.Vector3().subVectors(a,head).normalize()
    const directions=[escape,new THREE.Vector3(0,-1,0),new THREE.Vector3(arm.side==='left'?-1:1,-.7,.4).normalize().applyQuaternion(root.getWorldQuaternion(worldQ))]
    let bestGoal=baseGoal.clone()
    for(const direction of directions)for(const blend of [.35,.7,1]){
      axis.copy(baseAxis).lerp(direction,blend).normalize()
      const reach=Math.max(originalDistance,(lengthA+lengthB)*.9)
      goal.copy(a).addScaledVector(axis,reach)
      const projection=(lengthA*lengthA+reach*reach-lengthB*lengthB)/(2*reach),spread=Math.sqrt(Math.max(0,lengthA*lengthA-projection*projection))
      pole.copy(basePole).addScaledVector(axis,-basePole.dot(axis)).normalize();lateral.crossVectors(axis,pole).normalize()
      for(const angle of [0,Math.PI/2,-Math.PI/2,Math.PI]){
        elbow.copy(a).addScaledVector(axis,projection).addScaledVector(pole,Math.cos(angle)*spread).addScaledVector(lateral,Math.sin(angle)*spread)
        const hit=clearance(rig,a,elbow,goal,head,hips,chest,scale,torsoRadius)
        const score=Math.min(hit.minimum/Math.max(scale,EPS),.025)*100-goal.distanceToSquared(baseGoal)/Math.max((lengthA+lengthB)**2,EPS)*.03
        if(score>bestScore){bestScore=score;best.copy(elbow);bestGoal.copy(goal)}
      }
    }
    goal.copy(bestGoal);axis.copy(baseAxis);pole.copy(basePole);lateral.copy(baseLateral)
  }
  const solvedElbow = best.clone(), solvedGoal = goal.clone(), original = requested.clone()
  rotateToward(arm.upper, arm.lower, solvedElbow, strength)
  rotateToward(arm.lower, arm.hand, solvedGoal, strength)
  arm.lower.getWorldPosition(arm.lastElbow)
  arm.initialized = true
  const actualA = arm.upper.getWorldPosition(scratch[0]), actualB = arm.lower.getWorldPosition(scratch[1]), actualC = arm.hand.getWorldPosition(scratch[2])
  const result = clearance(rig, actualA, actualB, actualC, head, hips, chest, scale, torsoRadius)
  return { ...result, requestedError: actualC.distanceTo(original), resolvedError: actualC.distanceTo(solvedGoal),
    reachable: requestedDistance <= lengthA + lengthB, clampedDistance: Math.max(0, requestedDistance - (lengthA + lengthB)),
    shoulder: actualA.toArray(), elbow: actualB.toArray(), wrist: actualC.toArray(), requested: original.toArray(), resolved: solvedGoal.toArray() }
}

export function updateContactIK(onlyRoot = null) {
  for (const rig of rigs.values()) {
    if (!rig.root.parent || (onlyRoot && rig.root !== onlyRoot)) continue
    rig.root.updateWorldMatrix(true, true)
    const action = rig.action, clip = action?.getClip(), time = action?.time ?? 0, duration = clip?.duration ?? 1
    for (const arm of Object.values(rig.arms)) {
      let chosen = null, amount = 0
      for (const target of arm.targets.values()) {
        const weight = typeof target.weight === 'function' ? target.weight(time, duration) : target.weight
        if (weight > amount) { amount = weight; chosen = target }
      }
      let requested = arm.hand.getWorldPosition(new THREE.Vector3())
      if (chosen) {
        const supplied = typeof chosen.target === 'function' ? chosen.target(new THREE.Vector3()) : chosen.target
        if (supplied) requested.lerp(supplied, THREE.MathUtils.clamp(amount, 0, 1))
      } else if (clip?.name === 'clap') {
        const phase = contactWeight('clap', time, duration)
        const scale = rig.root.getWorldScale(unitScale).x
        const meeting = rig.chest.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(arm.side === 'left' ? -0.018 : 0.018, -0.025, 0.22).multiplyScalar(scale).applyQuaternion(rig.root.getWorldQuaternion(worldQ)))
        requested.lerp(meeting, phase)
      }
      rig.metrics[arm.side] = solveTwoBone(rig.root, arm.side, requested, 1)
    }
  }
}

export function contactMetrics() {
  return [...rigs.values()].filter(rig => rig.root.parent).map(rig => ({ character: rig.name, clip: rig.action?.getClip().name ?? null,
    time: rig.action?.time ?? 0, head:{centre:rig.head.localToWorld(rig.headShape.local.clone()).toArray(),radius:rig.headShape.radius*rig.root.getWorldScale(new THREE.Vector3()).x}, arms: rig.metrics }))
}

export function registeredContactRigs() { return [...rigs.values()].filter(rig => rig.root.parent) }
export const rigAction = root => rigs.get(root)?.action

// Anatomical palm axes measured from the exported knuckles, not the wrist's
// arbitrary joint axes. +Y points to the fingers and +Z out of the palm.
export function handFrame(root, side, target = new THREE.Quaternion()) {
  const arm = rigs.get(root)?.arms[side]
  return arm ? target.copy(arm.hand.getWorldQuaternion(new THREE.Quaternion())).multiply(arm.palmFrame) : target.identity()
}

export function handPalm(root, side, target = new THREE.Vector3()) {
  const arm = rigs.get(root)?.arms[side]
  if (!arm) return root.getWorldPosition(target)
  const knuckle = bone(root, `${side === 'left' ? 'Left' : 'Right'}HandMiddle1`)
  arm.hand.getWorldPosition(target)
  if (knuckle) target.lerp(knuckle.getWorldPosition(new THREE.Vector3()), .65)
  return target.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(handFrame(root, side)), .012 * root.getWorldScale(new THREE.Vector3()).x)
}

// Bring the real thumb and index end joints onto opposite sides of a sheet.
// All rotations preserve the source phalange lengths.
export function posePinchHand(root, side, normal) {
  const title = side === 'left' ? 'Left' : 'Right'
  const up = new THREE.Vector3(0, 1, 0)
  poseCupHand(root, side, up, new THREE.Vector3().crossVectors(up, normal).normalize(), .8)
  const chains = ['Thumb', 'Index'].map(digit => [1, 2, 3].map(part => bone(root, `${title}Hand${digit}${part}`)))
  const tips = chains.map(chain => chain[2]?.children.find(child => child.isBone) ?? chain[2])
  if (tips.some(tip => !tip)) return { point: handPalm(root, side), gap: null }
  const points = tips.map(tip => tip.getWorldPosition(new THREE.Vector3()))
  const middle = points[0].clone().lerp(points[1], .5)
  const pad = .006 * root.getWorldScale(new THREE.Vector3()).x
  const sign = Math.sign(points[0].clone().sub(points[1]).dot(normal)) || 1
  const targets = [middle.clone().addScaledVector(normal, pad * sign), middle.clone().addScaledVector(normal, -pad * sign)]
  for (let iteration = 0; iteration < 6; iteration++) for (let finger = 0; finger < 2; finger++) {
    for (let joint = 2; joint >= 0; joint--) if (chains[finger][joint] !== tips[finger]) rotateToward(chains[finger][joint], tips[finger], targets[finger], 1)
  }
  tips.forEach((tip, i) => tip.getWorldPosition(points[i]))
  return { point: points[0].clone().lerp(points[1], .5), gap: points[0].distanceTo(points[1]) }
}

// Orient the entire palm, then curl its actual joints around the vessel.
export function poseCupHand(root,side,forward,normal,curlScale=1){
  const arm=rigs.get(root)?.arms[side];if(!arm)return
  for(const pose of arm.fingers)pose.joint.quaternion.copy(pose.quaternion)
  const y=forward.clone().normalize(),z=normal.clone().addScaledVector(y,-normal.dot(y)).normalize(),x=new THREE.Vector3().crossVectors(y,z).normalize()
  const desired=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)).multiply(arm.palmFrame.clone().invert())
  arm.hand.quaternion.copy(arm.hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(desired);arm.hand.updateWorldMatrix(false,true)
  const prefix=`${side==='left'?'Left':'Right'}Hand`
  for(const digit of ['Index','Middle','Ring','Pinky','Thumb'])for(let part=1;part<=3;part++){
    const joint=bone(root,prefix+digit+part),child=joint?.children.find(c=>c.isBone);if(!joint||!child)continue
    const origin=joint.getWorldPosition(new THREE.Vector3()),direction=child.getWorldPosition(new THREE.Vector3()).sub(origin)
    const axis=new THREE.Vector3().crossVectors(direction,normal).normalize()
    if(axis.lengthSq()<EPS)continue
    const angle=(digit==='Thumb'?.32:part===1?.35:.5)*curlScale
    const target=direction.applyAxisAngle(axis,angle).add(origin);rotateToward(joint,child,target,1)
  }
}
