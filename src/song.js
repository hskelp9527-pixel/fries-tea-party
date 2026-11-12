import * as THREE from 'three/webgpu'
import { LOOK } from './look.js'
import beatMap from '../audio/04t_little_bat_a.beats.json'
import { camera, scene, sun } from './scene.js'
import { cups, tableProps, things } from './garden.js'
import { glow } from './models.js'
import { song as staging, cast as stage } from './layout.js'
import { stand } from './cast.js'
import { player, placePlayer, setSize, act } from './player.js'
import { setMusic, say, playing, heard, musicLength, ting, prepareMusic } from './audio.js'
import { tween, wait } from './tweens.js'
import { game, hop, setPhase } from './state.js'
import { createRhythm } from './rhythm.js'

const beats = beatMap.beats
// The song is sung three times; each pass starts on this beat. Confirm by ear against the recording.
const PASSES = [0, 40, 88]
// Voice lines over the song, cued on beats.
const CUES = [
  { beat: 33, id: 'SG-02' }, // the March Hare winces at the end of the off-key solo
  { beat: 38, id: 'SG-03' }, // Fries calls the beat just before tapping starts
  { beat: 46, id: 'SG-04' }, // the Dormouse joins in
  { beat: 88, id: 'SG-05' }, // the final chorus
]
const notes = beats.filter((_, i) => i >= PASSES[1] && (i - PASSES[1]) % 2 === 0)
let rhythm = createRhythm(notes)
// Light rises with each pass, since the three passes are about equally loud.
const LIGHT = LOOK.song // [environment, sun] intensity per pass
// The final chorus glides into the shared garden overview, with the performers
// large enough to read and the low sun visible above the cottage.
const SHOTS = [
  { beat: 0, pos: [-2.4, 1.5, -2.9], look: [-0.1, 1.9, -6.3] },
  { beat: 40, pos: [-2.1, 1.55, -3.5], look: [-0.5, 0.8, -4.4] },
  { beat: 88, pos: [-2.6, 1.7, -2.4], look: [-0.1, 1.2, -5.8], glide: true },
  { beat: 112, pos: [-5, 3.2, 2], look: [.5, 1.3, -6], glide: true },
  { beat: 145, ...staging.overview },
]

const hud = document.getElementById('hud')
const prompt = document.getElementById('prompt')
const rhythmCue = document.getElementById('rhythm-cue')
const instruction = document.getElementById('rhythm-instruction')
const tapCup = cups[staging.tapCup]
glow(tapCup, 0xffd070, 0)
let cupJump = 0

let active = false, start = 0, next = 0, cue = 0, done

// Fries taps on Space or a click; only beats from the second pass on can be hit.
function tap(at) {
  if (!active || game.paused) return
  const t = heard(at) - start
  const hit = rhythm.tap(t)
  if (hit === null) return
  if (hit) {
    ting(1320)
    act('clap')
    tween(0.25, k => {
      cupJump = Math.sin(k * Math.PI) * 0.08
      tapCup.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 2 * (1 - k) })
    })
  }
  prompt.textContent = tr(hit ? 'In time' : 'Listen for the glowing cup')
  score()
}
const score = () => { hud.textContent = tr('Rhythm {hits}/{total} · Streak {combo}',{hits:rhythm.stats.hits,total:notes.length,combo:rhythm.stats.combo}) }
addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat) tap(e.timeStamp) })
addEventListener('mousedown', e => { if (e.button === 0&&!e.target.closest('button,select,input,#pause-menu')) tap(e.timeStamp) })

// The watch is mended: the Hatter climbs onto the table and the song plays. Resolves after the last line.
export async function playSong() {
  setPhase('song')
  player.control = false
  player.cinematic = true
  setSize('normal', 0)
  placePlayer(staging.fries.pos, staging.fries.rot)
  setMusic({}, 2)
  camera.fov = 60
  camera.near = 0.05
  camera.updateProjectionMatrix()
  shoot(SHOTS[0], SHOTS[0], 0)

  await Promise.all([say('SG-01'), stand('hatter', stage.hatter.song, 1.2, 0.6)])
  await wait(0.3)

  await prepareMusic('song')
  setMusic({ song: 1 }, 0)
  start = playing.song.start
  next = cue = 0
  rhythm = createRhythm(notes)
  game.rhythm = rhythm.stats
  active = true
  rhythmCue.hidden = false
  document.getElementById('controls').textContent = tr('Space or click · Tap when the cup glows · Extra taps break your streak')
  await new Promise(resolve => { done = resolve })
  prompt.textContent = ''
  await say('SG-06')
}

