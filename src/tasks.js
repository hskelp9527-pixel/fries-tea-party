import * as THREE from 'three/webgpu'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { texture, vertexColor, vec2, vec3, float, mix, smoothstep, positionWorld, color, mx_noise_float } from 'three/tsl'
import { scene, camera, lens } from './scene.js'
import { RAPIER, world } from './physics.js'
import { model, addColliders, glow } from './models.js'
import { things, gears, glints, awake } from './garden.js'
import { player, act, walkTo, anim } from './player.js'
import { cast, standUp, sitDown, laySpoon } from './cast.js'
import { say, burst, ting, playing, heard, prepareMusic, setMusic } from './audio.js'
import { tween, wait } from './tweens.js'
import { underTable, grotto, hall, overlook, song as songSpot } from './layout.js'
import { stream, surface, CUP_PROFILE, TEA } from './liquids.js'
import { toHand, release } from './hands.js'
import { random } from './fields.js'
import { game, checkpoint } from './state.js'
import { createRhythm } from './rhythm.js'
import { event } from './banter.js'
import { onSceneCleanup } from './cutscene.js'
import { spoonBridge } from './prop-staging.js'

// The tasks at each place. Each place first shows what Fries cannot do yet: a glint on every missing gear (the one
// high on the big tree's trunk, the one in the cottage hall), a light and ticking
// behind the grotto's tiny arch; Fries plays `found` when he first spots one.
const rand = random(31)
const DEG = Math.PI / 180

// Glints: a soft star on each missing gear, kept a steady size on screen so it reads from far off; brighter for a
// big Fries on the overlook, who sees the whole garden.
const ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })
const eye = new THREE.Vector3(), to = new THREE.Vector3(), view = new THREE.Vector3()
const visible = point => {
  eye.copy(camera.position)
  to.subVectors(point, eye)
  const length = to.length()
  to.divideScalar(length)
  ray.origin = eye.clone().addScaledVector(to, 0.35 * player.p.scale)
  ray.dir = to
  return world.castRay(ray, Math.max(0, length - 0.35 * player.p.scale - 0.05), true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS) === null
}
const treeGlint = glints[0].material, baseGlint = glints[1].material
const overlookGlint = baseGlint.clone()
overlookGlint.depthTest = false
overlookGlint.colorNode = baseGlint.colorNode.mul(1.8)
const spotted = new Set()
function updateGlints() {
  const onOverlook = player.size === 'big' && Math.hypot(player.feet.x - overlook[0], player.feet.z - overlook[1]) < overlook[2]
  camera.getWorldDirection(view)
  gears.forEach((g, i) => {
    const s = glints[i]
    s.visible = !g.found
    if (g.found) return
    const d = camera.position.distanceTo(g.pos)
    s.scale.setScalar((i === 0 ? Math.min(0.6, Math.max(0.12, 0.012 * d)) : Math.min(0.32, Math.max(0.06, 0.006 * d))) * (onOverlook ? 2.5 : 1))
    s.material = onOverlook ? overlookGlint : i === 0 ? treeGlint : baseGlint
    // Spotting it: in front of him, near enough for his size, nothing between.
    if (player.control && !spotted.has(g) && (onOverlook || d < 12) && to.subVectors(g.pos, camera.position).normalize().dot(view) > 0.85 && (onOverlook || visible(g.pos))) {
      spotted.add(g)
      act('found')
    }
  })
}

