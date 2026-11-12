import assert from 'node:assert/strict'
import { launch, sleep } from './browser.mjs'
const browser = await launch({ width: 1280, height: 720 })
try {
  await browser.goto('http://127.0.0.1:5199/?liquid')
  const deadline = Date.now() + 120000
  while (Date.now() < deadline && !await browser.evaluate('!!window.liquidLab').catch(() => false)) await sleep(300)
  assert.ok(await browser.evaluate('!!window.liquidLab'))
  const inspect = () => browser.evaluate(`(()=>{
    const sheets=[];liquidLab.scene.traverse(o=>{if(o.geometry?.hasAttribute('liquidPart'))sheets.push({
      gpu:!!o.material.positionNode,visible:o.visible,vertices:o.geometry.attributes.position.count,version:o.geometry.attributes.position.version})});
    return sheets;
  })()`)
  await browser.evaluate('liquidLab.seek(2,1)')
  await sleep(1200)
  const frozen = await inspect()
  assert.ok(frozen.length > 0 && frozen.every(sheet => sheet.gpu && sheet.visible))
  await browser.shot('art/review/2026-11-11/optimized/liquid-frozen.jpg')
  await browser.evaluate('liquidLab.seek(2,4.5)')
  await sleep(1200)
  const flowing = await inspect()
  assert.deepEqual(flowing, frozen, 'Freezing and flowing leave vertex buffers untouched')
  await browser.shot('art/review/2026-11-11/optimized/liquid-flowing.jpg')
  assert.equal(browser.logs.filter(l => l.startsWith('[exception]') || l.startsWith('[error]')).length, 0, browser.logs.join('\n'))
  console.log('Liquid lab passed: frozen/flowing GPU sheets, static vertex buffers, no browser errors')
} finally { await browser.close() }
