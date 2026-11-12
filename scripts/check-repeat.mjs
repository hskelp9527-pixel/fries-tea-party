import fs from 'node:fs'
import assert from 'node:assert/strict'
import {launch,sleep}from'./browser.mjs'
import {routeDriver}from'./route.mjs'
const out='art/review/2026-11-11/revision/repeat';fs.mkdirSync(out,{recursive:true})
const b=await launch({width:1600,height:900}),d=routeDriver(b,{skipScenes:false});let stop
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&quality=high&diagnostics`);await d.until(`!!document.getElementById('backend')?.textContent`)
  await b.click(800,450);await d.until('__tea.P.player.control')
  // Seed only the repeat-history flag; movement, interaction, size change and
  // cleanup below all execute the real public game branches without skipping.
  await b.evaluate(`__tea.G.drinks.forEach(d=>d.used=true)`)
  await d.path([[-2.7,2.6],[-3,-4.5],[-1.48,-4.4]],.18)
  const before=await b.evaluate('__tea.liquids.counts()')
  stop=await b.record(`${out}/repeat-tea-cake.mp4`)
  const samples=await b.evaluate(`(()=>{window.__repeat=[];window.__repeatTimer=setInterval(()=>{const t=__tea,a=t.P.anim,p=t.P.player;__repeat.push({at:performance.now(),size:p.size,control:p.control,rate:t.S.game.sceneRate,action:a.current?.getClip().name,time:a.current?.time,cup:t.G.drinks[1].object.position.toArray(),surfaces:t.liquids.counts()})},50);return true})()`)
  await d.interact('Drink the blue tea',{skip:false})
  assert.equal(await b.evaluate('__tea.P.player.size'),'big')
  await b.shot(`${out}/after-tea.jpg`)
  await d.path([[-4.5,-5],[4,-3],[9,-7],[18,-10],[23,-13],[24,-18.45]],.45)
  await d.interact('Eat the cake',{skip:false})
  assert.equal(await b.evaluate('__tea.P.player.size'),'normal')
  await b.shot(`${out}/after-cake.jpg`)
  const result=await b.evaluate(`(()=>{clearInterval(__repeatTimer);return {samples:__repeat,after:__tea.liquids.counts(),cupHomeError:__tea.G.drinks[1].object.position.distanceTo(__tea.G.drinks[1].home),cinematic:__tea.P.player.cinematic}})()`)
  assert.ok(result.samples.every(s=>s.rate===1));assert.deepEqual(result.after,before);assert.ok(result.cupHomeError<.001);assert.equal(result.cinematic,false)
  // A separate controlled placement isolates interruption cleanup. This setup
  // is not part of the keyboard traversal evidence above.
  await b.evaluate(`__tea.P.placePlayer([-1.48,0,-4.4],90)`);await sleep(200)
  await d.interact('Drink the blue tea',{skip:false,control:false});await sleep(250);await b.key('Enter','Enter');await d.until('__tea.P.player.control')
  const interrupted=await b.evaluate(`({counts:__tea.liquids.counts(),cupHomeError:__tea.G.drinks[1].object.position.distanceTo(__tea.G.drinks[1].home),rate:__tea.S.game.sceneRate,cinematic:__tea.P.player.cinematic})`)
  assert.deepEqual(interrupted.counts,before);assert.ok(interrupted.cupHomeError<.001);assert.equal(interrupted.rate,1);assert.equal(interrupted.cinematic,false)
  const recording=await stop();stop=null
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:true,before,...result,interrupted,recording,errors:b.logs},null,2));console.log('Repeated tea/cake and Enter interruption: rate 1, returned control, liquids restored')
}finally{if(stop)await stop().catch(()=>{});await b.close()}