// Under the long table: cross the hanging fringe and crumbs to an upturned cup.
// The Hare bridges the gap from its saucer down to the "eat me" cake between the legs.
const crumbShape = new THREE.SphereGeometry(1, 10, 8)
const crumbVertices = crumbShape.attributes.position
for (let i = 0; i < crumbVertices.count; i++) {
  const x = crumbVertices.getX(i), y = crumbVertices.getY(i), z = crumbVertices.getZ(i)
  const lobe = 1 + 0.1 * Math.sin(x * 7 + z * 5) * Math.sin(y * 6 - x * 3)
  crumbVertices.setXYZ(i, x * lobe, y * lobe, z * lobe)
}
crumbShape.computeVertexNormals()
const crumbs = new THREE.InstancedMesh(crumbShape, new THREE.MeshStandardMaterial({ color: 0xfff5df, roughness: 0.94 }), 260)
const icing = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: 0xffb1c4, roughness: 0.55 }), 52)
const sponge = [0xf4c97b, 0xffe2a7, 0xe8ba78, 0xf7db9f].map(colour => new THREE.Color(colour))
const [cx0, cz0, cx1, cz1] = underTable.crumbs, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
const icingPatch = new THREE.Matrix4().compose(new THREE.Vector3(0.15, 0.96, 0.1), new THREE.Quaternion(), new THREE.Vector3(0.46, 0.17, 0.35))
const icingMatrix = new THREE.Matrix4()
for (let i = 0; i < crumbs.count; i++) {
  const size = 0.0025 + rand() ** 3 * 0.011
  crumbs.setMatrixAt(i, m4.compose(new THREE.Vector3(cx0 + rand() * (cx1 - cx0), size * 0.6, cz0 + rand() * (cz1 - cz0)), q.setFromEuler(e.set(rand() * 0.5, rand() * 6, rand() * 0.5)), new THREE.Vector3(size, size * 0.7, size * 1.2)))
  crumbs.setColorAt(i, sponge[i % sponge.length])
  if (i % 5 === 0) icing.setMatrixAt(i / 5, icingMatrix.multiplyMatrices(m4, icingPatch))
}
crumbs.receiveShadow = icing.receiveShadow = true
scene.add(crumbs, icing)
const [ux, uz] = underTable.cup
const cup = model('teacup'), saucer = model('saucer')
cup.position.set(ux, 0.07, uz)
cup.rotation.x = Math.PI
saucer.position.set(ux, 0.09, uz)
saucer.rotation.x = Math.PI
scene.add(cup, saucer)
// A smooth porcelain support avoids catching the tiny capsule on the inverted
// saucer's individual triangle seams where it joins the spoon.
world.createCollider(RAPIER.ColliderDesc.cylinder(.035,.052).setTranslation(ux,.035,uz))
world.createCollider(RAPIER.ColliderDesc.cylinder(.004,.067).setTranslation(ux,.089,uz))
const [low, high] = underTable.spoon.map(a => new THREE.Vector3(...a))
const run = high.clone().sub(low), middle = low.clone().lerp(high, 0.5)
let bridged = false
async function layBridge() {
  bridged = true
  const spoon = model('spoon')
  const bridge=spoonBridge(spoon,low,high)
  await laySpoon(middle, spoon, new THREE.Vector3(...underTable.hare),bridge.handle)
  bridge.place()
  // Collision is the same measured spoon surface the player sees.
  const vertex=new THREE.Vector3()
  spoon.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,vertices=new Float32Array(p.count*3)
    for(let i=0;i<p.count;i++)vertex.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray(vertices,i*3)
    const indices=mesh.geometry.index?new Uint32Array(mesh.geometry.index.array):Uint32Array.from({length:p.count},(_,i)=>i)
    world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,indices))
  })
  say('SZ-05', cast.hare.object.position.distanceTo(player.feet))
  ting(1700)
}

