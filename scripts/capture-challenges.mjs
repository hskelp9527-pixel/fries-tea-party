// Screenshots of the three gear challenges as a player sees them: <name>-1-start, -2-mid, -3-done, plus results.jpg.
// A picture tool, not a regression: it teleports and resizes Fries through the diagnostics hooks to reach each challenge fast.
import fs from 'node:fs'
import { launch, sleep } from './browser.mjs'
import { routeDriver } from './route.mjs'
const output = process.env.TEA_OUT ?? 'art/review/2026-11-12/challenges'; fs.mkdirSync(output, { recursive: true })
const address = process.env.TEA_URL ?? 'http://127.0.0.1:5199'
const b = await launch({ width: 1600, height: 900 }), drive = routeDriver(b, { skipScenes: false })
const shot = name => b.shot(`${output}/${name}.jpg`).then(() => console.log(`Captured ${name}`))

// Fresh page in the garden, Fries put at `place` (JS expression for [x,y,z]) at `size`, facing `rot` degrees, then E on the gear.
async function enter(size, place, rot) {
  await b.goto(`${address}/?start=explore&quality=high&diagnostics`)
  await drive.until(`!!document.getElementById('backend')?.textContent`)
  await b.click(800, 450)
  await drive.until('__tea.P.player.control', 120)
  await b.evaluate(`(()=>{__tea.P.setSize(${JSON.stringify(size)},0);__tea.P.placePlayer(${place},${rot});return true})()`)
  await sleep(1500)
  await drive.until(`document.getElementById('prompt').dataset.action==='Pick up the gear'`, 20)
  await b.key('KeyE', 'e')
  await drive.until('__tea.gearGames.active', 30)
  await sleep(400)
}
const done = async name => { await drive.until('!__tea.gearGames.active', 60); await sleep(300); await shot(`${name}-3-done`) }

try {
  // Tree: giant on the lawn at the gear's stand point.
  await enter('big', '[-4.48,0,-10.44]', -158)
  await shot('tree-1-start')
  for (let first = true; await b.evaluate('__tea.gearGames.active'); first = false) {
    await sleep(100)
    const s = await b.evaluate(`(()=>{const g=__tea.gearGames,r=document.getElementById('gear-game-canvas').getBoundingClientRect();return {active:g.active,round:g.round,target:g.target,rect:{x:r.x,y:r.y,w:r.width,h:r.height}}})()`)
    if (!s.active) break
    const at = (dx, dy) => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: s.rect.x + s.rect.w * (s.target.x + dx), y: s.rect.y + s.rect.h * (s.target.y + dy) })
    if (first) { await at(0.06, 0.04); await sleep(700); await shot('tree-2-mid') }  // close to the tooth: warm glow, quick ticks
    await at(0, 0)
    await drive.down('Space'); await drive.until(`!__tea.gearGames.active||__tea.gearGames.round>${s.round}`, 7); await drive.up('Space')
  }
  await done('tree')

  // Fountain: small Fries inside the grotto, 0.6 m from the gear.
  await enter('small', '[17.6,0,-5]', 90)
  await shot('fountain-1-start')
  for (let first = true; await b.evaluate('__tea.gearGames.active'); first = false) {
    const s = await b.evaluate('({lane:__tea.gearGames.lane,safe:__tea.gearGames.safeLane,round:__tea.gearGames.round,failed:__tea.gearGames.failed})')
    if (s.failed) { await b.key('KeyR', 'r'); await sleep(200); continue }
    for (let i = s.lane; i < s.safe; i++) await b.key('KeyD', 'd')
    for (let i = s.lane; i > s.safe; i--) await b.key('KeyA', 'a')
    await drive.until('__tea.gearGames.warn||__tea.gearGames.open||!__tea.gearGames.active', 20)
    if (first && await b.evaluate('__tea.gearGames.warn')) { await shot('fountain-2-mid'); first = false }  // the safe lane is thinned
    await drive.until('__tea.gearGames.open||!__tea.gearGames.active', 5)
    if (!await b.evaluate('__tea.gearGames.active')) break
    await b.key('Space', ' ')
    await drive.until(`!__tea.gearGames.active||__tea.gearGames.round>${s.round}`, 7); await sleep(300)
  }
  await done('fountain')

  // Hall: normal Fries at the mantel, in the house's frame.
  await enter('normal', `(()=>{const h=__tea.G.things.house;return h.localToWorld(__tea.camera.position.clone().set(1.183,1.1,-1.15)).toArray()})()`,
    `(()=>__tea.G.things.house.rotation.y*180/Math.PI+180)()`)
  await shot('hall-1-start')
  const goal = await b.evaluate('__tea.gearGames.correctWatch')
  await b.key('Digit' + (goal + 1), String(goal + 1))
  await drive.until('__tea.gearGames.listenRemaining>0', 5); await sleep(500)
  // A tick's pulse lasts 110 ms, too short for a screenshot, so hold it on the playing watch for the capture.
  await b.evaluate(`document.querySelector('#watch-choices button.selected').classList.add('tick')`)
  await shot('hall-2-mid')
  await drive.until('__tea.gearGames.listenRemaining===0', 6)
  await b.key('Space', ' ')
  await done('hall')

  // Results card: jump to the ending, fill in sample records (this page never played them), skip the ending scene.
  await b.goto(`${address}/?start=ending&quality=high&diagnostics`)
  await drive.until(`!!document.getElementById('backend')?.textContent`)
  await b.click(800, 450)
  await sleep(1000)
  await b.evaluate(`(()=>{const g=__tea.S.game;Object.assign(g.rhythm,{hits:34,total:40,best:19});g.gears=3;g.puzzles={tea:{seconds:38,mistakes:1},syrup:{seconds:27,mistakes:0},flowers:{seconds:21,mistakes:2}};g.discovered=['a','b','c','d','e','f','g'];return true})()`)
  await b.key('Enter', 'Enter')
  await drive.until(`!document.getElementById('results').hidden`, 100)
  await sleep(500)
  await shot('results')
} finally { await b.close() }
