import * as THREE from 'three/webgpu'
import { camera } from './scene.js'
import { player, placePlayer, setSize, act } from './player.js'
import { things, gears, cups, wake } from './garden.js'
import { setFloatingLevel } from './floating.js'
import { cast } from './cast.js'
import { hold } from './hands.js'
import { turnPink } from './story.js'
import { game } from './state.js'

const DEG = Math.PI / 180

// ?frame=<id> stages one of the visual review's eighteen frames (docs/review-2026-11-03.md) and holds it: the
// camera (position, look target, vertical fov), Fries (feet, facing, size, a clip, first person hiding him),
// the cast and props at [position, facing], how many gears are back (`awake`), and the story beats a frame shows
// (the Hatter leaning over a small Fries, the gears bursting from the watch, a gear in Fries's hand, the hosts
// dancing, 6:01 with the door open and the roses).
export const frames = {
  s01: { pos: [-2.4, 0.85, -3.5], look: [0, 0.8, -6.9], fov: 52, feet: [-2.09, 0, -5.3], facing: 160, cast: { hatter: [[0, 0, -6.8], 0], hare: [[1.35, 0, -7.4], 0] } },
  s02: { pos: [-1.8, 0.95, -5.1], look: [-0.05, 1.15, -7], fov: 48, feet: [-1.46, 0, -6.54], facing: 155, action: 'reach', cast: { hatter: [[-0.3, 0, -7], 0], hare: [[1.15, 0, -7.4], 0] }, props: { pocket_watch: [[-0.35, 1.4, -6.65], 0] } },
  s03: { pos: [0.1, 1.18, -3.8], look: [0.15, 1.05, -6.9], fov: 43, feet: [-0.85, 0, -6.7], facing: 10, cast: { hatter: [[0.15, 0, -7.2], 0], hare: [[1.35, 0, -7.2], 0], dormouse: [[0.65, 0.76, -6.6], 0] }, props: { pocket_watch: [[1.15, 1.48, -6.9], 0] }, gearBurst: true },
  s04: { pos: [-4, 1.15, -8.6], look: [1.5, 1.2, -9.8], fov: 65, feet: [-2, 0, -9.8], facing: 90 },
  s05: { pos: [-0.95, 0.86, -5.25], look: [0, 1.04, -6.8], fov: 46, feet: [-0.3, 0.75, -6.05], facing: 35, size: 'small', cast: { hatter: [[0, 0, -7.1], 0] }, props: { teacup: [[0.15, 0.75, -6.25], 0], pink_teapot: [[0.65, 0.77, -6.1], 0] }, lean: true },
  s06: { pos: [-0.32, 0.12, -1.35], look: [0.05, 0.12, -2.1], fov: 61, feet: [-0.15, 0, -1.85], facing: 140, size: 'small', action: 'walk' },
  s07: { pos: [-0.1, 1.03, -3.7], look: [0.05, 1.03, -6.8], fov: 49, feet: [-0.3, 0, -6.55], facing: 0, action: 'reach', cast: { hatter: [[-1.25, 0, -6.8], 0], hare: [[1.3, 0, -7.4], 0], dormouse: [[0.65, 0.76, -6.8], 0] }, gearHand: true, awake: 1 },
  s08: { pos: [6.45, 0.13, -3.4], look: [7.1, 0.1, -3], fov: 61, feet: [6.8, 0, -3.3], facing: 60, size: 'small' },
  s09: { pos: [2.3, 1.2, 1.3], look: [7, 1.4, -3], fov: 63, feet: [3.6, 0, -2], facing: 45, awake: 2 },
  s10: { pos: [-3.4, 1.7, -7.2], look: [-8.5, 3.1, -2.8], fov: 58, feet: [-6.09, 1.2, -3.03], facing: 225, size: 'big', action: 'reach' },
  s11: { pos: [5.8, 0.55, 5.3], look: [1.5, 1, -4], fov: 50, feet: [3.9, 0, 2], facing: 30, action: 'walk', awake: 3 },
  s12: { pos: [-0.48, 0.96, -6.05], look: [-0.5, 0.83, -6.75], fov: 38, feet: [-1.15, 0, -6.5], facing: 90, action: 'reach', cast: { hatter: [[-0.35, 0, -7.25], 0] }, gearHand: true, awake: 3 },
  s13: { pos: [-1.5, 1.28, -3.9], look: [0.3, 1.55, -6.5], fov: 55, feet: [-1.45, 0, -5.15], facing: 90, action: 'clap', cast: { hatter: [[-0.1, 0.75, -6.3], 0], hare: [[1.35, 0.4, -7.1], 0], dormouse: [[0.55, 1.05, -6.8], 0] }, awake: 3, dance: true },
  s14: { pos: [-4.5, 4.1, 2.7], look: [0, 1.1, -4], fov: 62, feet: [-1.15, 0, -4.2], facing: 90, action: 'clap', cast: { hatter: [[-0.1, 0.75, -6.3], 0], hare: [[1.35, 0.4, -7.1], 0], dormouse: [[0.55, 1.05, -6.8], 0] }, awake: 3, dance: true },
  s15: { pos: [-1.8, 1.1, -7.9], look: [0.4, 1.2, -9.4], fov: 75, feet: [-1.2, 0, -9.4], facing: 25, action: 'reach', cast: { hatter: [[0.5, 0, -9], -45], hare: [[1.6, 0, -9.4], -45], dormouse: [[1.3, 0.76, -8.9], 0] }, awake: 3, ending: true, props: { book_page: [[-1.1, 1.45, -9.2], 0] } },
  s16: { pos: [0, 1.35, -7.6], look: [0.6, 1.4, -10.2], fov: 75, feet: [0, 0.45, -10.1], facing: 180, cast: { hatter: [[1.15, 0, -9.1], 0], hare: [[2.05, 0, -9.5], 0], dormouse: [[1.7, 1, -8.6], 0] }, awake: 3, ending: true, roses: true, props: { pink_teapot: [[1.7, 0.75, -8.6], 0] } },
  fp_small: { pos: [-0.36, 0.95, -5.95], look: [-0.1, 1.35, -6.95], fov: 80, feet: [-0.36, 0.75, -5.95], facing: 180, size: 'small', first: true, cast: { hatter: [[0, 0, -7.1], 0] }, lean: true, props: { teacup: [[0.15, 0.75, -6.3], 0] } },
  fp_giant: { pos: [-1.1, 2.86, -4.2], look: [0.3, 0.75, -6.6], fov: 70, feet: [-1.1, 0, -4.2], facing: 150, size: 'big', first: true, cast: { hatter: [[-1.35, 0, -6.8], 150], hare: [[1.35, 0, -7.4], 220] } },
}

