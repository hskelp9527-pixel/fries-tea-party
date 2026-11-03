import * as THREE from 'three/webgpu'
import { RAPIER, world } from './physics.js'
import { renderer, scene, camera } from './scene.js'
import { model } from './models.js'
import { start } from './layout.js'
import { burst, setVoicePitch, currentSpeaker } from './audio.js'
import { Animator, Blink } from './animation.js'
import { tween } from './tweens.js'

const DEG = Math.PI / 180
const HEIGHT = 1.2, RADIUS = 0.3, EYE = 1.1, GRAVITY = 18, RUN = 2.6

// Everything that changes with Fries's size; at scale 1 he is 1.2 m tall. speed is walking speed (Shift runs
// at RUN times that); reach is how far from his body he can take things; voice is the pitch at which he hears
// the others.
const SIZES = {
  small: { scale: 0.18, fov: 82, speed: 0.22, jump: 0.2, reach: 0.3, stepPitch: 2.2, stepGain: 0.25, shake: 0, voice: 0.65 },
  normal: { scale: 1, fov: 70, speed: 1.2, jump: 0.7, reach: 0.9, stepPitch: 1, stepGain: 0.5, shake: 0, voice: 1 },
  big: { scale: 5, fov: 62, speed: 4.2, jump: 2.2, reach: 4.5, stepPitch: 0.3, stepGain: 1, shake: 0.12, voice: 1.6 },
}

const collider = world.createCollider(RAPIER.ColliderDesc.capsule(HEIGHT / 2 - RADIUS, RADIUS))
const controller = world.createCharacterController(0.01)
controller.enableSnapToGround(0.1) // stay on the ground over small bumps instead of floating a frame

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
  nod: 0,
  still: 0, // seconds since Fries last moved
}
scene.add(player.mesh)
// Fries lives on layer 1. First person takes that layer off the camera, while the sun's shadow camera keeps
// it, so he still casts his animated shadow.
player.mesh.traverse(o => o.layers.set(1))
camera.layers.enable(1)
export const anim = new Animator(player.mesh, 'fries')
const blink = new Blink(player.mesh)

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
  last.copy(player.feet)
}
const last = new THREE.Vector3()
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
  // Steps up to 0.25 m (at his size) are walked up, never jumped: the stone steps, the cottage's steps; a big Fries
  // walks up the 0.6 m terraces without stairs. A narrower minimum width fails on 0.2 m steps.
  controller.enableAutostep(0.26 * s, 0.2 * s, false)
  player.mesh.scale.setScalar(s)
  setVoicePitch(player.p.voice)
}

const move = new THREE.Vector3(), eye = new THREE.Vector3(), dir = new THREE.Vector3()
let velY = 0, grounded = false, airTime = 0, gaitSpeed = 0, stride = 0, shake = 0

export function updatePlayer(dt) {
  resize(dt)
  const p = player.p, s = p.scale
  if (player.control) {
    const f = keys.has('KeyW') - keys.has('KeyS'), r = keys.has('KeyD') - keys.has('KeyA')
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw)
    move.set(r * cos - f * sin, 0, -r * sin - f * cos)
    if (f || r) move.normalize().multiplyScalar(p.speed * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : 1))
    if (jump && grounded) velY = Math.sqrt(2 * GRAVITY * p.jump)
    velY -= GRAVITY * dt

    collider.setTranslation({ x: player.feet.x, y: player.feet.y + HEIGHT / 2 * s, z: player.feet.z })
    // On the ground the move is purely sideways (snapping keeps him on it): Rapier's autostep only climbs steps
    // for a move with no downward part. A frame read as not grounded falls a little and lands the next; the
    // jump clip waits out such flickers (see airTime).
    const down = grounded && velY <= 0 ? 0 : velY * dt
    controller.computeColliderMovement(collider, { x: move.x * dt, y: down, z: move.z * dt }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS)
    const m = controller.computedMovement()
    grounded = controller.computedGrounded()
    if (grounded && velY < 0) velY = 0
    player.feet.x += m.x
    player.feet.y += m.y
    player.feet.z += m.z

    const travelled = Math.hypot(m.x, m.z)
    player.still = travelled > 1e-4 * s ? 0 : player.still + dt
    stride += grounded ? travelled : 0
    if (stride > 0.7 * s) {
      stride = 0
      burst(p.stepPitch, p.stepGain)
      shake = p.shake
    }
    if (f || r) {
      const turn = Math.atan2(move.x, move.z) - player.mesh.rotation.y
      player.mesh.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, dt * 12)
    }
  }
  jump = false
  // Per-frame travel is noisy (uneven frames, collision slides) and the grounded flag can drop for a frame:
  // smooth the speed and only count real air time, or the clips stutter and flick to jump.
  airTime = grounded ? 0 : airTime + dt
  gaitSpeed += (Math.hypot(player.feet.x - last.x, player.feet.z - last.z) / dt - gaitSpeed) * Math.min(1, dt * 8)
  animate(dt, gaitSpeed, player.control && (velY > 0 || airTime > 0.12))
  last.copy(player.feet)
  player.mesh.position.copy(player.feet)
  collider.setTranslation({ x: player.feet.x, y: player.feet.y + HEIGHT / 2 * s, z: player.feet.z })
  updateCamera(dt)
}

const ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })
const ball = new RAPIER.Ball(0.1)
const NO_TURN = { x: 0, y: 0, z: 0, w: 1 }

function updateCamera(dt) {
  camera.layers.enable(1)
  if (player.cinematic) return
  const s = player.p.scale
  camera.fov = player.p.fov
  camera.near = 0.04 * s
  camera.updateProjectionMatrix()
  camera.rotation.set(player.pitch, player.yaw, 0)
  eye.copy(player.feet).setY(player.feet.y + EYE * s)
  if (player.view === 'first') {
    camera.position.copy(eye)
    camera.layers.disable(1)
  }
  else {
    // Orbit behind the head. A ball wider than the near plane is swept back from the eye and stops at the
    // first solid, so the camera pulls in toward Fries instead of entering the canopy, a wall or the table.
    const cp = Math.cos(player.pitch)
    dir.set(Math.sin(player.yaw) * cp, -Math.sin(player.pitch), Math.cos(player.yaw) * cp)
    ball.radius = 0.1 * s
    const far = 3.2 * s
    const hit = world.castShape(eye, NO_TURN, dir, ball, 0, far, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, collider)
    const distance = hit ? Math.max(0, hit.timeOfImpact - 0.02 * s) : far
    camera.position.copy(eye).addScaledVector(dir, distance)
  }
  camera.position.x += (Math.random() - 0.5) * shake
  camera.position.y += (Math.random() - 0.5) * shake
  shake *= Math.exp(-dt * 12)
}

let oneShot = null, still = 0

// Plays a one-shot clip such as drink or clap; locomotion takes over again when it ends.
export function act(name) {
  if (!anim.has(name)) return
  oneShot = name
  anim.play(name, true)
}

// Walks Fries to a stand point at walking speed, then turns him to face `rot` degrees.
export async function walkTo([x, y, z], rot) {
  const from = player.feet.clone(), to = new THREE.Vector3(x, y, z), distance = from.distanceTo(to)
  if (distance > 0) player.mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
  await tween(distance / player.p.speed, t => player.feet.lerpVectors(from, to, t))
  const start = player.mesh.rotation.y, turn = rot * DEG - start
  await tween(0.3, t => { player.mesh.rotation.y = start + Math.atan2(Math.sin(turn), Math.cos(turn)) * t })
}

// Locomotion from his real ground speed: idle, walk or run paced so the feet do not slide, jump in the air,
// talk while one of his own lines plays, and a look around after 8 s standing still.
function animate(dt, speed, airborne) {
  const s = player.p.scale
  const moving = speed > 0.1 * s
  still = moving || airborne ? 0 : still + dt
  // Moving cuts a one-shot short (the 6.5 s look_around kept playing while he walked, so he slid standing)
  if (oneShot && (!anim.playing(oneShot) || (player.control && (moving || airborne)))) oneShot = null
  if (!oneShot) {
    if (airborne) anim.play('jump')
    else if (moving) {
      const gait = speed > 1.5 * player.p.speed ? 'run' : 'walk'
      anim.play(gait)
      anim.pace(gait, speed, s)
    } else if (currentSpeaker() === 'fries') anim.play('talk')
    else if (still > 8 && still - dt <= 8) act('look_around')
    else anim.play('idle')
  }
  anim.mixer.update(dt)
  if (player.nod) player.mesh.getObjectByName('mixamorigHead').rotateX(player.nod)
  blink.update(dt, anim.current?.getClip().name.includes('sleep'))
}

// Turns the view toward a point; k below 1 eases part of the way.
export function facePoint(point, k = 1) {
  dir.subVectors(point, eye.copy(player.feet).setY(player.feet.y + EYE * player.p.scale))
  const yaw = Math.atan2(-dir.x, -dir.z), turn = yaw - player.yaw
  player.yaw += Math.atan2(Math.sin(turn), Math.cos(turn)) * k
  player.pitch += (Math.atan2(dir.y, Math.hypot(dir.x, dir.z)) - player.pitch) * k
}

// Whether Fries can take something at `point`: within reach of his body, with nothing solid in between.
export function reaches(point) {
  const s = player.p.scale, f = player.feet
  const y = Math.min(Math.max(point.y, f.y), f.y + HEIGHT * s)
  return Math.hypot(point.x - f.x, point.y - y, point.z - f.z) <= player.p.reach && sees(point)
}

// Whether Fries, at the size a prop is for, is close to it on the level of its stand point and can see it.
export function nearProp(prop, point) {
  const s = player.p.scale, f = player.feet
  return player.size === prop.by && Math.hypot(point.x - f.x, point.z - f.z) < 1.2 * s && Math.abs(f.y - prop.stand[1]) < 0.35 * s && sees(point)
}

// Whether nothing solid lies between Fries's eye and `point`.
function sees(point) {
  const s = player.p.scale, f = player.feet
  eye.copy(f).setY(f.y + EYE * s)
  dir.subVectors(point, eye)
  const length = dir.length()
  ray.origin = eye
  ray.dir = dir.divideScalar(length)
  return world.castRay(ray, length, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, collider) === null
}