// The grotto under the fountain's basin: a wet stone floor, syrup dripping from the basin's underside, moss, and
// a little valve with gear 2 jammed in its wheel, lit warm and ticking, which shows through the arch.
const fountain = things.fountain.position
// The grotto's walls (the fountain scan's inside, within 1.35 m of its axis and 0.7 m of the floor) darken to rock: the
// scan's colour under layered noise, strata and a cool tone, so the gear's warm light is the brightest thing in view.
const shell = things.fountain.getObjectByName('fountain'), scan = shell.material
const rockMaterial = new THREE.MeshStandardNodeMaterial({ roughness: scan.roughness, metalness: scan.metalness, normalMap: scan.normalMap, normalScale: scan.normalScale })
const inside = float(1).sub(smoothstep(1.2, 1.4, positionWorld.xz.sub(vec2(fountain.x, fountain.z)).length())).mul(float(1).sub(smoothstep(0.55, 0.75, positionWorld.y)))
const rock = mx_noise_float(positionWorld.mul(9)).mul(0.5).add(mx_noise_float(positionWorld.mul(31)).mul(0.25)).add(mx_noise_float(vec3(positionWorld.x.mul(2), positionWorld.y.mul(26), positionWorld.z.mul(2))).mul(0.2))
rockMaterial.colorNode = mix(texture(scan.map).rgb, texture(scan.map).rgb.mul(vec3(0.95, 0.82, 0.74)).mul(rock.add(1.2)), inside.mul(0.8))
shell.material = rockMaterial
// The modelled grotto (rock, syrup, candied crystals): vertex-coloured, with fine grain on the rock and the gems glowing.
const grottoRock = things.fountain.getObjectByName('grotto_rock'), gems = things.fountain.getObjectByName('grotto_crystal')
grottoRock.material = new THREE.MeshStandardNodeMaterial({ roughness: 0.88 })
grottoRock.material.colorNode = vertexColor().mul(mx_noise_float(positionWorld.mul(60)).mul(0.25).add(0.92))
gems.material = new THREE.MeshStandardNodeMaterial({ roughness: 0.25 })
gems.material.colorNode = vertexColor()
gems.material.emissiveNode = vertexColor().mul(4)
// The valve: a brass pipe down from the basin with collars and a lever, and a hand wheel on the floor with gear 2 in it.
const [vx, vz] = grotto.valve
const cyl = (r, h, y, x = 0) => new THREE.CylinderGeometry(r, r, h, 12).translate(x, y, 0)
const spokes = Array.from({ length: 6 }, (_, k) => new THREE.BoxGeometry(0.09, 0.004, 0.006).rotateY(k * Math.PI / 6).translate(0, 0.024, 0))
const brass = new THREE.Mesh(mergeGeometries([
  cyl(0.014, 0.4, 0.2), cyl(0.026, 0.008, 0.33), cyl(0.022, 0.05, 0.11), cyl(0.026, 0.006, 0.082), cyl(0.026, 0.006, 0.138),
  new THREE.BoxGeometry(0.006, 0.006, 0.06).translate(0, 0.11, 0.04), new THREE.SphereGeometry(0.009, 8, 6).translate(0, 0.11, 0.072),
  cyl(0.012, 0.012, 0.027), new THREE.TorusGeometry(0.045, 0.005, 6, 24).rotateX(Math.PI / 2).translate(0, 0.024, 0), ...spokes,
]), new THREE.MeshStandardMaterial({ color: 0xe0a848, metalness: 0.85, roughness: 0.3, emissive: 0x6a3a08, emissiveIntensity: 0.6 }))
brass.position.set(vx + 0.045, 0, vz)
// This is a centimetre-scale alcove: inverse-square falloff makes a full-size
// lamp wash out the valve and ceiling at these distances.
const lamp = new THREE.PointLight(0xffb060, 0.045, 1.6)
lamp.position.set(vx, 0.18, vz)
scene.add(brass, lamp)
const moss = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 1 }), 40)
for (let i = 0; i < moss.count; i++) {
  const a = rand() * Math.PI * 2, r = 0.95 + rand() * 0.15, s = 0.02 + rand() * 0.04
  moss.setMatrixAt(i, m4.compose(new THREE.Vector3(fountain.x + Math.cos(a) * r, 0.012 + s * 0.3, fountain.z + Math.sin(a) * r), q.identity(), new THREE.Vector3(s, s * 0.35, s)))
}
scene.add(moss)
const drip = new THREE.MeshPhysicalMaterial({ color: 0xe8901c, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.85 })
const drips = Array.from({ length: 6 }, () => {
  const a = rand() * Math.PI * 2, r = rand() * 0.8
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4).scale(1, 1.6, 1), drip)
  d.userData = { x: fountain.x + Math.cos(a) * r, z: fountain.z + Math.sin(a) * r, phase: rand() }
  scene.add(d)
  return d
})
let ticking = 0

