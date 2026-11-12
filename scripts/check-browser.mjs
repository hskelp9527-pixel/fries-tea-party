import fs from 'node:fs'
import assert from 'node:assert/strict'
import { launch, sleep } from './browser.mjs'

const query = process.argv[2] ?? 'frame=s14&perf&quality=high'
const output = 'art/review/2026-11-11/optimized'
fs.mkdirSync(output, { recursive: true })
const browser = await launch({ port: 9342 })
try {
  const cpu = Number(new URLSearchParams(query).get('cpu') ?? 1)
  if (cpu > 1) await browser.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  await browser.send('Performance.enable')
  await browser.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?${query}&diagnostics`)
  const ready = query.includes('frame=') ? `document.getElementById('perf')?.textContent.includes('FPS')` : `!!document.getElementById('backend')?.textContent`
  const deadline = Date.now() + (cpu>1?300000:120000)
  while (Date.now() < deadline) {
    if (browser.logs.some(l => l.startsWith('[exception]'))) throw new Error(browser.logs.join('\n'))
    if (await browser.evaluate(ready).catch(() => false)) break
    await sleep(300)
  }
  assert.ok(await browser.evaluate(ready), 'Game became ready')
  const startupBytes=[...browser.net.values()].filter(r=>r.url.startsWith('http')).reduce((sum,r)=>sum+r.size,0)
  await browser.evaluate(`(()=>{window.__frameSpikes=[];let previous=performance.now();function track(now){const ms=now-previous;previous=now;if(ms>100)__frameSpikes.push(ms);requestAnimationFrame(track)}requestAnimationFrame(track);return true})()`)
  if (!query.includes('frame=')) await browser.click(960, 540)
  await sleep(cpu > 1 ? 35000 : 12000)
  const metrics = async () => Object.fromEntries((await browser.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
  const before = await metrics()
  const timing = await browser.evaluate(`new Promise(resolve => {
    const frames = []; let last = performance.now(); const until = last + 5000;
    function sample(now) { frames.push(now - last); last = now;
      if (now < until) requestAnimationFrame(sample);
      else { frames.sort((a,b) => a-b); resolve({count:frames.length, average:frames.reduce((a,b)=>a+b,0)/frames.length,p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)}) }
    } requestAnimationFrame(sample)
  })`)
  const after = await metrics()
  // Profiling itself can stop the VM while code metadata is collected.
  // Keep those external debugging pauses out of the game's startup audit.
  const gameFrameSpikes=await browser.evaluate('window.__frameSpikes')
  let liquidMs
  if (new URLSearchParams(query).has('profile')) {
    await browser.send('Profiler.enable')
    await browser.send('Profiler.setSamplingInterval', { interval: 200 })
    await browser.send('Profiler.start')
    const frames = await browser.evaluate(`new Promise(resolve=>{let count=0;const end=performance.now()+4000;function tick(now){count++;if(now<end)requestAnimationFrame(tick);else resolve(count)}requestAnimationFrame(tick)})`)
    const { profile } = await browser.send('Profiler.stop')
    const nodes = new Map(profile.nodes.map(node => [node.id, node])), parents = new Map()
    for (const node of profile.nodes) for (const child of node.children ?? []) parents.set(child, node.id)
    let liquidTime = 0
    profile.samples.forEach((id, i) => {
      for (let current = id; current !== undefined; current = parents.get(current)) {
        if (/\/src\/liquids\.js|\/liquids-[^/]+\.js/.test(nodes.get(current).callFrame.url)) { liquidTime += profile.timeDeltas[i]; break }
      }
    })
    liquidMs = liquidTime / 1000 / frames
    fs.writeFileSync(`${output}/liquids.cpuprofile`, JSON.stringify(profile))
  }
  const scene = await browser.evaluate(`(async()=>{
    const {scene,renderer,camera}=window.__tea;
    const byName={}, byMaterial={}, casters=[];
    scene.traverseVisible(o=>{if(!o.isMesh)return; const p=o.parent?.name||o.name||'(unnamed)';byName[p]=(byName[p]??0)+1;
      const mat=o.material.name||o.material.type;byMaterial[mat]=(byMaterial[mat]??0)+1;if(o.castShadow)casters.push(o.name)});
    return {panel:document.getElementById('perf').textContent,casters:casters.length,pixelRatio:renderer.getPixelRatio(),gpuMemory:renderer.info.memory,frameSpikes:window.__frameSpikes,
      names:Object.entries(byName).sort((a,b)=>b[1]-a[1]).slice(0,15), materials:Object.entries(byMaterial).sort((a,b)=>b[1]-a[1]).slice(0,15)};
  })()`)
  const result = { query, cpu, fps: 1000 / timing.average, liquidMs, ...timing,
    scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000 / timing.count,
    startupBytes, transferBytes: [...browser.net.values()].filter(r=>r.url.startsWith('http')).reduce((sum, request) => sum + request.size, 0), ...scene, frameSpikes:gameFrameSpikes, logs: browser.logs }
  const label = (query.includes('frame=') ? 's14' : 'explore') + (cpu > 1 ? '-cpu4' : '') + (query.includes('webgl') ? '-webgl' : '')
  await browser.shot(`${output}/${label}.jpg`)
  fs.writeFileSync(`${output}/${label}.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  assert.equal(browser.logs.filter(l => l.startsWith('[exception]') || l.startsWith('[error]')).length, 0, 'No browser errors')
} finally { await browser.close() }
