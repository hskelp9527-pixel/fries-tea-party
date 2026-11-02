import * as THREE from 'three/webgpu'
import { scene, webgpu } from './scene.js'
import { model } from './models.js'
import { floating } from './layout.js'
import { player } from './player.js'
import { game } from './state.js'

// Teacups and hats drifting in the air on paths that never repeat. They glide out of Fries's way, hats turn
// to look at him, everything pulses on the beat of the song, and every gear found adds another batch.
const items = []
const density = webgpu ? 1 : 0.5

function add(kind, n) {
  const cloud = floating.clouds[n % floating.clouds.length]
  const object = model(kind)
  scene.add(object)
  items.push({
    kind,
    object,
    size: kind === 'teacup' ? 1 + Math.random() * 0.4 : 0.9 + Math.random() * 0.3, // near real size, varied
    home: new THREE.Vector3(...cloud.center.map((c, k) => c + (Math.random() - 0.5) * cloud.size[k])),
    phase: Math.random() * 100,
    wander: 0.3 + Math.random() * 0.5,
    spin: (Math.random() - 0.5) * 1.2,
    away: new THREE.Vector3(),
    grow: 0,
  })
}

export function setFloatingLevel(gearsFound) {
  const count = kind => items.filter(it => it.kind === kind).length
  for (let n = count('teacup'); n < Math.round(floating.cups * (gearsFound + 1) * density); n++) add('teacup', n)
  for (let n = count('hat'); n < Math.round(floating.hats * (gearsFound + 1) * density); n++) add('hat', n)
}
setFloatingLevel(0)

// Whether a teacup is dodging Fries right now.
export const cupDodging = () => items.some(it => it.kind === 'teacup' && it.away.lengthSq() > 0.04 * player.p.scale ** 2)

const chest = new THREE.Vector3(), push = new THREE.Vector3()
let clock = 0

export function updateFloating(dt) {
  clock += dt * (1 + 0.35 * game.gears) // livelier with each gear
  const s = player.p.scale
  chest.copy(player.feet).setY(player.feet.y + 0.8 * s)
  for (const it of items) {
    const t = clock + it.phase, o = it.object
    it.grow = Math.min(1, it.grow + dt)
    o.position.copy(it.home)
    o.position.x += Math.sin(t * 0.31) * it.wander
    o.position.y += Math.sin(t * 0.53) * it.wander * 0.4
    o.position.z += Math.cos(t * 0.27) * it.wander
    push.subVectors(o.position, chest)
    const d = push.length(), clear = 0.6 + 0.8 * s
    if (it.kind === 'teacup') {
      push.setLength(d < clear ? (clear - d) * 1.5 : 0)
      it.away.lerp(push, Math.min(1, dt * 4))
      o.position.add(it.away)
      o.rotation.y += it.spin * dt
    } else if (d < 6) {
      const look = Math.atan2(-push.x, -push.z) - o.rotation.y
      o.rotation.y += Math.atan2(Math.sin(look), Math.cos(look)) * Math.min(1, dt * 3)
    } else o.rotation.y += it.spin * dt
    o.rotation.z = Math.sin(t * 0.7) * 0.15
    o.scale.setScalar(it.size * it.grow * (1 + 0.3 * game.pulse))
  }
}
