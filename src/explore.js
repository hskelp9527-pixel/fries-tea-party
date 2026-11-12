import * as THREE from 'three/webgpu'
import { player, placePlayer, setSize, nearProp, nearGear, facePoint, act, walkTo, anim } from './player.js'
import { camera, lens, scene } from './scene.js'
import { mouthPoint } from './contact-ik.js'
import { lookAt, headOf } from './gaze.js'
import speakers from './speakers.json'
import { cast, chairs, rest, standUp, walk, sitDown, moveChair, PULL } from './cast.js'
import { updateBanter, event, banter } from './banter.js'
import { stream, surface, CUP_PROFILE } from './liquids.js'
import { use, release, fly, toHand } from './hands.js'
import contacts from '../docs/fries_hand_contacts.json'
import { things, drinks, gears, doors, wake } from './garden.js'
import { world } from './physics.js'
import { setMusic, say, speaking, burst, stopSpeaking, playSfx } from './audio.js'
import { tween, wait } from './tweens.js'
import { game, setPhase, checkpoint } from './state.js'
import { teaService, hallNote, insideHall } from './tasks.js'
import { setFloatingLevel } from './floating.js'
import { underTable } from './layout.js'
import { runScene, onSceneCleanup } from './cutscene.js'
import { playGearGame } from './gear-games.js'
import { tr, dialogue, onLanguageChange } from './i18n.js'

const FIRST_HINT = 20 // seconds without finding a gear before the Dormouse sleep-talks a hint (then ~47 s, ~74 s)
const NEXT_HINT = 27

const prompt = document.getElementById('prompt')
const hud = document.getElementById('hud')
const head = (character, height) => character.localToWorld(new THREE.Vector3(0, height, 0))

const reachable = gear => !gear.found && nearGear(gear) && (gear.in !== 'house' || insideHall())
// What E can do: { pos, label, can(), use() }. The nearest one Fries can use is offered.
const uses = drinks.map(d => ({ ...d, can: () => nearProp(d, d.pos), use: () => drink(d) }))
for (const gear of gears) uses.push({
  pos: gear.pos, label: 'Pick up the gear', priority: 1,
  can: () => reachable(gear), use: () => pickUp(gear),
})
uses.push(teaService, hallNote)
let target, toldAboutTea = false

