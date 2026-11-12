import * as THREE from 'three/webgpu'
import { color, texture, vec3, dot, max, min, mix, smoothstep, attribute } from 'three/tsl'
import { scene, webgpu } from './scene.js'
import { model } from './models.js'
import { floating } from './layout.js'
import { level } from './fields.js'
import { player } from './player.js'
import { camera } from './scene.js'
import { game, hop } from './state.js'
import { meanSize, keepOut } from './garden.js'

// Teacups, hats, spoons, plates and pocket watches drifting in the air on paths that never repeat. Teacups
// glide out of Fries's way, hats turn to look at him, everything pulses on the beat of the song, and every
// gear found adds another batch.
const items = []
const batches = new Map(), instanceMatrix = new THREE.Matrix4()
const density = webgpu ? 1 : 0.5
// The mean linear brightness of the hat texture's olive cloth, so a tint keeps its own brightness on average.
const CLOTH_LUMA = 0.07
// Every floating thing stays this far above the ground under it, and a further BOB_ROOM so its bob and beat hops
// (together under 0.3 m) never dip it below the minimum.
const MIN_HEIGHT = 2.2, BOB_ROOM = 0.4

function batchFor(kind, requestedTint) {
  const tintIndex = requestedTint ?? (kind === 'hat' ? items.filter(it => it.kind === 'hat').length % floating.hatTints.length : 0)
  const key = kind
  if (batches.has(key)) return batches.get(key)
  const source = model(kind), parts = []
  if (kind === 'hat') {
    // The hat has one textured material: olive cloth with a red ribbon and a few bright trims painted on. Each hat gets its own copy
    // whose cloth takes the tint (the texture's brightness times the tint, so the weave and folds stay) while every bright, saturated
    // texel (ribbon, trims) keeps its painted colour.
    const tint = attribute('hatTint','vec3')
    source.traverse(o => {
      if (!o.isMesh) return
      const map = texture(o.material.map), rgb = map.rgb, seen = rgb.pow(1 / 2.2)
      o.material = new THREE.MeshStandardNodeMaterial().copy(o.material)
      const cloth = tint.mul(dot(rgb, vec3(0.2126, 0.7152, 0.0722)).div(CLOTH_LUMA).min(2))
      // Cloth is dull (chroma under about 0.24 in display colour), the ribbon and trims are vivid (over about 0.34).
      const isCloth = smoothstep(0.34, 0.24, max(seen.r, seen.g, seen.b).sub(min(seen.r, seen.g, seen.b)))
      o.material.colorNode = mix(rgb, cloth, isCloth)
    })
  }
  source.updateMatrixWorld(true)
  const capacity = Math.ceil((floating.perGear[kind] ?? floating.treats[kind]) * 4 * density)
  source.traverse(part => {
    if (!part.isMesh) return
    const geometry=part.geometry.clone()
    if(kind==='hat')geometry.setAttribute('hatTint',new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3))
    const mesh = new THREE.InstancedMesh(geometry, part.material, capacity)
    mesh.name = `Floating ${key}`
    mesh.count = 0
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.receiveShadow = true
    scene.add(mesh)
    parts.push({ mesh, local: part.matrixWorld.clone() })
  })
  const batch = { parts, count: 0, extent: meanSize(source) }
  batches.set(key, batch)
  return batch
}