// The cottage's hall, at normal size: buttered tools, a clock with butter in it, a note.
const house = things.house
house.updateMatrixWorld(true)
const mantel = new THREE.Mesh(new THREE.BoxGeometry(...hall.mantel.size), new THREE.MeshStandardMaterial({ color: 0x68452f, roughness: 0.85 }))
mantel.position.set(...hall.mantel.pos)
mantel.castShadow = mantel.receiveShadow = true
house.add(mantel)
for (const { model: name, at, rot = 0, scale = 1 } of hall.props) {
  const object = model(name)
  object.position.copy(house.localToWorld(new THREE.Vector3(...at)))
  object.rotation.y = house.rotation.y + rot * DEG
  object.scale.setScalar(scale)
  scene.add(object)
}

// A handwritten note gives the Dormouse's clue somewhere the player can read it at normal size.
const paper = document.createElement('canvas')
paper.width = 1024
paper.height = 640
const ink = paper.getContext('2d')
const noteTexture=new THREE.CanvasTexture(paper)
noteTexture.colorSpace=THREE.SRGBColorSpace
let readingNote=false
function drawNote(){
  if(readingNote)document.getElementById('task-hint').textContent=tr('The best butter! No bread-knives in the works. The Dormouse mutters...')
  ink.fillStyle='#eddbab';ink.fillRect(0,0,paper.width,paper.height);ink.fillStyle='#321c0e';ink.font='500 48px "Microsoft YaHei", sans-serif'
  ;['The best butter!', 'No bread-knives in the works.', 'The Dormouse was muttering:', '"Crawl into the cracked', 'fountain foot..."'].forEach((line,i)=>ink.fillText(tr(line),44,85+i*104));noteTexture.needsUpdate=true
}
drawNote();onLanguageChange(drawNote)
const note = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.3625), new THREE.MeshBasicMaterial({ map: noteTexture, toneMapped:false }))
note.position.copy(house.localToWorld(new THREE.Vector3(...hall.note)))
note.rotation.y = house.rotation.y
scene.add(note)
export const hallNote = {
  pos: note.position, label: 'Read the butter-stained note',
  read: false,
  can: () => !hallNote.read && insideHall() && note.position.distanceTo(player.feet.clone().add(new THREE.Vector3(0, 1.1, 0))) < 1,
  use: async () => {
    player.control = false
    player.cinematic=true;readingNote=true;lens.reading=true
    onSceneCleanup(()=>{readingNote=false;lens.reading=false;document.getElementById('task-hint').textContent=''})
    const from=camera.position.clone(),to=house.localToWorld(new THREE.Vector3(.15,1.9,-1.4)),fov=camera.fov
    await tween(.35,t=>{camera.position.lerpVectors(from,to,t);camera.lookAt(note.position);camera.fov=fov+(45-fov)*t;camera.updateProjectionMatrix()})
    document.getElementById('task-hint').textContent = tr('The best butter! No bread-knives in the works. The Dormouse mutters...')
    const finished = await say('EX-06')
    await wait(1.5)
    hallNote.read = true
    if (finished && !game.sceneSkipping && !game.discovered.includes('hall-note')) { game.discovered.push('hall-note'); checkpoint() }
    document.getElementById('task-hint').textContent = ''
  },
}
export function insideHall() {
  const p = house.worldToLocal(player.feet.clone()), [x, y, z] = hall.centre
  return player.size === 'normal' && Math.abs(p.x - x) < hall.halfWidth && Math.abs(p.z - z) < hall.depth && Math.abs(p.y - y) < 0.35
}