// Any empty armchair at the table, from either side: Fries walks to that side, the chair slides out, he steps in,
// sits down and the chair carries him in to the table. A two-shot finds him and the Hatter, the hosts tell him off in
// one of a few exchanges (a different one each time) and he answers back, and the chair slides out again and he gets
// up by himself.
const SEATED = [['ST-01', 'ST-02', 'ST-03'], ['ST-04', 'ST-05', 'ST-06'], ['ST-07', 'ST-08', 'ST-09'], ['ST-10', 'ST-11', 'ST-12']]
let sits = Math.floor(Math.random() * SEATED.length), hasSat = false, seatedPlayer = null
const otherSide = chair => chair.home.clone().multiplyScalar(2).sub(chair.front).setY(0)
const nearSide = chair => [chair.front, otherSide(chair)].reduce((a, b) => (a.distanceTo(player.feet) < b.distanceTo(player.feet) ? a : b))
const SITTING = rest('fries', 'sit_down', true, 1, true).lows[0]
for (const chair of chairs) {
  uses.push({
    pos: chair.seat, label: 'Sit down', use: () => sit(chair),
    can: () => !chair.by && player.size === 'normal' && Math.hypot(nearSide(chair).x - player.feet.x, nearSide(chair).z - player.feet.z) < 0.9,
  })
}
async function sit(chair) {
  const repeat=hasSat
  await sitScene(chair,repeat)
  hasSat = true
}
async function sitScene(chair,repeat=false) {
  player.control = false
  chair.by = 'fries'
  onSceneCleanup(failed => {
    if (!failed) return
    chair.by = null
    seatedPlayer = null
    banter.seated = false
    anim.hold('sit_down', false)
    for (const name of ['fries', 'hatter', 'hare']) lookAt(name, null)
    return moveChair(chair, 0)
  })
  const side = nearSide(chair)
  await walkTo([side.x, 0, side.z], chair.rot / DEG)
  await moveChair(chair, PULL)
  await walkTo([chair.step.x, 0, chair.step.z], chair.rot / DEG)
  act('sit_down')
  const from = player.feet.clone(), to = chair.seat.clone().addScaledVector(chair.forward, -PULL).setY(chair.seat.y - SITTING)
  await tween(anim.actions.sit_down.getClip().duration, t => player.feet.lerpVectors(from, to, Math.min(1, t * 1.25)))
  anim.hold('sit_down')
  await moveChair(chair, 0, player.feet)
  banter.seated = true
  seatedPlayer = {chair,side}
  // A two-shot from the open side of Fries's chair, across the table at the Hatter.
  player.cinematic = true
  const fries = headOf('fries'), hatter = headOf('hatter'), middle = fries.clone().lerp(hatter, 0.5)
  const across = new THREE.Vector3(hatter.z - fries.z, 0, fries.x - hatter.x).normalize()
  if (across.dot(chair.forward) > 0) across.negate()
  camera.position.copy(middle).addScaledVector(across, Math.max(2.2, fries.distanceTo(hatter) * 0.75)).setY(middle.y + 0.35)
  camera.lookAt(middle)
  lens.target = middle
  lookAt('fries', hatter)
  const exchange = SEATED[sits++ % SEATED.length]
  let heardAll = true
  for (const id of repeat?[]:exchange) {
    if (speakers[id] !== 'fries') lookAt(speakers[id], fries)
    if (!await say(id)) heardAll = false
  }
  if (!repeat&&heardAll && !game.sceneSkipping) discover(exchange.join(','))
  for (const name of ['fries', 'hatter', 'hare']) lookAt(name, null)
}
async function rise(chair, side) {
  await moveChair(chair, PULL, player.feet)
  anim.hold('sit_down', false)
  act('stand_up')
  const from = player.feet.clone(), to = chair.step.clone().setY(0)
  await tween(anim.actions.stand_up.getClip().duration, t => player.feet.lerpVectors(from, to, Math.max(0, t * 1.6 - 0.6)))
  await walkTo([side.x, 0, side.z], chair.rot / DEG)
  await moveChair(chair, 0)
  chair.by = null
  banter.seated = false
  player.cinematic = false
  event('standUp')
}

