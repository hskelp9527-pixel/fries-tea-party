import assert from 'node:assert/strict'
import fs from 'node:fs'
import {launch,sleep} from './browser.mjs'
const b=await launch({width:1280,height:720}),output='art/review/2026-11-11/revision'
fs.mkdirSync(output,{recursive:true})
async function until(expression,seconds=90){const end=Date.now()+seconds*1000;while(Date.now()<end){if(await b.evaluate(expression).catch(()=>false))return;await sleep(100)}throw Error(`Timed out: ${expression}`)}
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&diagnostics&quality=high`)
  await until(`!!document.getElementById('backend')?.textContent`);await b.click(640,360);await until('__tea.P.player.control')
  const seats=await b.evaluate(`__tea.C.chairs.map((c,i)=>({i,by:c.by,front:c.front.toArray()})).filter(c=>!c.by).slice(0,2)`)
  const rows=[]
  for(const chair of seats){
    await b.evaluate(`(()=>{const c=__tea.C.chairs[${chair.i}];__tea.P.placePlayer(c.front.toArray(),c.rot*180/Math.PI);return true})()`);await sleep(200)
    assert.equal(await b.evaluate(`document.getElementById('prompt').dataset.action`),'Sit down')
    await b.key('KeyE','e');await sleep(80)
    const state=await b.evaluate(`({rate:__tea.S.game.sceneRate,skipping:__tea.S.game.sceneSkipping,control:__tea.P.player.control})`)
    rows.push({chair:chair.i,...state});await b.shot(`${output}/seat-${chair.i}.jpg`)
    if(state.rate!==1){fs.writeFileSync(`${output}/seat-speed.json`,JSON.stringify({passed:false,rows},null,2));assert.equal(state.rate,1,'Every chair interaction must keep natural global time')}
    const started=Date.now()
    await until('__tea.S.game.sceneDepth===0')
    rows.at(-1).naturalEntrySeconds=(Date.now()-started)/1000
    await b.shot(`${output}/seat-${chair.i}-seated.jpg`)
    assert.equal(await b.evaluate('__tea.P.player.control'),false,'Seated players retain their seat until choosing to leave')
    const exit=rows.length===1?'KeyE':'KeyW'
    await b.key(exit,exit==='KeyE'?'e':'w');await until('__tea.P.player.control')
    rows.at(-1).exit=exit
    const standing=await b.evaluate(`(()=>{const c=__tea.C.chairs[${chair.i}],s=c.front.distanceTo(__tea.P.player.feet)<c.home.clone().multiplyScalar(2).sub(c.front).setY(0).distanceTo(__tea.P.player.feet)?c.front:c.home.clone().multiplyScalar(2).sub(c.front).setY(0);return {d:Math.hypot(s.x-__tea.P.player.feet.x,s.z-__tea.P.player.feet.z)}})()`)
    assert.ok(standing.d<0.15,`Fries must stand at the chair side after rising (off by ${standing.d})`)
    const moved=[]
    for(const [code,key] of [['KeyW','w'],['KeyA','a'],['KeyS','s'],['KeyD','d']]){
      const before=await b.evaluate('__tea.P.player.feet.toArray()');await b.send('Input.dispatchKeyEvent',{type:'keyDown',code,key});await sleep(1000);await b.send('Input.dispatchKeyEvent',{type:'keyUp',code,key});const after=await b.evaluate('__tea.P.player.feet.toArray()')
      moved.push(Math.hypot(after[0]-before[0],after[2]-before[2]));await sleep(150)
    }
    assert.ok(moved.filter(d=>d>=0.5).length>=2,`Fries must walk freely after rising, not stuck in the chair (${moved.map(d=>d.toFixed(2))})`)
  }
  fs.writeFileSync(`${output}/seat-speed.json`,JSON.stringify({passed:true,rows},null,2));console.log(rows)
}finally{await b.close()}
