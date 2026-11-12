// Screenshots of the guidance: title, the first-time toast with the objective strip, the guide card (empty and with one
// gear), the pause menu and the strip with all gears held. A picture tool, not a regression: it uses diagnostics state.
import fs from 'node:fs'
import { launch, sleep } from './browser.mjs'
import { routeDriver } from './route.mjs'
const output = process.env.TEA_OUT ?? 'art/review/2026-11-12/guide'; fs.mkdirSync(output, { recursive: true })
const address = process.env.TEA_URL ?? 'http://127.0.0.1:5199'
const b = await launch({ width: 1600, height: 900 }), drive = routeDriver(b, { skipScenes: false })
const shot = name => b.shot(`${output}/${name}.jpg`).then(() => console.log(`Captured ${name}`))
const hidePerf = () => b.evaluate(`document.getElementById('perf').hidden=true`)
async function explore() {
  await b.goto(`${address}/?start=explore&quality=high&diagnostics`)
  await drive.until(`!!document.getElementById('backend')?.textContent`)
  await b.click(800, 450)
  await drive.until('__tea.P.player.control', 120)
}
try {
  await b.goto(`${address}/?quality=high&diagnostics`)
  await drive.until(`!!document.getElementById('backend')?.textContent`)
  await sleep(1500); await hidePerf(); await shot('title')

  await explore()
  await sleep(800); await hidePerf(); await shot('explore-toast')

  await b.key('KeyH', 'h'); await sleep(500); await hidePerf(); await shot('guide')
  await b.key('KeyH', 'h'); await sleep(300)

  // One gear collected (the tree's), Fries giant: tick, highlighted row and the G key context.
  await b.evaluate(`(()=>{const g=__tea.G.gears[0];g.found=true;__tea.S.game.gears=1;__tea.S.game.found=['tea'];__tea.P.setSize('big',0);return true})()`)
  await sleep(1200)
  await b.key('KeyH', 'h'); await sleep(500); await hidePerf(); await shot('guide-progress')
  await b.key('Escape', 'Escape'); await sleep(300)

  await b.key('Escape', 'Escape'); await sleep(500); await hidePerf(); await shot('pause')
  await b.key('Escape', 'Escape'); await sleep(300)

  await b.evaluate(`(()=>{for(const g of __tea.G.gears)g.found=true;__tea.S.game.gears=3;__tea.S.game.found=['tea','syrup','flowers'];__tea.P.setSize('normal',0);return true})()`)
  await sleep(1200); await hidePerf(); await shot('objective-allgears')
} finally { await b.close() }