// Six pours on the explore track's audio clock: the song's rhythm game in small. The cup glows as a pour begins; Space or
// a click in the same window as the song (see rhythm.js) slides it under the pot and catches the tea.
const LANES = [-0.42, 0, 0.42], POURS = 6, BEAT = 60 / 108
const pots = ['teapot', 'pink_teapot', 'blue_teapot']
export const teaService = {
  pos: new THREE.Vector3(...songSpot.fries.pos), label: 'Hold out a cup for the tea service',
  can: () => game.gears >= 1 && player.size === 'normal' && teaService.pos.distanceTo(player.feet) < 0.8,
  use: () => serve(),
}
let lane = 1, serving = false, cupTea, servedCup, rhythm, notes, order
const spot = new THREE.Vector3(...songSpot.fries.pos)
const at = k => spot.clone().add(new THREE.Vector3(0, 0, LANES[k]))
// A glint over the cup spot until the tea service has been tried.
const teaGlint = glints[1].clone()
teaGlint.position.copy(spot).setY(0.95)
scene.add(teaGlint)
const rhythmCue = document.getElementById('rhythm-cue'), instruction = document.getElementById('rhythm-instruction')
const musicTime = at => heard(at) - playing.awake.start
function tap(stamp) {
  if (!serving || game.paused) return
  const t = musicTime(stamp), index = rhythm.cue(t).index
  if (!rhythm.tap(t)) return
  lane = order[index]
  ting(1320)
}
addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat) tap(e.timeStamp) })
addEventListener('mousedown', e => { if (e.button === 0 && !e.target.closest('button,select,input,#pause-menu')) tap(e.timeStamp) })
const musicBeat = () => musicTime() / BEAT
async function untilBeat(beat) {
  while (!game.sceneSkipping && musicBeat() < beat) await wait(0.01)
}
async function serve() {
  player.control = false
  await prepareMusic('awake')
  if (!playing.awake) setMusic({ frozen: 1 - game.gears / 3, awake: game.gears / 3 })
  const chair = cast.hatter.chair
  const homes = pots.map(name => ({ object: things[name], position: things[name].position.clone(), rotation: things[name].rotation.clone() }))
  const streams = new Set()
  cupTea = servedCup = null
  onSceneCleanup(async failed => {
    serving = false
    rhythmCue.hidden = true
    for (const pour of streams) pour.remove()
    for (const { object, position, rotation } of homes) { object.position.copy(position); object.rotation.copy(rotation) }
    cast.hatter.doing = cast.hatter.aim = null
    cupTea?.remove(); servedCup?.removeFromParent()
    if (servedCup) release(servedCup)
    anim.hold('reach', false)
    if (failed && !cast.hatter.seated) await sitDown('hatter', chair)
  })
  lane = 1
  await walkTo(at(1).toArray(), 90)
  player.cinematic = true
  camera.fov = 55
  camera.updateProjectionMatrix()
  camera.position.set(spot.x - 1.6, 1.7, spot.z + 0.5)
  camera.lookAt(spot.x + 0.6, 0.95, spot.z)
  servedCup = model('teacup')
  glow(servedCup, 0xffd070, 0)
  servedCup.position.copy(spot).add(new THREE.Vector3(0.42, 0.95, 0))
  scene.add(servedCup)
  act('reach')
  await toHand(servedCup, { clip: 'reach', grip: [0, 0.05, 0.007] })
  await wait(3.4)
  anim.hold('reach')
  release(servedCup)
  cupTea = surface(servedCup, new THREE.Vector3(0, 0.012, 0), 0.044, 0.065, { fill: 0, profile: CUP_PROFILE })
  await standUp('hatter')
  cast.hatter.doing = 'conduct'
  const spouts = [new THREE.Vector3(0, 0.117, 0.134), new THREE.Vector3(0, 0.2, 0.172), new THREE.Vector3(0, 0.2, 0.172)]
  const landing = k => at(k).add(new THREE.Vector3(0.42, 0.98, 0))
  const targets = homes.map(({ object }, k) => {
    object.rotation.set(0, -Math.PI / 2, 0)
    return landing(k).add(new THREE.Vector3(0.05, 0.42, 0)).sub(spouts[k].clone().applyEuler(object.rotation))
  })
  cast.hatter.aim = targets[1]
  await Promise.all(homes.map(({ object, position }, k) => tween(1, t => object.position.lerpVectors(position, targets[k], t))))
  document.getElementById('task-hint').textContent = tr('Space or click when your cup glows, as in the final song')
  const first = Math.ceil(musicBeat()) + 2
  order = Array.from({ length: POURS }, () => Math.floor(rand() * 3))
  notes = order.map((_, n) => (first + n * 4) * BEAT)
  rhythm = createRhythm(notes)
  rhythmCue.hidden = false
  serving = true
  for (let n = 0; n < POURS; n++) {
    const k = order[n], pot = homes[k].object, beat = first + n * 4
    cast.hatter.aim = targets[k]
    cast.hatter.anim.play('conduct', true)
    await untilBeat(beat - 1)
    const before = rhythm.stats.hits
    await tween(BEAT, t => { pot.rotation.x = 0.8 * t })
    await untilBeat(beat + 0.25)
    const caught = rhythm.stats.hits > before, target = landing(k), spout = pot.localToWorld(spouts[k].clone())
    const pour = stream(spout, caught ? target.clone().setY(cupTea.disc.getWorldPosition(new THREE.Vector3()).y) : target, { height: 0, radius: 0.0045, colour: TEA })
    streams.add(pour)
    await untilBeat(beat + 1.25)
    pour.remove()
    streams.delete(pour)
    if (caught) {
      cupTea.set(rhythm.stats.hits / POURS)
    } else {
      burst(5, 0.6)
      const miss = stream(target, target.clone().setY(0.78), { height: 0, radius: 0.0045, colour: TEA })
      streams.add(miss)
      await wait(BEAT)
      miss.remove()
      streams.delete(miss)
    }
    document.getElementById('task-hint').textContent = tr('Space or click when your cup glows · Tea caught {caught}/{total}', { caught: rhythm.stats.hits, total: POURS })
    await tween(BEAT, t => { pot.rotation.x = 0.8 * (1 - t) })
  }
  serving = false
  rhythmCue.hidden = true
  const caught = rhythm.stats.hits
  if (!game.sceneSkipping) {
    if (caught >= game.tea.hits) game.tea = { hits: caught, total: POURS }
    if (!game.discovered.includes('tea-service')) game.discovered.push('tea-service')
    checkpoint()
  }
  await Promise.all(homes.map(({ object, position, rotation }) => {
    const from = object.position.clone()
    return tween(1, t => object.position.lerpVectors(from, position, t)).then(() => object.rotation.copy(rotation))
  }))
  cast.hatter.doing = null
  cast.hatter.aim = null
  cupTea.remove()
  servedCup.removeFromParent()
  anim.hold('reach', false)
  if (caught >= POURS * 0.7 && !game.sceneSkipping) { act('cheer'); burst(8, 0.8); event('teaWell') }
  await sitDown('hatter', chair)
  document.getElementById('task-hint').textContent = ''
  player.cinematic = false
}