const a = new THREE.Vector3(), b = new THREE.Vector3()
function shoot(from, to, k) {
  camera.position.lerpVectors(a.set(...from.pos), b.set(...to.pos), k)
  camera.lookAt(a.set(...from.look).lerp(b.set(...to.look), k))
}

export function updateSong() {
  if (!active || game.paused) return
  if (game.sceneSkipping) {
    finishSong()
    return
  }
  const t = heard() - start
  rhythm.update(t)
  const visibleCue = rhythm.cue(t), cueLight = visibleCue.open
  rhythmCue.dataset.open = String(cueLight)
  rhythmCue.dataset.note = String(visibleCue.index)
  rhythmCue.style.setProperty('--approach', Math.max(0, Math.min(1, 1 - visibleCue.remaining / .55)))
  instruction.textContent = tr(t < notes[0] - .55 ? 'Listen first. Join in when the cup begins to glow.'
    : cueLight ? 'Space / click · Now!' : 'Follow the pulse. Wait for the golden light.')
  tapCup.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = cueLight ? 1.8 : 0 })
  if (t >= notes[0]) score()
  while (next < beats.length && beats[next] <= t) next++
  const last = next - 1
  game.pulse = last >= 0 ? Math.exp(-(t - beats[last]) * 6) : 0

  const pass = Math.max(0, PASSES.findLastIndex(p => last >= p))
  if (pass !== game.pass) {
    game.pass = pass
    const [h0, s0] = [scene.environmentIntensity, sun.intensity], [h1, s1] = LIGHT[pass]
    tween(2, k => { scene.environmentIntensity = h0 + (h1 - h0) * k; sun.intensity = s0 + (s1 - s0) * k })
    if (pass === 1) {
      score()
      stand('hare', stage.hare.song, 0.8)
    }
    if(pass===2){
      const from=player.mesh.rotation.y,to=staging.overview.friesRot*Math.PI/180
      tween(2,k=>{player.mesh.rotation.y=from+(to-from)*k})
    }
  }
  while (cue < CUES.length && last >= CUES[cue].beat) say(CUES[cue++].id)

  const s = SHOTS.findLastIndex(shot => Math.max(last, 0) >= shot.beat)
  const from = SHOTS[s], to = SHOTS[s + 1]
  const k = from.glide ? Math.min(1, (t - beats[from.beat]) / (beats[to.beat] - beats[from.beat])) : 0
  shoot(from, from.glide ? to : from, k * k * (3 - 2 * k))

  for (const cup of cups) cup.scale.setScalar(1 + 0.35 * game.pulse * nearDancers(cup.position))

  // From the final chorus to the last note, every prop on the table hops on each beat.
  game.hop = pass === 2 ? { strength: 0.2 + 0.8 * rhythm.strength(), beat: last, phase: Math.min(1, (t - beats[last]) / ((beats[last + 1] ?? beats[last] * 2 - beats[last - 1]) - beats[last])) } : null
  if (t > musicLength('song')) {
    finishSong()
  }
  placeProps()
}
function finishSong() {
  active = false
  rhythmCue.hidden = true
  delete rhythmCue.dataset.open
  game.pulse = 0; game.pass = -1; game.hop = null; cupJump = 0
  for (const cup of cups) cup.scale.setScalar(1)
  tapCup.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 0 })
  placeProps()
  const resolve = done; done = null
  resolve?.()
}

// Each prop hops by its own size; one standing on another (a teapot on the tray) rides with that one instead.
const offset = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0)
// 1 on a dancer, fading to 0 at 3.5 m: only what stands near the dancers moves with the beat.
const dancers = () => [player.feet, things.hatter.position, things.hare.position, things.dormouse.position]
const nearDancers = point => Math.max(0, 1 - Math.min(...dancers().map(d => Math.hypot(d.x - point.x, d.z - point.z))) / 3.5)
function placeProps() {
  for (const p of tableProps) {
    const base = p.on ?? p, spin = nearDancers(base.home) > 0 ? hop(base.seed, base.size, offset, true) : (offset.set(0, 0, 0), 0)
    p.object.rotation.y = p.turn + spin
    p.object.position.copy(p.home).sub(base.home).applyAxisAngle(UP, spin).add(base.home).add(offset)
  }
  tapCup.position.y += cupJump
}
import { tr, onLanguageChange } from './i18n.js'
onLanguageChange(()=>{if(active){score();document.getElementById('controls').textContent=tr('Space or click · Tap when the cup glows · Extra taps break your streak')}})