function add(kind, cloud, size = 0.9 + Math.random() * 0.4) {
  const batch = batchFor(kind), slot = batch.count++, object = new THREE.Object3D()
  const tint=new THREE.Color(floating.hatTints[items.filter(item=>item.kind==='hat').length%floating.hatTints.length])
  object.userData.hatTint=tint
  for (const { mesh } of batch.parts) mesh.count = batch.count
  scene.add(object)
  items.push({
    kind,
    object,
    batch, slot,
    size, // near real size, varied
    home: new THREE.Vector3(...cloud.center.map((c, k) => c + (Math.random() - 0.5) * cloud.size[k])),
    phase: Math.random() * 100,
    wander: 0.3 + Math.random() * 0.5,
    spin: (Math.random() - 0.5) * 1.2,
    seed: Math.random() * 100,
    extent: batch.extent,
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
export function prewarmFloating(){
  for(const kind of Object.keys(floating.perGear))batchFor(kind)
  for(const batch of batches.values())for(const {mesh}of batch.parts)if(mesh.count===0)mesh.count=1
}

const chest = new THREE.Vector3(), push = new THREE.Vector3(), offset = new THREE.Vector3(), near = new THREE.Vector3()
let clock = 0

// For a big Fries, two teacups and a spoon drift close by his camera, so the giant sees how small they are.
const ESCORT = [[-1.6, -0.5, -3.2], [1.9, 0.3, -4.2], [0.7, -1.1, -2.6]]
const escorts = () => [...items.filter(it => it.kind === 'teacup').slice(0, 2), items.find(it => it.kind === 'spoon')]
let giant = 0
const viewFrustum=new THREE.Frustum(),viewMatrix=new THREE.Matrix4(),bounds=new THREE.Sphere()
let grabbed=null, grabbing=false
addEventListener('keydown',event=>{if(event.code==='KeyG'&&!event.repeat&&player.control&&player.size==='big'){grabbing=!grabbing;if(!grabbing)grabbed=null}})
addEventListener('mousedown',event=>{if(event.button===2&&player.control&&player.size==='big'){grabbing=true}})
addEventListener('mouseup',event=>{if(event.button===2){grabbing=false;grabbed=null}})
addEventListener('contextmenu',event=>event.preventDefault())
addEventListener('blur',()=>{grabbing=false;grabbed=null})

export function updateFloating(dt) {
  camera.updateMatrixWorld()
  viewFrustum.setFromProjectionMatrix(viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),camera.coordinateSystem)
  for(const batch of batches.values())batch.visible=0
  clock += dt * (1 + 0.35 * game.gears) // livelier with each gear
  const s = player.p.scale
  chest.copy(player.feet).setY(player.feet.y + 0.8 * s)
  giant = Math.max(0, Math.min(1, giant + (player.size === 'big' ? dt : -dt) * 0.6))
  const escorting = escorts()
  if(grabbing&&!grabbed) grabbed=escorting.find(item=>item?.kind==='teacup')
  if(!player.control||player.size!=='big'){grabbed=null;grabbing=false}
  for (const it of items) {
    const t = clock + it.phase, o = it.object
    it.grow = Math.min(1, it.grow + dt)
    o.position.copy(it.home)
    const e = escorting.indexOf(it)
    if (e >= 0 && giant > 0) o.position.lerp(camera.localToWorld(near.set(...ESCORT[e])), giant * giant * (3 - 2 * giant))
    o.position.x += Math.sin(t * 0.31) * it.wander
    o.position.y += Math.sin(t * 0.53) * it.wander * 0.4
    o.position.z += Math.cos(t * 0.27) * it.wander
    if (!(e >= 0 && giant > 0)) o.position.y = Math.max(o.position.y, level(o.position.x, o.position.z) + MIN_HEIGHT + BOB_ROOM)
    o.position.y += Math.sin(t * 0.9 + it.seed) * 0.12 // a slow bob of its own, so nothing ever looks parked
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
    o.rotation.x = Math.sin(t * 0.6 + it.seed) * 0.12
    o.rotation.z = Math.sin(t * 0.7) * 0.15 + hop(it.seed, it.extent * it.size, offset)
    o.position.add(offset)
    keepOut(o.position, it.extent * it.size / 2)
    if(it===grabbed) o.position.copy(camera.localToWorld(near.set(0.8,-0.7,-2.1)))
    o.scale.setScalar(it.size * it.grow * (1 + 0.3 * game.pulse))
    o.updateMatrix()
    bounds.center.copy(o.position);bounds.radius=it.extent*it.size*1.5
    if(viewFrustum.intersectsSphere(bounds)){
      const index=it.batch.visible++
      for(const {mesh,local}of it.batch.parts){
        mesh.setMatrixAt(index,instanceMatrix.multiplyMatrices(o.matrix,local))
        if(it.kind==='hat'){const tint=o.userData.hatTint;mesh.geometry.attributes.hatTint.setXYZ(index,tint.r,tint.g,tint.b)}
      }
    }
  }
  for(const batch of batches.values())for(const {mesh}of batch.parts){mesh.count=batch.visible;mesh.instanceMatrix.needsUpdate=true;if(mesh.geometry.attributes.hatTint)mesh.geometry.attributes.hatTint.needsUpdate=true}
}
