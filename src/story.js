import * as THREE from 'three/webgpu'
import { player, setSize, reaches, facePoint } from './player.js'
import { things, drinks } from './garden.js'
import { setMusic, say } from './audio.js'
import { tween, wait } from './tweens.js'

const prompt = document.getElementById('prompt')
const head = (character, height) => character.localToWorld(new THREE.Vector3(0, height, 0))

// What E can do: { pos, label, can(), use() }. The nearest one in reach is offered.
const uses = drinks.map(d => ({ ...d, can: () => player.size !== d.size, use: () => drink(d) }))
let target, toldAboutTea = false

addEventListener('keydown', e => {
  if (e.code === 'KeyE' && target) target.use()
})

// Starts the chapter. `from` (the ?start= parameter) skips ahead for testing.
export function begin(from) {
  explore()
}

function explore() {
  player.control = true
  player.cinematic = false
  setMusic({ frozen: 1, awake: 0 })
}

async function drink(d) {
  setSize(d.size)
  if (d.size === 'small' && player.shrinks === 1) await firstShrink()
  if (d.size === 'big' && player.grows === 1) await firstGrow()
}

// The first shrink: the Hatter's huge face presses down from the sky.
async function firstShrink() {
  player.control = false
  const hatter = things.hatter
  const seat = hatter.position.clone(), seatYaw = hatter.rotation.y
  const over = seat.clone().lerp(player.feet, 0.5)
  const turn = Math.atan2(player.feet.x - seat.x, player.feet.z - seat.z) - seatYaw
  const lean = t => {
    hatter.position.lerpVectors(seat, over, t)
    hatter.rotation.y = seatYaw + Math.atan2(Math.sin(turn), Math.cos(turn)) * t
    hatter.rotation.x = 0.9 * t
    facePoint(head(hatter, 1.3), 0.2)
  }
  await wait(1.2)
  await tween(1.6, t => lean(t * t * (3 - 2 * t)))
  await say('SZ-01')
  await say('SZ-02')
  await tween(1.2, t => lean(1 - t))
  player.control = true
}

// The first grow: the Hatter and the March Hare shout up from far below.
async function firstGrow() {
  player.control = false
  await wait(1.2)
  await tween(0.8, () => facePoint(head(things.hatter, 1.3), 0.15))
  await say('SZ-03')
  await tween(0.6, () => facePoint(head(things.hare, 1.2), 0.15))
  await say('SZ-04')
  player.control = true
}

export function updateStory(dt) {
  target = undefined
  for (const u of uses) {
    if (player.control && u.can() && reaches(u.pos) && (!target || u.pos.distanceTo(player.feet) < target.pos.distanceTo(player.feet))) target = u
  }
  prompt.textContent = target ? `E  ${target.label}` : ''
  if (target?.model.endsWith('teapot') && !toldAboutTea) {
    toldAboutTea = true
    say('EX-10')
  }
}