const prop = name => name === 'teacup' ? cups[0] : things[name]

export function stageFrame(id) {
  const f = frames[id]
  player.control = false
  player.cinematic = true
  game.gears = f.awake ?? 0
  for (const g of gears.slice(0, game.gears)) {
    g.found = true
    g.object.visible = false
    wake(g.layer)
  }
  setFloatingLevel(game.gears)
  if (f.size) setSize(f.size, 0)
  player.view = f.first ? 'first' : 'third'
  if (f.first) camera.layers.disable(1)
  placePlayer(f.feet, f.facing)
  if (f.action) act(f.action)
  for (const [name, [pos, rot]] of Object.entries(f.cast ?? {})) {
    cast[name].seated = false
    cast[name].object.position.set(...pos)
    cast[name].object.rotation.y = rot * DEG
  }
  for (const [name, [pos, rot]] of Object.entries(f.props ?? {})) {
    prop(name).position.set(...pos)
    prop(name).rotation.y = rot * DEG
  }
  if (f.dance) game.pass = 2
  if (f.lean) {
    const hatter = cast.hatter.object
    hatter.rotation.y = Math.atan2(player.feet.x - hatter.position.x, player.feet.z - hatter.position.z)
    hatter.rotation.x = 0.9
    hatter.position.lerp(player.feet, 0.35).setY(0)
  }
  if (f.gearBurst) {
    const watch = things.pocket_watch.position
    gears.forEach((g, i) => {
      g.object.visible = true
      g.object.position.copy(watch).add(new THREE.Vector3(Math.cos(i * 2.1) * 0.35, 0.15 + i * 0.12, Math.sin(i * 2.1) * 0.35))
    })
  }
  if (f.gearHand) {
    gears[0].object.visible = true
    hold(gears[0].object, gears[2])
  }
  if (f.ending) {
    turnPink(1)
    things.tree_door.rotation.y = -100 * DEG
  }
  if (f.roses) things.roses.visible = true
  camera.fov = f.fov
  camera.near = f.size === 'small' ? 0.01 : 0.05
  camera.updateProjectionMatrix()
  camera.position.set(...f.pos)
  camera.lookAt(...f.look)
}