addEventListener('keydown', e => {
  if(!e.repeat&&!game.paused&&seatedPlayer&&!game.sceneDepth&&['KeyE','KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code)){
    const {chair,side}=seatedPlayer;seatedPlayer=null
    runScene(()=>rise(chair,side)).catch(error=>console.error('Standing up failed',error))
    return
  }
  if (e.code === 'KeyE' && !e.repeat && !game.paused && player.control && target) {
    const useTarget = target
    target = undefined
    document.getElementById('task-hint').textContent='';delete document.getElementById('task-hint').dataset.hint
    playSfx('interaction',{gain:.24})
    runScene(() => useTarget.use(), { resume: !['Mend the watch','Sit down'].includes(useTarget.label) })
      .catch(error => console.error('Interaction failed', error))
  }
})

// A giant can also play with the drifting cups (see floating.js).
const controlsText = () => tr(player.size === 'big' ? 'WASD move · Shift run · Space jump · E interact · V view · G / right mouse hold a cup · Esc pause'
  : 'WASD move · Shift run · Space jump · E interact · V view · Esc pause')
let exploring = false, onMended
// Hands control to the player. onMended runs once the three gears are back in the watch.
export function startExplore(mended) {
  onMended = mended
  exploring = true
  player.control = true
  player.cinematic = false
  setPhase('explore')
  sinceGear = 0; hintTier = -1
  document.getElementById('controls').textContent = controlsText()
  hud.textContent=tr('Gears {count}/3',{count:game.gears})
  if(!game.gears){document.getElementById('task-hint').textContent=tr('Tea changes your size. Look for glints and listen for ticking.');document.getElementById('task-hint').dataset.onboarding='true'}
  setMusic({ frozen: 1 - game.gears / 3, awake: game.gears / 3 })
}

// Drinking a tea or eating a cake: it flies into his hand, goes to his mouth and back to its place, then he
// changes size. A teacup is first filled at the table (see pour).
async function drink(d) {
  player.control = false
  if (d.used) {
    await walkTo(d.stand,d.rot)
    if(d.pot){
      onSceneCleanup(()=>{anim.hold('drink',false);release(d.object);d.object.position.copy(d.home)})
      showDrink(d);act('drink');await toHand(d.object,d);anim.hold('drink')
      const tea=surface(d.object,new THREE.Vector3(0,.012,0),.044,.065,{colour:new THREE.Color(d.tea),fill:1,profile:CUP_PROFILE})
      onSceneCleanup(()=>tea.remove())
      await tween(1.9,t=>{anim.current.time=2.8+3.6*t;tea.set(1-Math.min(1,Math.max(0,(t-.4)/.25)))})
      tea.remove();anim.hold('drink',false);release(d.object)
      await fly(d.object,end=>end.copy(d.home),.4,.05)
      player.cinematic=false
    }else{
      onSceneCleanup(()=>{anim.hold('pick_up',false);player.nod=0})
      showEat(d)
      act('pick_up');anim.hold('pick_up')
      await tween(.3,t=>{anim.current.time=contacts.pick_up.time*t})
      anim.hold('pick_up',false);anim.play('idle');await wait(.35)
      await cakeBite(d,.18)
      player.nod=0;anim.hold('pick_up',false);anim.play('idle');await wait(.25)
    }
    if (d.grow) await walkTo(d.grow, 90)
    setSize(d.becomes, 0.8)
    await wait(0.8)
    return
  }
  if (d.pot) await pour(d)
  else await eat(d)
  if (d.pot) {
    release(d.object)
    await fly(d.object, end => end.copy(d.home), 0.6, 0.08)
  }
  if (d.grow) await walkTo(d.grow, 90)
  setSize(d.becomes)
  if (d.becomes === 'small' && player.shrinks === 1) await firstShrink()
  else if (d.becomes === 'big' && player.grows === 1) await firstGrow()
  else {
    if (d.becomes !== 'normal') event(d.becomes === 'small' ? 'shrink' : 'grow')
  }
  d.used = true
}

// Fries bends to the cake, rises, then eats two magically lifted morsels.
async function eat(d) {
  onSceneCleanup(() => { anim.hold('pick_up', false); player.nod = 0; d.object.scale.copy(d.baseScale) })
  await walkTo(d.stand, d.rot)
  showEat(d)
  act('pick_up')
  await wait(contacts.pick_up.time)
  anim.play('idle');await wait(.35)
  for (let bite = 0; bite < 2; bite++) {
    await cakeBite(d,.22)
    player.nod = 0
    d.object.scale.multiplyScalar(0.8)
    await wait(0.2)
  }
  // The cake regrows, as magical cake should.
  const bitten = d.object.scale.clone()
  await tween(1, t => d.object.scale.lerpVectors(bitten, d.baseScale, t))
}

// A visible magical morsel travels from the cake to the actual lip landmark.
// The source cake stays planted; no empty-fist eating gesture is implied.
async function cakeBite(d,nod){
  const bite=new THREE.Group(),materials=[],geometries=[]
  const piece=(geometry,colour,y)=>{
    const material=new THREE.MeshStandardMaterial({color:colour,roughness:.9}),mesh=new THREE.Mesh(geometry,material)
    mesh.position.y=y;bite.add(mesh);materials.push(material);geometries.push(geometry)
  }
  piece(new THREE.BoxGeometry(.04,.023,.035),0xd6a65e,0)
  piece(new THREE.BoxGeometry(.042,.008,.037),0xffedcf,.015)
  piece(new THREE.SphereGeometry(.006,8,6),0xa52c3a,.024)
  const s=player.p.scale,from=new THREE.Box3().setFromObject(d.object).getCenter(new THREE.Vector3())
  from.y=new THREE.Box3().setFromObject(d.object).max.y
  bite.position.copy(from);bite.scale.setScalar(s);scene.add(bite)
  const savedCamera=camera.position.clone(),savedRotation=camera.quaternion.clone(),savedTarget=lens.target,savedFov=camera.fov
  const lip=mouthPoint(player.mesh,new THREE.Vector3())
  const facing=new THREE.Vector3(0,0,1).applyQuaternion(player.mesh.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(player.mesh.quaternion)
  const target=lip.clone().lerp(from,.1)
  camera.position.copy(lip).addScaledVector(facing,1.05*s).addScaledVector(right,.6*s);camera.position.y+=.08*s
  camera.fov=38;camera.updateProjectionMatrix();camera.lookAt(target);lens.target=target
  let removed=false
  const remove=()=>{if(removed)return;removed=true;bite.removeFromParent();materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose())}
  onSceneCleanup(remove)
  try{
    await tween(.85,t=>{
      const progress=t*t*(3-2*t),lip=mouthPoint(player.mesh,new THREE.Vector3())
      bite.position.lerpVectors(from,lip,progress);bite.position.y+=Math.sin(Math.PI*t)*.08*s
      bite.rotation.y=t*.8;bite.scale.setScalar(s*(1-THREE.MathUtils.smoothstep(t,.88,1)))
      player.mesh.userData.biteExpression=.65*THREE.MathUtils.smoothstep(t,.5,.78)*(1-THREE.MathUtils.smoothstep(t,.92,1))
      player.nod=nod*Math.sin(Math.PI*t)
    })
  }finally{player.nod=0;player.mesh.userData.biteExpression=0;remove();camera.position.copy(savedCamera);camera.quaternion.copy(savedRotation);camera.fov=savedFov;camera.updateProjectionMatrix();lens.target=savedTarget}
}

function showEat(d){
  const height=1.2*player.p.scale,side=d.rot*DEG+1.1,f=player.feet
  player.cinematic=true;camera.fov=50;camera.updateProjectionMatrix()
  camera.position.set(f.x+Math.sin(side)*height*1.4,f.y+height*.9,f.z+Math.cos(side)*height*1.4)
  camera.lookAt(f.x,f.y+height*.4,f.z)
}

// Fries takes up the empty cup and holds it out; the Hatter beckons from his chair and the teapot flies over from
// the tray, tilts and pours, the tea rising in the cup. Then, seen by a fixed camera from his front three-quarters,
// he lifts the cup to his mouth, drinks and lowers it.
const SPOUT = new THREE.Vector3(0.001, 0.198, 0.172), TILT = 0.8
function showDrink(d){
  const side=d.rot*DEG+1.1,f=player.feet
  player.cinematic=true;camera.fov=45;camera.updateProjectionMatrix()
  camera.position.set(f.x+Math.sin(side)*1.35,f.y+1.12,f.z+Math.cos(side)*1.35)
  camera.lookAt(f.x,f.y+.88,f.z)
}
async function pour(d) {
  const pot = things[d.pot], home = pot.position.clone(), homeTurn = pot.quaternion.clone()
  let tea, pouring
  onSceneCleanup(() => {
    pouring?.remove(); tea?.remove()
    pot.position.copy(home); pot.quaternion.copy(homeTurn)
    cast.hatter.doing = null
    anim.hold('drink', false)
    release(d.object)
    d.object.position.copy(d.home)
  })
  await walkTo(d.stand, d.rot)
  showDrink(d)

  act('drink')
  await toHand(d.object, d)
  anim.hold('drink')
  tea = surface(d.object, new THREE.Vector3(0, 0.012, 0), 0.044, 0.065, { colour: new THREE.Color(d.tea), fill: 0, profile: CUP_PROFILE })

  cast.hatter.doing = 'sit_beckon'
  const cup = d.object.getWorldPosition(new THREE.Vector3())
  const chest = player.mesh.getObjectByName('mixamorigSpine2').getWorldPosition(new THREE.Vector3())
  const elbow = player.mesh.getObjectByName('mixamorigLeftForeArm').getWorldPosition(new THREE.Vector3())
  const away = cup.clone().sub(chest.lerp(elbow, 0.5)).setY(0).normalize(), potYaw = Math.atan2(-away.x, -away.z)
  const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, potYaw, 0, 'YXZ'))
  const pouringTurn = new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, potYaw, 0, 'YXZ'))
  const tip = new THREE.Vector3(), above = cup.clone().setY(cup.y + 0.2)
  const over = above.clone().sub(tip.copy(SPOUT).applyQuaternion(pouringTurn))
  // Tilt outside the arms, then slide in with only the spout over the rim. The two GLBs' bodies clear the
  // posed arm/chest bone envelopes by over 0.10 m throughout this corridor (including the return).
  const stageSpout = above.clone().addScaledVector(away, 0.45).add(new THREE.Vector3(0, 0.25, 0))
  const parked = stageSpout.clone().sub(tip.copy(SPOUT).applyQuaternion(upright))
  await Promise.all([
    fly(pot, end => end.copy(parked), 1.3, 0.25),
    tween(1.3, t => pot.quaternion.slerpQuaternions(homeTurn, upright, t)),
  ])
  const tilt = t => {
    pot.rotation.set(TILT * t, potYaw, 0)
    pot.position.copy(stageSpout).sub(tip.copy(SPOUT).applyQuaternion(pot.quaternion))
  }
  await tween(0.5, tilt)
  const stage = pot.position.clone()
  await fly(pot, end => end.copy(over), 0.65, 0)
  const spout = pot.localToWorld(SPOUT.clone())
  pouring = stream(spout, tea.disc.getWorldPosition(cup.clone()), { height: 0, radius: 0.0045, colour: new THREE.Color(d.tea) })
  await tween(2.2, t => { tea.set(t); tea.disc.getWorldPosition(pouring.to) })
  pouring.remove()
  cast.hatter.doing = null
  await fly(pot, end => end.copy(stage), 0.65, 0)
  await tween(0.5, t => tilt(1 - t))
  await Promise.all([
    fly(pot, end => end.copy(home), 1.2, 0.3),
    tween(1.2, t => pot.quaternion.slerpQuaternions(upright, homeTurn, t)),
  ])

  anim.hold('drink', false)
  await wait(contacts.drink.time - 0.6)
  await tween(0.8, t => tea.set(1 - t))
  tea.remove()
  await wait(contacts.drink.duration - contacts.drink.time - 0.8)
  player.cinematic = false
}

