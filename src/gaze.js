import * as THREE from 'three/webgpu'
import { cast } from './cast.js'
import { player } from './player.js'

// Gaze: each character's head and neck turn to what it looks at, up to about 70 degrees to either side and 30 up or
// down, easing there over about 0.3 s. Past that a standing character turns its body; a seated one turns its
// chest a little. Targets are points that may move (Vector3s), or null to look ahead.
const DEG = Math.PI / 180, YAW = 70 * DEG, PITCH = 30 * DEG, CHEST = 20 * DEG
const bone = (object, name) => object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(`mixamorig:${name}`))
const lookers = Object.fromEntries([...Object.values(cast).map(m => [m.name, m.object]), ['fries', player.mesh]].map(([name, object]) => [name, {
  object, head: bone(object, 'Head'), neck: bone(object, 'Neck'), chest: bone(object, 'Spine2'), yaw: 0, pitch: 0, target: null,
}]))

// Where a character's head is now, for others to look at.
export const headOf = (name, target = new THREE.Vector3()) => lookers[name].head.getWorldPosition(target)

export function lookAt(name, target) {
  lookers[name].target = target
}

const q = new THREE.Quaternion(), turn = new THREE.Quaternion(), parent = new THREE.Quaternion(), local = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3()

// Turns a bone by `yaw` about the world's up and `pitch` about the character's sideways axis, on top of its clip.
function twist(b, yaw, pitch, facing) {
  side.set(Math.cos(facing), 0, -Math.sin(facing))
  turn.setFromAxisAngle(up, yaw).multiply(q.setFromAxisAngle(side, -pitch))
  b.getWorldQuaternion(q).premultiply(turn)
  b.parent.getWorldQuaternion(parent).invert()
  b.quaternion.copy(parent.multiply(q))
  b.updateMatrixWorld(true)
}

// After the clips have posed everyone: ease each head towards its target and turn the bones.
export function updateGaze(dt, seated) {
  const ease = 1 - Math.exp(-dt * 10) // about 95% of the way in 0.3 s
  for (const [name, l] of Object.entries(lookers)) {
    if (!l.head) continue
    l.object.updateMatrixWorld(true)
    let yaw = 0, pitch = 0
    const facing = l.object.rotation.y
    if (l.target) {
      local.subVectors(l.target, l.head.getWorldPosition(local)).applyAxisAngle(up, -facing)
      yaw = Math.atan2(local.x, local.z)
      pitch = Math.atan2(local.y, Math.hypot(local.x, local.z))
    }
    // Past the neck's reach: a standing character turns towards the target, a seated one turns its chest.
    const beyond = Math.sign(yaw) * Math.max(0, Math.abs(yaw) - YAW)
    if (beyond && !seated(name)) l.object.rotation.y += beyond * ease * 0.5
    l.yaw += (Math.max(-YAW, Math.min(YAW, yaw)) - l.yaw) * ease
    l.pitch += (Math.max(-PITCH, Math.min(PITCH, pitch)) - l.pitch) * ease
    if (seated(name) && l.chest) twist(l.chest, Math.sign(beyond) * Math.min(CHEST, Math.abs(beyond)) * 0.8, 0, facing)
    if (l.neck) twist(l.neck, l.yaw * 0.4, l.pitch * 0.4, facing)
    twist(l.head, l.yaw * 0.6, l.pitch * 0.6, facing)
  }
}
