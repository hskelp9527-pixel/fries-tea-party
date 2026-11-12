import * as THREE from 'three/webgpu'
import { camera, lens } from './scene.js'
import { player, placePlayer, setSize, act, anim } from './player.js'
import { things, gears, cups, doors, wake } from './garden.js'
import { roses } from './foliage.js'
import { setFloatingLevel } from './floating.js'
import { cast, sampleActorPose } from './cast.js'
import { hold, holdCast } from './hands.js'
import { turnPink } from './story.js'
import { game } from './state.js'
import { setHandTarget } from './contact-ik.js'
import { song, repair } from './layout.js'
import { centreProp } from './prop-staging.js'

const DEG = Math.PI / 180

// ?frame=<id> stages one of the visual review's eighteen frames (docs/review-2026-11-03.md) and holds it: the
// camera (position, look target, vertical fov), Fries (feet, facing, size, a clip, first person hiding him),
// the cast and props at [position, facing], how many gears are back (`awake`), and the story beats a frame shows
// (the Hatter leaning over a small Fries, the gears bursting from the watch, a gear in Fries's hand, the hosts
// dancing, 6:01 with the door open and the roses).
export const frames = {
  s01: { pos: [-2.4, 0.85, -3.5], look: [0, 0.8, -6.9], fov: 52, feet: [-2.09, 0, -5.3], facing: 160 },
  s02: { pos: [-2.9, 1, -6.6], look: [-0.3, 1.25, -8.4], fov: 48, feet: [-2, 0, -7.5], facing: 115, action: 'reach', cast: { hatter: [[-0.4, 0, -8.5], -58], hare: [[1, 0, -8.7], -30] }, props: { pocket_watch: [[-0.65, 1.4, -8.2], 0] } },
  s03: { pos: [0.1, 1.18, -3.8], look: [0.15, 1.05, -6.9], fov: 43, feet: [-1.3, 0, -5.8], facing: 10, cast: { hatter: [[-0.3, 0, -8.3], 0], hare: [[0.8, 0, -8.4], 0], dormouse: [[0.1, 0.78495, -7.15], -60] }, props: { pocket_watch: [[0.5, 1.48, -8], 0] }, gearBurst: true },
  s04: { pos: [8, 1.6, 18], look: [8, 4, -14], fov: 65, feet: [5.6, 0, 9.5], facing: 145 },
  s05: { pos: [-1.2,.25,-4.3], look: [-2.25,.85,-5.55], fov: 70, feet: [-1.45,0,-5.55], facing: -90, size: 'small', lean: true },
  s06: { pos: [-0.32, 0.12, -1.35], look: [0.05, 0.12, -2.1], fov: 61, feet: [-0.15, 0, -1.85], facing: 140, size: 'small', action: 'walk' },
  s07: { pos: [-0.1, 1.03, -3.7], look: [0.05, 1.03, -6.8], fov: 49, feet: [-1.3, 0, -5.9], facing: 20, action: 'reach', cast: { dormouse: [[0.1, 0.78495, -7.15], -60] }, gearHand: true, awake: 1 },
  s08: { pos: [16.9,0.16,-5], look: [18.2,0.09,-5], fov: 61, feet: [17.7, 0, -5.1], facing: 90, size: 'small' },
  s09: { pos: [13.5,1.45,.5], look: [18,1.05,-5], fov: 58, feet: [16.7,0,-3.5], facing: 60, awake: 2 },
  s10: { pos: [4.2,2.8,-2.3], look: [-4.4,3.2,-10.7], fov: 58, feet: [-4.48,0,-9.5], facing: -158, size: 'big', action: 'reach',gearHand:true,awake:1 },
  s11: { pos: [0.4, 0.55, 14.5], look: [4, 1.6, -5.4], fov: 58, feet: [-0.3, 0, 11], facing: 180, action: 'walk', awake: 3 },
  s12: { pos: repair.camera, look: repair.centre, fov: 42, feet: [-2.5,0,-6.05], facing: 180, action: 'mend',cast:{hatter:[[-2.5,0,-6.85],0]},repair:true,awake:3 },
  s13: { pos: [-1.5, 1.28, -3.9], look: [0.3, 1.55, -6.5], fov: 55, feet: [-1.45, 0, -5.15], facing: 90, action: 'clap', cast: { hatter: [[-0.1, 0.76, -6.3], 0], hare: [[2.5, 0, -7.4], 0], dormouse: [[0.1, 0.78495, -7.15], -60] }, awake: 3, dance: true },
  s14: { ...song.overview, feet: song.fries.pos, facing: song.overview.friesRot, action: 'clap', cast: { hatter: [[-0.1, 0.76, -6.3], 0], hare: [[2.5, 0, -7.4], 0], dormouse: [[0.1, 0.78495, -7.15], -60] }, awake: 3, dance: true },
  s15: { pos: [-5.78, 1.2, -7.69], look: [-5.18, 1.3, -11.69], fov: 75, feet: [-6.18, 0, -10.49], facing: 200, action: 'reach', pageHand:true, cast: { hatter: [[-3.78, 0, -11.49], -45], hare: [[-2.78, 0, -11.69], -45], dormouse: [[-0.6, 0.9, -7.5], 0] }, awake: 3, ending: true, props: { pink_teapot: [[-0.6, 0.76, -7.5], 0] } },
  s16: { pos: [-8.38, 1.5, -10.49], look: [-4.98, 1.3, -16.39], fov: 75, feet: [-7.14, 0, -12.68], facing: 150, cast: { hatter: [[-5.78, 0, -10.49], -60], hare: [[-4.98, 0, -11.09], -60], dormouse: [[-0.6, 0.9, -7.5], 0] }, awake: 3, ending: true, roses: true, props: { pink_teapot: [[-0.6, 0.76, -7.5], 0] } },
  fp_small: { pos: [-1.45,.198,-5.55], look: [-2.55,1.45,-5.55], fov: 82, feet: [-1.45,0,-5.55], facing: -90, size: 'small', first: true, lean: true },
  fp_giant: { pos: [4,5.5,2], look: [0,.76,-5.8], fov: 62, feet: [4,0,2], facing: -152, size: 'big', first: true },
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
    const member=cast.hatter,hatter=member.object
    hatter.position.copy(player.feet).add(new THREE.Vector3(-1.1,-player.feet.y,0))
    hatter.rotation.set(0,Math.atan2(player.feet.x-hatter.position.x,player.feet.z-hatter.position.z),0)
    member.doing='lean_over';sampleActorPose('hatter','lean_over',3,false)
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
    anim.current.stopFading().setEffectiveWeight(1);anim.current.time=4;anim.hold('reach');anim.mixer.update(0);anim.standLowerBody()
  }
  if(f.repair){
    cast.hatter.doing='mend';sampleActorPose('hatter','mend',9.27,false)
    anim.current.stopFading().setEffectiveWeight(1);anim.current.time=9.27;anim.hold('mend');anim.mixer.update(0);anim.standLowerBody()
    const watch=things.pocket_watch,work=new THREE.Vector3(...repair.centre);watch.position.copy(work);watch.scale.multiplyScalar(repair.scale);watch.rotation.set(-Math.PI/2,0,0);centreProp(watch,work)
    for(const actor of [player.mesh,cast.hatter.object])for(const side of ['left','right']){
      const[x,y,z]=repair.hands[actor===player.mesh?'fries':'hatter']
      setHandTarget(actor,side,'review-watch',target=>target.copy(work).add(new THREE.Vector3((side==='left'?-1:1)*x,y,z)),1)
    }
  }
  if(f.pageHand){
    anim.current.stopFading().setEffectiveWeight(1);anim.current.time=4;anim.hold('reach');anim.mixer.update(0);anim.standLowerBody()
    things.book_page.visible=true;hold(things.book_page,{clip:'reach'})
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
  const target=f.lean&&f.first?cast.hatter.object.getObjectByName('mixamorigHead').getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.06,0)):new THREE.Vector3(...f.look)
  camera.lookAt(target)
  lens.target = target
}