// Picking up a gear: it is found the moment it is in his hand, stays there to the end of the clip, then flies
// to the watch.
const watchPoint = things.pocket_watch.position.clone().setY(things.pocket_watch.position.y + 0.03)
async function pickUp(gear) {
  player.control = false
  if (game.challenges&&!await playGearGame(gear)) return
  onSceneCleanup(() => {
    release(gear.object)
    anim.hold(gear.clip, false)
    if (gear.found) { gear.object.visible = false; gear.object.position.copy(watchPoint) }
  })
  const prop = gear.in === 'big_tree' ? { ...gear, stand: player.feet.toArray(),
    rot: Math.atan2(gear.pos.x - player.feet.x, gear.pos.z - player.feet.z) / DEG } : gear
  await walkTo(prop.stand,prop.rot)
  act('reach');anim.current.time=3.25
  await toHand(gear.object,{...prop,clip:'reach'})
  const point=gear.object.getWorldPosition(new THREE.Vector3()),s=Math.min(1,player.p.scale)
  const facing=player.mesh.getWorldQuaternion(new THREE.Quaternion())
  player.cinematic=true;camera.near=Math.min(.01,.02*player.p.scale);camera.fov=45;camera.updateProjectionMatrix()
  camera.position.copy(point).add(new THREE.Vector3(.22*s,.5*s,-.28*s).applyQuaternion(facing));camera.lookAt(point);lens.target=point
  find(gear)
  if(!game.challenges)game.puzzles[gear.layer]={kind:'exploration',completed:true}
  checkpoint()
  await wait(1)
  release(gear.object)
  await fly(gear.object,end=>end.copy(watchPoint),.8,.35)
  gear.object.visible=false
}

