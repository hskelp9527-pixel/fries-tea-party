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
  }
  fs.writeFileSync(`${output}/seat-speed.json`,JSON.stringify({passed:true,rows},null,2));console.log(rows)
}finally{await b.close()}
