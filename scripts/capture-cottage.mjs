// Photographs every room of the March Hare's cottage at eye height, plus the hearth close-up and the view in through the
// open front door, and records the perf panel for the hearth view. Usage: node scripts/capture-cottage.mjs [--only=a,b]
import fs from 'node:fs'
import { launch, sleep } from './browser.mjs'
const output = process.env.TEA_OUT ?? 'art/review/2026-11-12/cottage'
fs.mkdirSync(output, { recursive: true })
const address = process.env.TEA_URL ?? 'http://127.0.0.1:5199'
// [name, camera position, look target, fov] in the house's own frame (floor y 1.1, eye 2.2).
const views = [
  ['door-in', [1.3, 2.3, 4.6], [1.0, 2.0, -1.4], 62],
  ['sitting-a', [1.5, 2.25, 2.0], [-1.8, 1.9, .6], 72],
  ['sitting-b', [-1.4, 2.25, 2.3], [.8, 1.9, -.6], 72],
  ['hearth', [.6, 2.25, 1.0], [1.28, 2.2, -2.1], 68],
  ['mantel', [1.25, 2.3, -.75], [1.25, 2.05, -2.08], 55],
  ['bedroom-a', [-1.0, 2.25, .5], [-1.9, 1.9, -1.6], 70],
  ['bedroom-b', [-.35, 2.25, -1.25], [-2.1, 1.9, -1.5], 72],
  ['kitchen-a', [1.1, 2.25, .3], [3.0, 2.1, .1], 70],
  ['kitchen-b', [2.3, 2.25, 2.1], [3.0, 2.0, -.9], 72],
  ['storage', [1.9, 2.25, -.2], [3.0, 2.1, -1.7], 70],
  ['storage-b', [2.0, 2.25, -1.5], [3.0, 2.0, -.6], 74],
]
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',')
const b = await launch({ width: 1600, height: 900 }), report = {}
try {
  await b.goto(`${address}/?frame=s16&quality=high&perf&diagnostics`)
  const end = Date.now() + 120000
  while (!await b.evaluate(`document.getElementById('perf')?.textContent.includes('FPS')`).catch(() => false)) {
    if (b.logs.some(l => /^\[(error|exception)\]/.test(l))) throw Error(b.logs.join('\n'))
    if (Date.now() > end) throw Error('not ready')
    await sleep(200)
  }
  await b.evaluate(`(()=>{__tea.G.doors.cottage.pivot.rotation.y=95*Math.PI/180;['hud','objective','prompt','controls','pause-open','task-hint'].forEach(id=>document.getElementById(id).hidden=true)})()`)
  for (const [name, pos, look, fov] of views) {
    if (only && !only.includes(name)) continue
    await b.evaluate(`(()=>{const h=__tea.G.things.house,c=__tea.camera,p=h.localToWorld(c.position.clone().set(...${JSON.stringify(pos)})),l=h.localToWorld(c.position.clone().set(...${JSON.stringify(look)}));c.position.copy(p);c.lookAt(l);__tea.lens.target=l;c.fov=${fov};c.updateProjectionMatrix();return true})()`)
    await sleep(1800)
    if (name === 'hearth') { await sleep(2500); report.hearth = await b.evaluate(`document.getElementById('perf').textContent`) }
    await b.shot(`${output}/${name}.jpg`)
    console.log('captured', name)
  }
  report.room = await b.evaluate(`(()=>{const room=__tea.G.things.house.getObjectByName('March Hare cottage interior');let tris=0,draws=0;const mats=new Set();room.traverse(o=>{if(!o.isMesh)return;draws++;mats.add(o.material.uuid);const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1)});return {tris,draws,materials:mats.size}})()`)
  console.log('room', report.room)
  report.logs = b.logs
  fs.writeFileSync(`${output}/perf.json`, JSON.stringify(report, null, 2))
  console.log(report.hearth)
} finally { await b.close() }
