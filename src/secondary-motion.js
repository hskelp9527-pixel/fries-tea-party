import * as THREE from 'three/webgpu'
import { voiceLevel } from './audio.js'

const characters = new Map()
const velocity = new THREE.Vector3(), scale = new THREE.Vector3(), inverse = new THREE.Quaternion(), wobble = new THREE.Quaternion()
let clock = 0

export function registerCharacterMotion(root, name) {
  if (characters.has(root)) return
  const chains = [], mouths = []
  root.traverse(object => {
    if (object.isBone && object.name.startsWith('secondary_')) {
      const ear = object.name.includes('ear'), tail = object.name.includes('tail')
      chains.push({ object, rest: object.quaternion.clone(), angle: new THREE.Vector2(), speed: new THREE.Vector2(),
        stiffness: ear ? 80 : tail ? 110 : 150, damping: ear ? 0.78 : 0.9,
        limit: ear ? 0.28 : tail ? 0.22 : 0.13, phase: chains.length * 2.39996 })
    }
    const index = object.morphTargetDictionary?.mouth_open
    if (index !== undefined) mouths.push({ object, index })
  })
  characters.set(root, { root, name, chains, mouths, mouth: 0, position: root.getWorldPosition(new THREE.Vector3()), yaw: root.rotation.y })
}

export function updateCharacterMotion(dt) {
  clock += dt
  const stepCount = Math.max(1, Math.ceil(dt / (1 / 60))), step = dt / stepCount
  for (const character of characters.values()) {
    const { root } = character
    if (!root.parent) continue
    root.updateWorldMatrix(true, false)
    const position = root.getWorldPosition(new THREE.Vector3()), size = root.getWorldScale(scale).x
    velocity.subVectors(position, character.position).divideScalar(Math.max(dt * size, 0.001))
    velocity.applyQuaternion(root.getWorldQuaternion(inverse).invert()).clampLength(0, 12)
    const yaw = Math.atan2(Math.sin(root.rotation.y - character.yaw), Math.cos(root.rotation.y - character.yaw)) / Math.max(dt, 0.001)
    for (const chain of character.chains) {
      const targetX = THREE.MathUtils.clamp(-velocity.z * 0.023 + Math.sin(clock * 1.6 + chain.phase) * 0.012, -chain.limit, chain.limit)
      const targetY = THREE.MathUtils.clamp(velocity.x * 0.026 - yaw * 0.015 + Math.sin(clock * 1.2 + chain.phase) * 0.01, -chain.limit, chain.limit)
      const damping = 2 * Math.sqrt(chain.stiffness) * chain.damping
      for (let n = 0; n < stepCount; n++) {
        chain.speed.x += ((targetX - chain.angle.x) * chain.stiffness - chain.speed.x * damping) * step
        chain.speed.y += ((targetY - chain.angle.y) * chain.stiffness - chain.speed.y * damping) * step
        chain.angle.addScaledVector(chain.speed, step)
      }
      wobble.setFromEuler(new THREE.Euler(chain.angle.x, 0, chain.angle.y))
      chain.object.quaternion.copy(chain.rest).multiply(wobble)
    }
    const level = THREE.MathUtils.clamp(Math.max(voiceLevel(character.name),root.userData.biteExpression??0), 0, 1)
    character.mouth += (level - character.mouth) * (1 - Math.exp(-dt / (level > character.mouth ? 0.035 : 0.11)))
    for (const { object, index } of character.mouths) object.morphTargetInfluences[index] = character.mouth
    character.position.copy(position)
    character.yaw = root.rotation.y
    root.updateWorldMatrix(false, true)
  }
}

export const characterMotionStatus = () => [...characters.values()].filter(character => character.root.parent)
  .map(character => ({ character: character.name, springBones: character.chains.length, mouthMorphs: character.mouths.length, mouth: character.mouth }))
