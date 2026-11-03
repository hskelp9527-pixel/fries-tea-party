import * as THREE from 'three/webgpu'
import { cast, changeSeats } from './cast.js'
import { player } from './player.js'
import { say, currentLine, speaking } from './audio.js'
import { lookAt, headOf } from './gaze.js'
import { zones } from './layout.js'
import { game } from './state.js'
import speakers from './speakers.json'

// The hosts keep talking while Fries explores: a small scheduler, not a script. It picks an exchange whose
// conditions hold, plays its lines in turn (the speakers' talk clips play by themselves, see cast.js) with
// everyone's gaze on the speaker and the speaker's on whom the line is to, then waits 15-40 s. Something Fries does
// gets its own exchange, started at the end of the current line. The Hatter leads, the March Hare heckles, the
// Dormouse answers in his sleep. Lines come from docs/script.md; new ones are new entries here.
// `to`: 'fries' when the exchange is said to him; otherwise each line is to the next speaker (or, last, the one
// before). `when(c)`: c has size, gears, near(zone), seated (Fries in a chair).
const EXCHANGES = [
  { lines: ['BK-01', 'BK-08', 'BK-07'] }, // the raven riddle, scoffed at, never answered
  { lines: ['BK-05', 'BK-09'] }, // always six o'clock; not forever
  { lines: ['OP-07', 'OP-08', 'OP-10'], when: c => c.gears < 3 }, // who broke the watch, and the Dormouse in his sleep
  { lines: ['BK-02', 'BK-06'], to: 'fries', when: c => c.near('table') || c.seated },
  { lines: ['BK-03', 'BK-08'], to: 'fries', when: c => c.near('table') || c.seated },
  { lines: ['BK-04'], to: 'fries', when: c => c.near('hareChair') || c.seated },
  { lines: ['BK-10', 'BK-11'], to: 'fries', when: c => c.size === 'small' && c.near('table') },
  { lines: ['SZ-05', 'SZ-06'], to: 'fries', when: c => c.size === 'small' && c.near('table') },
  { lines: ['BK-12', 'BK-13'], to: 'fries', when: c => c.size === 'big' && c.near('table') },
  { lines: ['SZ-07', 'SZ-03'], to: 'fries', when: c => c.size === 'big' && c.near('table') },
  { lines: ['SZ-08', 'SZ-04'], to: 'fries', when: c => c.size === 'big' && c.near('cottage') },
]
// What Fries does: a gear back, a size change, a fall into the fountain, the cottage's hall, a chair.
export const EVENTS = {
  shrink: { lines: ['BK-10', 'BK-11'], to: 'fries' },
  grow: { lines: ['BK-12', 'BK-13'], to: 'fries' },
  fountain: { lines: ['BK-02', 'BK-06'], to: 'fries' },
  cottage: { lines: ['BK-04', 'SZ-08'], to: 'fries' },
  firstSit: { lines: ['OP-01', 'OP-02', 'OP-03'], to: 'fries' },
  sit: { lines: ['BK-06', 'BK-04'], to: 'fries' },
  standUp: { lines: ['BK-05'], to: 'fries' },
}

const where = name => name === 'fries' ? player.feet : cast[name].object.position
const distance = name => where(name).distanceTo(player.feet)
let talk = null, queued = null, busy = false, gap = 12, idle = 0
const recent = []

// Plays an exchange's lines in turn; `talk` tells gaze who says the current one to whom.
async function run(exchange) {
  busy = true
  const { lines, to } = exchange
  for (let i = 0; i < lines.length; i++) {
    if (queued) break
    talk = { speaker: speakers[lines[i]], to: to ?? speakers[lines[i + 1]] ?? speakers[lines[i - 1]] }
    await say(lines[i], distance(talk.speaker))
    await new Promise(resolve => setTimeout(resolve, 400))
  }
  talk = null
  busy = false
  gap = 15 + Math.random() * 25
  if (queued) {
    const next = queued
    queued = null
    run(next)
  }
}

// Something Fries did: its exchange plays once the current line ends.
export function event(name) {
  queued = EVENTS[name]
  if (!busy && !speaking()) {
    queued = null
    run(EVENTS[name])
  }
}

// Fries in a chair (the banter turns to him); see explore.js.
export const banter = { seated: false }

function context() {
  const near = zone => Math.hypot(player.feet.x - zones[zone].pos[0], player.feet.z - zones[zone].pos[1]) < zones[zone].r * player.p.scale ** 0.5
  return { size: player.size, gears: game.gears, near, seated: banter.seated }
}

// Each frame while Fries explores: the next exchange when it is due, now and then the March Hare changing seats.
export function updateBanter(dt) {
  if (busy || speaking()) return
  gap -= dt
  if (gap > 0) return
  const c = context(), open = EXCHANGES.filter(e => !recent.includes(e) && (!e.when || e.when(c)))
  const pick = (open.some(e => e.to === 'fries') && (banter.seated || c.near('table')) ? open.filter(e => e.to === 'fries') : open)
  if (++idle % 3 === 0 && cast.hare.seated && !banter.seated) {
    gap = 20
    changeSeats('hare')
    return
  }
  const exchange = pick[Math.floor(Math.random() * pick.length)]
  if (!exchange) return
  recent.push(exchange)
  if (recent.length > 4) recent.shift()
  run(exchange)
}

// Gaze, every frame: the speaker looks at whom the line is to; everyone else at the speaker; with nobody talking,
// heads turn to Fries when he is near. The Dormouse keeps his eyes shut while he sleeps.
const targets = { hatter: new THREE.Vector3(), hare: new THREE.Vector3(), dormouse: new THREE.Vector3(), fries: new THREE.Vector3() }
export function updateLooks() {
  const speaker = talk?.speaker ?? (currentLine() && speakers[currentLine()]), to = talk?.to
  for (const name of ['hatter', 'hare', 'dormouse', 'fries']) {
    let at = null
    if (speaker === name && to) at = to
    else if (speaker && speaker !== name) at = speaker
    else if (name !== 'fries' && distance(name) < 6 * player.p.scale) at = 'fries'
    if (name === 'dormouse' && cast.dormouse.anim.current === cast.dormouse.anim.actions.sleep) at = null
    if (name === 'fries' && at && distance(at) > 9) at = null
    lookAt(name, at && headOf(at, targets[name]))
  }
}