// The first shrink: the Hatter comes over, his huge face filling the sky;
// then he returns to his chair and Fries lands on the upturned cup under the table.
async function firstShrink() {
  player.control = false
  const hatter = cast.hatter, chair = hatter.chair, p = player.feet
  await wait(0.6)
  act('surprised')
  await standUp('hatter')
  await walk('hatter', [[p.x-1.1,-8.8],[p.x-1.1,p.z]])
  hatter.object.rotation.y = Math.atan2(p.x-hatter.object.position.x,p.z-hatter.object.position.z)
  hatter.doing = 'lean_over'
  const look = tween(hatter.anim.actions.lean_over.getClip().duration, () => facePoint(headOf('hatter').add(new THREE.Vector3(0,.06,0)), 0.15))
  await say('SZ-01')
  await say('SZ-02')
  await look
  hatter.doing = null
  await sitDown('hatter', chair)
  placePlayer(underTable.landing, 180)
  player.pitch=-.15
}

// The first grow: the Hatter and the March Hare shout up from far below.
async function firstGrow() {
  player.control = false
  await wait(1.2)
  act('surprised')
  await tween(0.8, () => facePoint(head(things.hatter, 1.3), 0.15))
  await say('SZ-03')
  await tween(0.6, () => facePoint(head(things.hare, 1.2), 0.15))
  await say('SZ-04')
  player.pitch=-.35
}

