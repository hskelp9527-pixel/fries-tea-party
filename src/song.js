import * as THREE from 'three/webgpu'
import beatMap from '../audio/04t_little_bat_a.beats.json'
import { camera, hemi, sun } from './scene.js'
import { things, cups } from './garden.js'
import { glow } from './models.js'
import { song as staging } from './layout.js'
import { player, placePlayer, setSize, act } from './player.js'
import { setMusic, say, playing, heard, musicLength, ting } from './audio.js'
import { tween, wait } from './tweens.js'
import { game } from './state.js'

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
const WINDOW = 0.12 // seconds either side of a beat that count as a hit
// Light rises with each pass, since the three passes are about equally loud.
const LIGHT = [[1.2, 2.2], [1.6, 3], [2.1, 3.8]] // [hemisphere, sun] intensity per pass
// Camera keyframes on beats; each holds until the next one, or glides to it. The crane in the final chorus
// first backs out from under the canopy, then rises over the garden.
const SHOTS = [
  { beat: 0, pos: [-2.4, 1.5, -2.9], look: [-0.1, 1.9, -6.3] },
  { beat: 40, pos: [-2.1, 1.55, -3.5], look: [-0.5, 0.8, -4.4] },
  { beat: 88, pos: [-2.6, 1.7, -2.4], look: [-0.1, 1.2, -5.8], glide: true },
  { beat: 112, pos: [-3.5, 2.2, 4], look: [0, 1, -5], glide: true },
  { beat: 145, pos: [-9, 9, 9], look: [0, 1, -4] },
]

const hud = document.getElementById('hud')
const prompt = document.getElementById('prompt')
const tapCup = cups[staging.tapCup], cupY = tapCup.position.y
glow(tapCup, 0xffd070, 0)
const dancers = [things.hare, things.dormouse]
const rest = dancers.map(d => d.position.clone())

let active = false, start = 0, next = 0, cue = 0, hits = 0, done
const scored = new Set()

// Fries taps on Space or a click; only beats from the second pass on can be hit.
function tap(at) {
  if (!active) return
  const t = heard(at) - start
  if (t < beats[PASSES[1]] - WINDOW) return
  const beat = beats.findIndex((b, i) => i >= PASSES[1] && !scored.has(i) && Math.abs(b - t) <= WINDOW)
  if (beat >= 0) {
    scored.add(beat)
    hits++
    ting(1320)
    act('clap')
    tween(0.25, k => {
      tapCup.position.y = cupY + Math.sin(k * Math.PI) * 0.08
      tapCup.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 2 * (1 - k) })
    })
  }
  prompt.textContent = beat >= 0 ? 'Hit' : 'Miss'
  score()
}
const score = () => { hud.textContent = `Rhythm ${hits}/${beats.length - PASSES[1]}` }
addEventListener('keydown', e => { if (e.code === 'Space') tap(e.timeStamp) })
addEventListener('mousedown', e => { if (e.button === 0) tap(e.timeStamp) })

// The watch is mended: the Hatter climbs onto the table and the song plays. Resolves after the last line.
export async function playSong() {
  player.control = false
  player.cinematic = true
  setSize('normal', 0)
  placePlayer(staging.fries.pos, staging.fries.rot)
  setMusic({}, 2)
  camera.fov = 60
  camera.near = 0.05
  camera.updateProjectionMatrix()
  shoot(SHOTS[0], SHOTS[0], 0)

  const hatter = things.hatter, from = hatter.position.clone(), to = new THREE.Vector3(...staging.hatter)
  hatter.rotation.set(0, -Math.PI / 2, 0)
  await Promise.all([say('SG-01'), tween(1.2, t => {
    hatter.position.lerpVectors(from, to, t)
    hatter.position.y += Math.sin(t * Math.PI) * 0.6
  })])
  await wait(0.3)

  setMusic({ song: 1 }, 0)
  start = playing.song.start
  next = cue = hits = 0
  scored.clear()
  active = true
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
  if (!active) return
  const t = heard() - start
  while (next < beats.length && beats[next] <= t) next++
  const last = next - 1
  game.pulse = last >= 0 ? Math.exp(-(t - beats[last]) * 6) : 0

  const pass = PASSES.findLastIndex(p => last >= p)
  if (pass !== game.pass) {
    game.pass = pass
    const [h0, s0] = [hemi.intensity, sun.intensity], [h1, s1] = LIGHT[pass]
    tween(2, k => { hemi.intensity = h0 + (h1 - h0) * k; sun.intensity = s0 + (s1 - s0) * k })
    if (pass === 1) score()
  }
  while (cue < CUES.length && last >= CUES[cue].beat) say(CUES[cue++].id)

  const s = SHOTS.findLastIndex(shot => Math.max(last, 0) >= shot.beat)
  const from = SHOTS[s], to = SHOTS[s + 1]
  const k = from.glide ? Math.min(1, (t - beats[from.beat]) / (beats[to.beat] - beats[from.beat])) : 0
  shoot(from, from.glide ? to : from, k * k * (3 - 2 * k))

  // Everyone moves on the beat: the Hatter from the start, the March Hare and the Dormouse from the second pass.
  const side = last % 2 ? 1 : -1
  things.hatter.position.y = staging.hatter[1] + 0.06 * game.pulse
  things.hatter.rotation.z = side * 0.12 * game.pulse
  dancers.forEach((d, i) => {
    d.position.y = rest[i].y + (pass >= 1 ? 0.08 * game.pulse : 0)
    d.rotation.z = pass >= 1 ? -side * 0.15 * game.pulse : 0
  })
  for (const cup of cups) cup.scale.setScalar(1 + 0.35 * game.pulse)

  if (t > musicLength('song')) {
    active = false
    game.pulse = 0
    game.pass = -1
    done()
  }
}
