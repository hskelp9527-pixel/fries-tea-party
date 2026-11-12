import fs from 'node:fs'
import assert from 'node:assert/strict'
import {launch,sleep}from'./browser.mjs'
import {routeDriver}from'./route.mjs'
const out='art/review/2026-11-11/revision/speech';fs.mkdirSync(out,{recursive:true})
const b=await launch({width:1100,height:850}),d=routeDriver(b),rows=[];let stop
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&quality=high&diagnostics`);await d.until(`!!document.getElementById('backend')?.textContent`);await b.click(550,425);await d.until('__tea.P.player.control')
  for(const[name,line]of [['fries','OP-03'],['hatter','OP-04'],['hare','OP-08'],['dormouse','OP-10']]){
    await b.evaluate(`(()=>{const t=__tea,p=t.P.player;p.control=false;p.cinematic=true;const actor=${JSON.stringify(name)}==='fries'?p.mesh:t.C.cast[${JSON.stringify(name)}].object;for(const o of t.scene.children){let keep=o.isLight;for(let a=actor;a;a=a.parent)if(a===o)keep=true;o.visible=!!keep}const point=actor.getObjectByName('mixamorigHead').getWorldPosition(t.camera.position.clone());point.y+=.035;const offset=point.clone().set(.28,.02,.9).applyQuaternion(actor.getWorldQuaternion(actor.quaternion.clone()));t.camera.position.copy(point).add(offset);t.camera.lookAt(point);t.camera.fov=42;t.camera.near=.01;t.camera.updateProjectionMatrix();for(const id of ['hud','controls','objective','prompt','pause-open','task-hint','scene-skip'])document.getElementById(id).hidden=true;t.A.say(${JSON.stringify(line)});return true})()`)
    stop=await b.record(`${out}/${name}.mp4`)
    let maximum=0
    for(let i=0;i<16;i++){
      await sleep(180)
      const morph=await b.evaluate(`(()=>{const actor=${JSON.stringify(name)}==='fries'?__tea.P.player.mesh:__tea.C.cast[${JSON.stringify(name)}].object;let value=0;actor.traverse(o=>{if(o.morphTargetDictionary?.mouth_open!==undefined)value=Math.max(value,o.morphTargetInfluences[o.morphTargetDictionary.mouth_open])});return value})()`)
      maximum=Math.max(maximum,morph);if([2,6,10,14].includes(i))await b.shot(`${out}/${name}-${i}.jpg`)
    }
    const recording=await stop();stop=null;rows.push({name,line,maximum,recording});assert.ok(maximum>.04)
    await b.evaluate('__tea.A.stopSpeaking()');await sleep(250)
  }
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({rows,errors:b.logs,scope:'Live recordings drive actual shipped models/mouth morphs under a diagnostic face camera; separate from natural story camera evidence'},null,2));console.log('All four shipped faces respond to actual recorded speech')
}finally{if(stop)await stop().catch(()=>{});await b.close()}
