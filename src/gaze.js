import * as THREE from 'three/webgpu'
import { cast } from './cast.js'
import { player } from './player.js'

// Gaze: each character's head and neck turn to what it looks at, up to about 70 degrees to either side and 30 up or
// down from its current chest pose, settling over about 0.7 s. Past that a standing character turns its body;
// a seated one turns its chest a little. Targets are points that may move (Vector3s), or null for the clip's gaze.
const DEG = Math.PI / 180, YAW = 70 * DEG, PITCH = 30 * DEG, CHEST = 20 * DEG
const CLIP = 0.35, OMEGA = 5, HEAD_SPEED = 80 * DEG, BODY_SPEED = 90 * DEG
const bone = (object, name) => object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(`mixamorig:${name}`))
const lookers = Object.fromEntries([...Object.values(cast).map(m => [m.name, m.object]), ['fries', player.mesh]].map(([name, object]) => {
  const head = bone(object, 'Head'), neck = bone(object, 'Neck'), chest = bone(object, 'Spine2')
  // Joint axes are not anatomical axes. Calibrate them to the model's +Z front in the bind pose.
  object.updateMatrixWorld(true)
  const root = object.getWorldQuaternion(new THREE.Quaternion())
  const frames = new Map([chest, neck, head].map(b => [b, b.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(root)]))
  return [name, { object, head, neck, chest, frames, angles: new THREE.Vector2(), drift: new THREE.Vector2(), goal: new THREE.Vector2(), aim: 0, roll: 0, neckRoll: 0, velocity: new THREE.Vector2(), chestYaw: 0, bodySpeed: 0, target: null }]
}))

// Where a character's head is now, for others to look at.
export const headOf = (name, target = new THREE.Vector3()) => lookers[name].head.getWorldPosition(target)

export function lookAt(name, target) {
  lookers[name].target = target
}

const poses = new Map()
const q = new THREE.Quaternion(), frame = new THREE.Quaternion(), parent = new THREE.Quaternion(), orientation = new THREE.Quaternion(), local = new THREE.Vector3()
const rotation = new THREE.Euler(0, 0, 0, 'YXZ'), desired = new THREE.Vector2(), error = new THREE.Vector2(), impulse = new THREE.Vector2(), next = new THREE.Vector2()

// Set an anatomical world orientation, converting back into the joint's local axes.
function orient(b, axes, world) {
  b.parent.getWorldQuaternion(parent).invert()
  b.quaternion.copy(parent.multiply(world).multiply(q.copy(axes).invert()))
  b.updateMatrixWorld(true)
}

// Exact critically damped response: k = 64, damping = 16, unit mass. Bound both travel and velocity.
function follow(l, dt) {
  const decay = Math.exp(-OMEGA * dt)
  error.subVectors(l.angles, desired)
  impulse.copy(error).multiplyScalar(OMEGA).add(l.velocity)
  next.copy(error).addScaledVector(impulse, dt).multiplyScalar(decay).add(desired).sub(l.angles).clampLength(0, HEAD_SPEED * dt)
  l.angles.add(next)
  l.velocity.addScaledVector(impulse, -OMEGA * dt).multiplyScalar(decay).clampLength(0, HEAD_SPEED)
  for (const [axis, limit] of [['x', YAW], ['y', PITCH]]) {
    const bounded = THREE.MathUtils.clamp(l.angles[axis], -limit, limit)
    if (bounded !== l.angles[axis]) l.velocity[axis] = 0
    l.angles[axis] = bounded
  }
}