// Doors. The cottage door swings open into its warm hall when Fries comes to it at his normal size (the giant and
// the small Fries are blocked by size alone). The tree door rattles and stays locked until 6:01, and the Hatter
// tells Fries so.
const DEG = Math.PI / 180
let cottageOpen = false, rattled = -Infinity, clock = 0
function tryDoors() {
  const cottage = doors.cottage, tree = doors.tree
  if (!cottageOpen && player.size === 'normal' && cottage.front.distanceTo(player.feet) < 1.2) {
    cottageOpen = true
    for (const c of cottage.colliders) world.removeCollider(c, false)
    tween(1.2, t => { cottage.pivot.rotation.y = 95 * DEG * t * t * (3 - 2 * t) })
  }
  if (player.size === 'normal' && clock - rattled > 12 && tree.front.distanceTo(player.feet) < 1.1) {
    rattled = clock
    burst(3, 0.5)
    tween(0.7, t => { tree.pivot.rotation.y = Math.sin(t * 40) * (1 - t) * 1.5 * DEG })
    say('OP-05')
  }
}

function find(gear) {
  gear.found = true
  game.gears++
  game.found = gears.filter(g => g.found).map(g => g.layer)
  checkpoint()
  wake(gear.layer)
  setFloatingLevel(game.gears)
  setMusic({ frozen: 1 - game.gears / 3, awake: game.gears / 3 }, 3)
  hud.textContent = tr('Gears {count}/3',{count:game.gears})
  sinceGear = 0; hintTier = -1
  say(gear.line)
}

