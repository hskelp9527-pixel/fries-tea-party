import * as THREE from 'three/webgpu'
import { RAPIER, world } from './physics.js'
import { renderer, scene, camera } from './scene.js'
import { model } from './models.js'
import { start } from './layout.js'

const DEG = Math.PI / 180
const HEIGHT = 1.2, RADIUS = 0.3, EYE = 1.1, GRAVITY = 18

// Everything that changes with Fries's size; at scale 1 he is 1.2 m tall. reach is how far from his body he
// can take things; voice is the pitch at which he hears the others.
export const SIZES = {
  small: { scale: 0.18, fov: 82, speed: 1.1, jump: 0.2, reach: 0.3, stepPitch: 2.2, stepGain: 0.25, shake: 0, voice: 0.65 },
  normal: { scale: 1, fov: 70, speed: 3.2, jump: 0.7, reach: 0.9, stepPitch: 1, stepGain: 0.5, shake: 0, voice: 1 },
  big: { scale: 2.6, fov: 58, speed: 6.5, jump: 1.2, reach: 2.2, stepPitch: 0.45, stepGain: 1, shake: 0.07, voice: 1.45 },
}

const collider = world.createCollider(RAPIER.ColliderDesc.capsule(HEIGHT / 2 - RADIUS, RADIUS))
const controller = world.createCharacterController(0.01)

export const player = {
  feet: new THREE.Vector3(),
  yaw: 0, // camera yaw; 0 looks north (-Z)
  pitch: -0.15,
  size: 'normal',
  p: { ...SIZES.normal }, // current values, eased from one size to the next
  view: 'third',
  control: false, // input moves Fries
  cinematic: true, // a cutscene owns the camera
  mesh: model('fries'),
  shrinks: 0,
  grows: 0,
  still: 0, // seconds since Fries last moved
}
scene.add(player.mesh)

const keys = new Set()
let jump = false
addEventListener('keydown', e => {
  keys.add(e.code)
  if (e.code === 'Space') jump = true
  if (e.code === 'KeyV' && player.control) player.view = player.view === 'first' ? 'third' : 'first'
})
addEventListener('keyup', e => keys.delete(e.code))
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement || !player.control) return
  player.yaw -= e.movementX * 0.0022
  player.pitch = Math.min(1.3, Math.max(-1.3, player.pitch - e.movementY * 0.0022))
})

export function placePlayer(pos, rot) {
  player.feet.set(...pos)
  player.yaw = (rot - 180) * DEG
  player.mesh.rotation.y = rot * DEG
  player.mesh.position.copy(player.feet)
}
placePlayer(start.pos, start.rot)

let from = SIZES.normal, ease = 0, duration = 0

export function setSize(size, seconds = 1.2) {
  from = { ...player.p }
  ease = 0
  duration = seconds
  player.size = size
  // The first shrink and the first grow cut to first person; after that the view stays as the player left it.
  if (size === 'small' && ++player.shrinks === 1) player.view = 'first'
  if (size === 'big' && ++player.grows === 1) player.view = 'first'
}

function resize(dt) {
  if (ease >= 1) return
  ease = Math.min(1, ease + dt / duration)
  const k = ease * ease * (3 - 2 * ease)
  const to = SIZES[player.size]
  for (const key in to) player.p[key] = from[key] + (to[key] - from[key]) * k
  const s = player.p.scale
  collider.setHalfHeight((HEIGHT / 2 - RADIUS) * s)
  collider.setRadius(RADIUS * s)
  controller.setOffset(0.01 * s)
  controller.enableSnapToGround(0.3 * s)
  controller.enableAutostep(0.3 * s, 0.05 * s, false)
  player.mesh.scale.setScalar(s)
}

const move = new THREE.Vector3(), eye = new THREE.Vector3(), dir = new THREE.Vector3()
let velY = 0, grounded = false, shake = 0

export function updatePlayer(dt) {
  resize(dt)
  const p = player.p, s = p.scale
  if (player.control) {
    const f = keys.has('KeyW') - keys.has('KeyS'), r = keys.has('KeyD') - keys.has('KeyA')
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw)
    move.set(r * cos - f * sin, 0, -r * sin - f * cos)
    if (f || r) move.normalize().multiplyScalar(p.speed * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.8 : 1))
    if (jump && grounded) velY = Math.sqrt(2 * GRAVITY * p.jump)
    velY -= GRAVITY * dt

    collider.setTranslation({ x: player.feet.x, y: player.feet.y + HEIGHT / 2 * s, z: player.feet.z })
    controller.computeColliderMovement(collider, { x: move.x * dt, y: velY * dt, z: move.z * dt })
    const m = controller.computedMovement()
    grounded = controller.computedGrounded()
    if (grounded && velY < 0) velY = 0
    player.feet.x += m.x
    player.feet.y += m.y
    player.feet.z += m.z

    const travelled = Math.hypot(m.x, m.z)
    player.still = travelled > 1e-4 * s ? 0 : player.still + dt
    if (f || r) {
      const turn = Math.atan2(move.x, move.z) - player.mesh.rotation.y
      player.mesh.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 12)
    }
  }
  jump = false
  player.mesh.position.copy(player.feet)
  collider.setTranslation({ x: player.feet.x, y: player.feet.y + HEIGHT / 2 * s, z: player.feet.z })
  updateCamera(dt)
}

const ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })
const ball = new RAPIER.Ball(0.1)
const NO_TURN = { x: 0, y: 0, z: 0, w: 1 }

function updateCamera(dt) {
  player.mesh.visible = player.cinematic || player.view === 'third'
  if (player.cinematic) return
  const s = player.p.scale
  camera.fov = player.p.fov
  camera.near = 0.04 * s
  camera.updateProjectionMatrix()
  camera.rotation.set(player.pitch, player.yaw, 0)
  eye.copy(player.feet).setY(player.feet.y + EYE * s)
  if (player.view === 'first') camera.position.copy(eye)
  else {
    // Orbit behind the head. A ball wider than the near plane is swept back from the eye and stops at the
    // first solid, so the camera pulls in toward Fries instead of entering the canopy, a wall or the table.
    const cp = Math.cos(player.pitch)
    dir.set(Math.sin(player.yaw) * cp, -Math.sin(player.pitch), Math.cos(player.yaw) * cp)
    ball.radius = 0.1 * s
    const far = 3.2 * s
    const hit = world.castShape(eye, NO_TURN, dir, ball, 0, far, true, undefined, undefined, collider)
    const distance = hit ? hit.time_of_impact : far
    camera.position.copy(eye).addScaledVector(dir, distance)
    player.mesh.visible = distance > 0.6 * s
  }
  camera.position.x += (Math.random() - 0.5) * shake
  camera.position.y += (Math.random() - 0.5) * shake
  shake *= Math.exp(-dt * 12)
}

// Whether Fries can take something at `point`: within reach of his body, with nothing solid in between.
export function reaches(point) {
  const s = player.p.scale, f = player.feet
  const y = Math.min(Math.max(point.y, f.y), f.y + HEIGHT * s)
  if (Math.hypot(point.x - f.x, point.y - y, point.z - f.z) > player.p.reach) return false
  eye.copy(f).setY(f.y + EYE * s)
  dir.subVectors(point, eye)
  const length = dir.length()
  ray.origin = eye
  ray.dir = dir.divideScalar(length)
  return world.castRay(ray, length, true, undefined, undefined, collider) === null
}