// After the clips have posed everyone: ease each head towards its target and turn the bones. `seated(name)` and
// `free(name)` (standing still, not in a clip of its own: free to turn its body) say how each one may turn.
export function updateGaze(dt, seated, free) {
  for (const [name, l] of Object.entries(lookers)) {
    for (const b of [l.chest, l.neck, l.head]) {
      const pose = poses.get(b)
      if (pose && b.quaternion.angleTo(pose.result) < 0.00001) b.quaternion.copy(pose.base)
    }
    l.object.updateMatrixWorld(true)
    for (const b of [l.chest, l.neck, l.head]) poses.set(b, { base: b.quaternion.clone() })
    frame.copy(l.chest.getWorldQuaternion(q)).multiply(l.frames.get(l.chest))
    // A target on top of the head (its own, say) has no direction.
    const target = l.target && l.target.distanceToSquared(l.head.getWorldPosition(local)) > 0.01 ? l.target : null
    let yaw = 0
    if (target) {
      local.subVectors(target, l.head.getWorldPosition(local)).applyQuaternion(q.copy(frame).invert())
      yaw = Math.atan2(local.x, local.z)
    }
    // Past the neck's reach: a standing character turns towards the target, a seated one turns its chest.
    const beyond = Math.sign(yaw) * Math.max(0, Math.abs(yaw) - YAW)
    if (!seated(name) && free(name)) {
      l.bodySpeed = THREE.MathUtils.damp(l.bodySpeed, THREE.MathUtils.clamp(beyond * 4, -BODY_SPEED, BODY_SPEED), 8, dt)
      l.object.rotation.y += l.bodySpeed * dt
      l.object.updateMatrixWorld(true)
    } else l.bodySpeed = 0
    frame.copy(l.chest.getWorldQuaternion(q)).multiply(l.frames.get(l.chest))
    l.chestYaw = THREE.MathUtils.damp(l.chestYaw, seated(name) ? THREE.MathUtils.clamp(beyond, -CHEST, CHEST) * 0.8 : 0, 6, dt)
    frame.multiply(q.setFromEuler(rotation.set(0, l.chestYaw, 0)))
    orient(l.chest, l.frames.get(l.chest), frame)

    // Read the clip's head in the chest frame. Replace its yaw/pitch, rather than adding another 70 degrees. The clips
    // swing big heads hard, so what is kept of them (roll, and yaw/pitch with no target) is cut to a third and smoothed.
    q.copy(frame).invert().multiply(l.head.getWorldQuaternion(parent)).multiply(l.frames.get(l.head))
    rotation.setFromQuaternion(q, 'YXZ')
    const roll = l.roll = THREE.MathUtils.damp(l.roll, rotation.z * CLIP, 6, dt)
    l.drift.set(THREE.MathUtils.damp(l.drift.x, rotation.y * CLIP, 6, dt), THREE.MathUtils.damp(l.drift.y, -rotation.x * CLIP, 6, dt))
    desired.copy(l.drift)
    if (target) {
      local.subVectors(target, l.head.getWorldPosition(local)).applyQuaternion(q.copy(frame).invert())
      l.goal.set(Math.atan2(local.x, local.z), Math.atan2(local.y, Math.hypot(local.x, local.z)))
    }
    // Blend between the clip's own gaze and the target's, so one appearing or going leaves no step.
    desired.lerp(l.goal, l.aim = THREE.MathUtils.damp(l.aim, target ? 1 : 0, 6, dt))
    desired.x = THREE.MathUtils.clamp(desired.x, -YAW, YAW)
    desired.y = THREE.MathUtils.clamp(desired.y, -PITCH, PITCH)
    follow(l, dt)
    q.copy(frame).invert().multiply(l.neck.getWorldQuaternion(parent)).multiply(l.frames.get(l.neck))
    rotation.setFromQuaternion(q, 'YXZ')
    const neckRoll = l.neckRoll = THREE.MathUtils.damp(l.neckRoll, rotation.z * CLIP, 6, dt)
    orientation.copy(frame).multiply(q.setFromEuler(rotation.set(-l.angles.y * 0.4, l.angles.x * 0.4, neckRoll)))
    orient(l.neck, l.frames.get(l.neck), orientation)
    orientation.copy(frame).multiply(q.setFromEuler(rotation.set(-l.angles.y, l.angles.x, roll)))
    orient(l.head, l.frames.get(l.head), orientation)
    for (const b of [l.chest, l.neck, l.head]) poses.get(b).result = b.quaternion.clone()
  }
}