// The Dormouse's sleep-talk: after a while without progress, a hint for the nearest gear, clearer each time.
let sinceGear = 0, hintTier = -1, hintUntil=0, activeGoal=null
function hint() {
  const gear=nextGear()
  hintTier=Math.min(2,hintTier+1)
  const id=gear.hints[hintTier],hint=document.getElementById('task-hint')
  hint.textContent=tr('The Dormouse murmurs: {clue}',{clue:dialogue(id)});hint.dataset.hint=id;hintUntil=game.elapsed+10
  say(id,cast.dormouse.object.position.distanceTo(player.feet))
}
// The gear the objective strip and the hints point at: the one in reach, else one for Fries's size (a normal-sized
// Fries is sent to the first gear left: tree, grotto, mantel), else the first left.
function nextGear() {
  const left=gears.filter(g=>!g.found)
  return left.find(reachable)??(player.size==='normal'?left[0]:left.find(g=>g.by===player.size)??left[0])
}
const CAKE='Eat a cake to return to normal size first'
const STEPS={
  big:{change:"Drink the blue tea on the table to grow, then reach into the big tree's hollow",far:"Walk to the big tree and reach into its hollow",near:'Press E at the glowing hollow'},
  small:{change:"Drink the pink tea on the table to shrink, then slip into the fountain's grotto",far:"Cross the spoon bridge and slip into the fountain's grotto",near:"Press E at the gear in the grotto"},
  normal:{far:"Open the March Hare's cottage door and look on the mantelpiece",near:'Press E at the gear on the mantelpiece'},
}
const PHASE_STEPS={mending:'The Hatter is mending the watch…',song:'Press Space or click when a cup glows',ending:'Time ticks on to 6:01'}
// Pure: the strip's next-step message (a source string for tr) for a state; by is the size the current goal gear needs.
export function objectiveKey({phase,gears,size,by,near}) {
  if(phase!=='explore')return PHASE_STEPS[phase]??''
  if(gears===3)return size==='normal'?'Take the gears to the Hatter at the table':CAKE
  if(size!==by)return size==='normal'?STEPS[by].change:CAKE
  return STEPS[by][near?'near':'far']
}
export function objectiveText() {
  const gear=nextGear()
  return objectiveKey({phase:game.phase,gears:game.gears,size:player.size,by:gear?.by,near:gear&&reachable(gear)})
}
export const guideGoal=()=>nextGear()?.layer
function discover(id) { if (!game.discovered.includes(id)) { game.discovered.push(id); checkpoint() } }

uses.push({
  pos: watchPoint,
  label: 'Mend the watch',
  priority: 2,
  // Invite Fries from the open aisle. The watch sits behind the table/chair
  // colliders, so a hand-sized visibility ray is not a usable quest trigger.
  can: () => game.gears === 3 && player.size === 'normal'
    && Math.hypot(watchPoint.x - player.feet.x, watchPoint.z - player.feet.z) < 2.2
    && Math.abs(player.feet.y) < 0.5,
  use: mend,
})

async function mend() {
  exploring = false
  player.control = false
  prompt.textContent = ''
  hud.textContent = ''
  try { await onMended() }
  catch (error) { exploring = true; throw error }
}

// Things Fries does that the hosts remark on: falling into the fountain's basin, stepping into the cottage's hall.
let inBasin = false, inHall = false
function happenings() {
  const f = player.feet, basin = things.fountain.position
  const basinNow = Math.hypot(f.x - basin.x, f.z - basin.z) < 1.3 && f.y > 0.25
  if (basinNow && !inBasin) event('fountain')
  inBasin = basinNow
  const hallNow = insideHall()
  if (hallNow && !inHall) event('cottage')
  inHall = hallNow
}

