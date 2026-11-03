import * as THREE from 'three/webgpu'
import { scene, webgpu } from './scene.js'
import { model } from './models.js'
import { floating } from './layout.js'
import { player } from './player.js'
import { camera } from './scene.js'
import { game, hop } from './state.js'
import { meanSize, keepOut } from './garden.js'

// Teacups, hats, spoons, plates and pocket watches drifting in the air on paths that never repeat. Teacups
// glide out of Fries's way, hats turn to look at him, everything pulses on the beat of the song, and every
// gear found adds another batch.
const items = []
const density = webgpu ? 1 : 0.5

function add(kind, cloud, size = 0.9 + Math.random() * 0.4) {
  const object = model(kind)
  if (kind === 'hat') {
    // The hat has one textured material (olive cloth with the ribbon painted on) that a colour alone cannot change, so each hat
    // gets its own plain-coloured copy that keeps the normal and roughness maps.
    const tint = floating.hatTints[items.filter(it => it.kind === 'hat').length % floating.hatTints.length]
    object.traverse(o => {
      if (!o.isMesh) return
      o.material = o.material.clone()
      o.material.map = null
      o.material.color.set(tint)
    })
  }
  scene.add(object)
  items.push({
    kind,
    object,
    size, // near real size, varied
    home: new THREE.Vector3(...cloud.center.map((c, k) => c + (Math.random() - 0.5) * cloud.size[k])),
    phase: Math.random() * 100,
    wander: 0.3 + Math.random() * 0.5,
    spin: (Math.random() - 0.5) * 1.2,
    seed: Math.random() * 100,
    extent: meanSize(object),
    away: new THREE.Vector3(),
    grow: 0,
  })
}

export function setFloatingLevel(gearsFound) {
  for (const [kind, perGear] of Object.entries(floating.perGear)) {
    for (let n = items.filter(it => it.kind === kind).length; n < Math.round(perGear * (gearsFound + 1) * density); n++) add(kind, floating.clouds[n % floating.clouds.length])
  }
}
setFloatingLevel(0)
for (const [kind, n] of Object.entries(floating.treats)) for (let i = 0; i < n; i++) add(kind, floating.treatCloud, 1.2 + Math.random() * 0.4)

const chest = new THREE.Vector3(), push = new THREE.Vector3(), offset = new THREE.Vector3(), near = new THREE.Vector3()
let clock = 0

// For a big Fries, two teacups and a spoon drift close by his camera, so the giant sees how small they are.
const ESCORT = [[-1.6, -0.5, -3.2], [1.9, 0.3, -4.2], [0.7, -1.1, -2.6]]
const escorts = () => [...items.filter(it => it.kind === 'teacup').slice(0, 2), items.find(it => it.kind === 'spoon')]
let giant = 0

export function updateFloating(dt) {
  clock += dt * (1 + 0.35 * game.gears) // livelier with each gear
  const s = player.p.scale
  chest.copy(player.feet).setY(player.feet.y + 0.8 * s)
  giant = Math.max(0, Math.min(1, giant + (player.size === 'big' ? dt : -dt) * 0.6))
  const escorting = escorts()
  for (const it of items) {
    const t = clock + it.phase, o = it.object
    it.grow = Math.min(1, it.grow + dt)
    o.position.copy(it.home)
    const e = escorting.indexOf(it)
    if (e >= 0 && giant > 0) o.position.lerp(camera.localToWorld(near.set(...ESCORT[e])), giant * giant * (3 - 2 * giant))
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
    o.rotation.z = Math.sin(t * 0.7) * 0.15 + hop(it.seed, it.extent * it.size, offset)
    o.position.add(offset)
    keepOut(o.position, it.extent * it.size / 2)
    o.scale.setScalar(it.size * it.grow * (1 + 0.3 * game.pulse))
  }
}
