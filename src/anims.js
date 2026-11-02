import * as THREE from 'three/webgpu'
import { camera } from './scene.js'
import { player, act, anim } from './player.js'
import { cast } from './cast.js'

// ?anims: a row of characters and a row of the picked one's clips, with the camera close to whoever is picked, to
// check every clip for clipping by hand. Fries plays a clip once and goes back to locomotion; the others loop the
// clip until another is picked.
const characters = {
  fries: { object: player.mesh, clips: Object.keys(anim.actions), play: act },
  ...Object.fromEntries(Object.values(cast).map(m => [m.name, { object: m.object, clips: Object.keys(m.anim.actions), play: clip => { m.trying = clip } }])),
}

const bar = document.createElement('div'), who = document.createElement('div'), clips = document.createElement('div')
bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10;padding:4px 8px;background:#0009'
for (const row of [who, clips]) {
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:4px 0'
  bar.append(row)
}
document.body.append(bar)

function button(row, label, onClick) {
  const b = document.createElement('button')
  b.textContent = label
  b.style.cssText = 'font:14px sans-serif;padding:6px 10px;cursor:pointer'
  b.addEventListener('click', event => {
    event.stopPropagation()
    onClick()
  })
  row.append(b)
}

// The camera looks at the picked character's body in its current pose from in front and a little above, over
// the table; picking the same character again steps the view a quarter turn round it.
let picked, turn = 0
function pick(name) {
  const c = characters[name]
  turn = name === picked ? turn + Math.PI / 2 : 0
  picked = name
  clips.replaceChildren()
  for (const clip of c.clips) button(clips, clip, () => c.play(clip))
  const box = new THREE.Box3().setFromObject(c.object, true), middle = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3()), span = Math.max(size.x, size.y, size.z), yaw = c.object.rotation.y + turn
  player.cinematic = true
  camera.position.set(middle.x + Math.sin(yaw) * span * 0.8, middle.y + span * 0.3, middle.z + Math.cos(yaw) * span * 0.8)
  camera.lookAt(middle)
}

for (const name of Object.keys(characters)) button(who, name, () => pick(name))
