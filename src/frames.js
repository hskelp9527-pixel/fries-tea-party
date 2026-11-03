import * as THREE from 'three/webgpu'
import { camera } from './scene.js'
import { player, placePlayer, setSize, act } from './player.js'
import { things, gears, cups, doors, wake } from './garden.js'
import { roses } from './foliage.js'
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
  s01: { pos: [-2.4, 0.85, -3.5], look: [0, 0.8, -6.9], fov: 52, feet: [-2.09, 0, -5.3], facing: 160 },
  s02: { pos: [-2.9, 1, -6.6], look: [-0.3, 1.25, -8.4], fov: 48, feet: [-2, 0, -7.5], facing: 115, action: 'reach', cast: { hatter: [[-0.4, 0, -8.5], -58], hare: [[1, 0, -8.7], -30] }, props: { pocket_watch: [[-0.65, 1.4, -8.2], 0] } },
  s03: { pos: [0.1, 1.18, -3.8], look: [0.15, 1.05, -6.9], fov: 43, feet: [-1.3, 0, -5.8], facing: 10, cast: { hatter: [[-0.3, 0, -8.3], 0], hare: [[0.8, 0, -8.4], 0], dormouse: [[0.65, 0.76, -7.2], 0] }, props: { pocket_watch: [[0.5, 1.48, -8], 0] }, gearBurst: true },
  s04: { pos: [8, 1.6, 18], look: [8, 4, -14], fov: 65, feet: [5.6, 0, 9.5], facing: 145 },
  s05: { pos: [-0.95, 0.86, -5.25], look: [0, 1.04, -6.8], fov: 46, feet: [-0.3, 0.76, -6.05], facing: 35, size: 'small', cast: { hatter: [[-0.3, 0, -8.3], 0] }, props: { teacup: [[0.15, 0.76, -6.25], 0], pink_teapot: [[0.65, 0.79, -6.1], 0] }, lean: true },
  s06: { pos: [-0.32, 0.12, -1.35], look: [0.05, 0.12, -2.1], fov: 61, feet: [-0.15, 0, -1.85], facing: 140, size: 'small', action: 'walk' },
  s07: { pos: [-0.1, 1.03, -3.7], look: [0.05, 1.03, -6.8], fov: 49, feet: [-1.3, 0, -5.9], facing: 20, action: 'reach', cast: { dormouse: [[0.65, 0.76, -6.8], 0] }, gearHand: true, awake: 1 },
  s08: { pos: [17, 0.13, -5.3], look: [18.1, 0.08, -5], fov: 61, feet: [17.7, 0, -5.1], facing: 90, size: 'small' },
  s09: { pos: [20, 1.5, 17], look: [15, 2.2, -5], fov: 65, feet: [14.2, 0, -2.4], facing: 60, awake: 2 },
  s10: { pos: [22.9, 2.2, -12.8], look: [28.5, 4.5, -22.4], fov: 58, feet: [28.113, 1.8, -20.125], facing: 180, size: 'big', action: 'reach' },
  s11: { pos: [0.4, 0.55, 14.5], look: [4, 1.6, -5.4], fov: 58, feet: [-0.3, 0, 11], facing: 180, action: 'walk', awake: 3 },
  s12: { pos: [-0.48, 0.96, -6.05], look: [-0.5, 0.83, -6.75], fov: 38, feet: [-1.4, 0, -6.1], facing: 100, action: 'reach', gearHand: true, awake: 3 },
  s13: { pos: [-1.5, 1.28, -3.9], look: [0.3, 1.55, -6.5], fov: 55, feet: [-1.45, 0, -5.15], facing: 90, action: 'clap', cast: { hatter: [[-0.1, 0.76, -6.3], 0], hare: [[2.5, 0, -7.4], 0], dormouse: [[0.3, 0.76, -6.9], 0] }, awake: 3, dance: true },
  s14: { pos: [0, 4.6, 14], look: [7, 3, -9], fov: 66, feet: [-1.45, 0, -4.2], facing: 90, action: 'clap', cast: { hatter: [[-0.1, 0.76, -6.3], 0], hare: [[2.5, 0, -7.4], 0], dormouse: [[0.3, 0.76, -6.9], 0] }, awake: 3, dance: true },
  s15: { pos: [-4, 1.2, -5.8], look: [-3.4, 1.3, -9.8], fov: 75, feet: [-4.4, 0, -8.6], facing: 200, action: 'reach', cast: { hatter: [[-2, 0, -9.6], -45], hare: [[-1, 0, -9.8], -45], dormouse: [[-0.6, 0.9, -7.5], 0] }, awake: 3, ending: true, props: { book_page: [[-4.3, 1.45, -8.3], 0], pink_teapot: [[-0.6, 0.76, -7.5], 0] } },
  s16: { pos: [-6.6, 1.5, -8.6], look: [-3.2, 1.3, -14.5], fov: 75, feet: [-5.36, 0, -10.79], facing: 150, cast: { hatter: [[-4, 0, -8.6], -60], hare: [[-3.2, 0, -9.2], -60], dormouse: [[-0.6, 0.9, -7.5], 0] }, awake: 3, ending: true, roses: true, props: { pink_teapot: [[-0.6, 0.76, -7.5], 0] } },
  fp_small: { pos: [-0.36, 0.95, -5.95], look: [-0.1, 1.35, -6.95], fov: 80, feet: [-0.36, 0.76, -5.95], facing: 180, size: 'small', first: true, cast: { hatter: [[-0.3, 0, -8.3], 0] }, lean: true, props: { teacup: [[0.15, 0.76, -6.3], 0] } },
  fp_giant: { pos: [-1.1, 2.86, -4.2], look: [0.3, 0.75, -6.6], fov: 70, feet: [-2, 0, -4.2], facing: 150, size: 'big', first: true },
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
    doors.tree.pivot.rotation.y = 100 * DEG
  }
  if (f.roses) {
    roses.visible = true
    doors.tree.unplug()
  }
  camera.fov = f.fov
  camera.near = f.size === 'small' ? 0.01 : 0.05
  camera.updateProjectionMatrix()
  camera.position.set(...f.pos)
  camera.lookAt(...f.look)
}