let quiet = 0
const facing = new THREE.Vector3(), toward = new THREE.Vector3()
function interactionScore(u) {
  toward.subVectors(u.pos, player.feet).setY(0)
  const distance = toward.length() / player.p.scale
  const alignment = distance > 0 ? toward.normalize().dot(facing) : 1
  return (u.priority ?? 0) * 4 + alignment * 2 - distance * 0.25
}
export function updateExplore(dt) {
  if (!exploring || game.paused) return
  const tutorial=document.getElementById('task-hint')
  const goal=nextGear()
  if(goal!==activeGoal){
    activeGoal=goal;hintTier=-1;sinceGear=Math.min(sinceGear,FIRST_HINT)
    if(tutorial.dataset.hint){tutorial.textContent='';delete tutorial.dataset.hint}
  }
  if(tutorial.dataset.onboarding&&(sinceGear>12||game.gears)){tutorial.textContent='';delete tutorial.dataset.onboarding}
  if(tutorial.dataset.hint&&game.elapsed>hintUntil){tutorial.textContent='';delete tutorial.dataset.hint}
  hud.textContent=tr('Gears {count}/3',{count:game.gears})
  const controls=document.getElementById('controls'),keysText=controlsText()
  if(controls.textContent!==keysText)controls.textContent=keysText
  if(tutorial.dataset.hint)tutorial.textContent=tr('The Dormouse murmurs: {clue}',{clue:dialogue(tutorial.dataset.hint)})
  if(tutorial.dataset.onboarding)tutorial.textContent=tr('Tea changes your size. Look for glints and listen for ticking.')
  target = undefined
  delete prompt.dataset.action
  prompt.textContent = ''
  if(seatedPlayer&&!game.sceneDepth){prompt.textContent=tr('E  Stand up · WASD  Leave the chair');updateBanter(dt);return}
  if (!player.control) return
  facing.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))
  for (const u of uses) {
    if (u.can() && (!target || interactionScore(u) > interactionScore(target))) target = u
  }
  if (target) {prompt.dataset.action=target.label;prompt.textContent=`E  ${tr(target.label)}`}
  else if(!gears[0].found&&player.size!=='big'&&Math.hypot(player.feet.x-gears[0].pos.x,player.feet.z-gears[0].pos.z)<3.5)prompt.textContent=tr('This is too high. A different size might help.')
  else if(player.size==='small'&&doors.cottage.front.distanceTo(player.feet)<1.6)prompt.textContent=tr('The door is too heavy at this size.')
  else if(!gears[1].found&&player.size!=='small'&&Math.hypot(player.feet.x-18.5,player.feet.z+5)<2)prompt.textContent=tr('The opening is too small to fit through.')

  clock += dt
  tryDoors()
  happenings()

  quiet = speaking() ? 0 : quiet + dt
  sinceGear += dt
  if (target?.model?.endsWith('teacup') && !toldAboutTea) {
    toldAboutTea = true
    say('EX-10', cast.dormouse.object.position.distanceTo(player.feet))
  } else if (game.gears < 3 && hintTier<2 && sinceGear >= FIRST_HINT+(hintTier+1)*NEXT_HINT && quiet > 3) hint()
  else updateBanter(dt)
}
onLanguageChange(()=>{
  if(!exploring)return
  document.getElementById('controls').textContent=controlsText()
  hud.textContent=tr('Gears {count}/3',{count:game.gears})
  if(seatedPlayer&&!game.sceneDepth)prompt.textContent=tr('E  Stand up · WASD  Leave the chair')
  else if(target)prompt.textContent=`E  ${tr(target.label)}`
  const hint=document.getElementById('task-hint')
  if(hint.dataset.hint)hint.textContent=tr('The Dormouse murmurs: {clue}',{clue:dialogue(hint.dataset.hint)})
  if(hint.dataset.onboarding)hint.textContent=tr('Tea changes your size. Look for glints and listen for ticking.')
})