export function updateTasks(dt, clock) {
  if (game.paused) return
  updateGlints()
  teaGlint.visible = game.gears >= 1 && !game.tea.total && player.size === 'normal'
  teaGlint.scale.setScalar(Math.min(0.32, Math.max(0.06, 0.006 * camera.position.distanceTo(teaGlint.position))))
  if (serving) {
    player.feet.lerp(at(lane), Math.min(1, dt * 12))
    servedCup.position.copy(player.feet).add(new THREE.Vector3(0.42, 0.95, 0))
    const t = musicTime(), { open, scoring, index, remaining } = rhythm.cue(t)
    rhythm.update(t)
    rhythmCue.dataset.open = String(open)
    rhythmCue.dataset.scoring = String(scoring)
    rhythmCue.dataset.note = String(index)
    rhythmCue.style.setProperty('--approach', Math.max(0, Math.min(1, 1 - remaining / .55)))
    instruction.textContent = tr(t < notes[0] - .55 ? 'Listen first. Join in when the cup begins to glow.' : open ? 'Space / click · Now!' : 'Follow the pulse. Wait for the golden light.')
    servedCup.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = open ? 1.8 : 0 })
  }
  // The spoon bridge, the first time a small Fries comes near the cup under the table.
  if (!bridged && player.control && player.size === 'small' && Math.hypot(player.feet.x - ux, player.feet.z - uz) < 0.6) layBridge()
  // The grotto ticks while gear 2 is still in its valve.
  const near = Math.hypot(player.feet.x - vx, player.feet.z - vz)
  if (!gears[1].found && near < 5 && (ticking -= dt) < 0) {
    ticking = 1
    burst(7, 0.35 * (1 - near / 5))
  }
  for (const d of drips) {
    const k = ((awake.syrup ? clock * 0.7 : 0) + d.userData.phase) % 1
    d.position.set(d.userData.x, 0.41 - 0.4 * k * k, d.userData.z)
  }
}
import { tr, onLanguageChange } from './i18n.js'
