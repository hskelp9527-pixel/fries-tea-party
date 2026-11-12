import assert from 'node:assert/strict'
import fs from 'node:fs'
import {launch,sleep} from './browser.mjs'
import {routeDriver} from './route.mjs'
const b=await launch({width:1440,height:900}),d=routeDriver(b,{skipScenes:false}),out='art/review/2026-11-11/revision/shrink'
fs.mkdirSync(out,{recursive:true})
let stopRecording
let result={passed:false,status:'running'}
const save=()=>fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2))
save()
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&diagnostics`)
  await d.until(`!!document.getElementById('backend')?.textContent`);await b.click(720,450);await d.until('__tea.P.player.control')
  await d.path([[-3,2.6],[-3,-5.55],[-1.48,-5.55]],.15)
  const originMs=await b.evaluate(`(()=>{window.__shrinkPoses=[];window.__leanCalibration=null;window.__shrinkTimer=setInterval(()=>{const t=__tea,m=t.C.cast.hatter;if(m.doing!=='lean_over')return;const v=t.camera.position.clone(),h=m.object.getObjectByName('mixamorigHead'),q=h.getWorldQuaternion(h.quaternion.clone());__leanCalibration??=q.clone().invert().multiply(m.object.getWorldQuaternion(m.object.quaternion.clone()));const forward=v.clone().set(0,0,1).applyQuaternion(q.multiply(__leanCalibration));__shrinkPoses.push({at:performance.now(),clip:m.anim.current?.getClip().name,time:m.anim.current?.time,head:h.getWorldPosition(v).toArray(),forward:forward.toArray(),left:m.object.getObjectByName('mixamorigLeftHand').getWorldPosition(v).toArray(),right:m.object.getObjectByName('mixamorigRightHand').getWorldPosition(v).toArray()})},250);return performance.now()})()`)
  stopRecording=await b.record(`${out}/natural-shrink.mp4`)
  await d.interact('Drink the pink tea',{skip:false});await sleep(250)
  const state=await b.evaluate(`({pitch:__tea.P.player.pitch,feet:__tea.P.player.feet.toArray(),view:__tea.P.player.view,direction:__tea.camera.getWorldDirection(__tea.camera.position.clone()).toArray()})`)
  await b.shot(`${out}/returned-control.jpg`)
  assert.ok(state.direction[1]<0&&state.direction[1]>-.5,'Free exploration must face the ground after shrinking')
  await d.path([[.1,-2.05],[.4,-2.05],[.4,-1.1],[2,-1.1],[4,-2.15]],.07)
  await b.shot(`${out}/outside-table.jpg`)
  const recording=await stopRecording();stopRecording=null
  const poses=await b.evaluate(`(clearInterval(__shrinkTimer),__shrinkPoses)`)
  result={passed:false,naturalScene:true,mousePitchInput:false,state,originMs,poses,recording,errors:b.logs};save()
  assert.ok(poses.length>5&&poses.every(p=>Math.max(p.left[1],p.right[1])<p.head[1]),'The authored lean must keep both hands below the head throughout the actual scene')
  const middle=poses.filter(p=>p.time>2&&p.time<6)
  assert.ok(middle.some(p=>p.head[0]>poses[0].head[0]+.15&&p.head[1]<poses[0].head[1]-.03&&p.forward[1]<-.4),'The head must actually bend forward and down toward the small player')
  result.passed=true;save()
}catch(e){result.passed=false;result.error=String(e);save();await b.shot(`${out}/failure.jpg`);throw e}finally{if(stopRecording)await stopRecording().catch(()=>{});await b.close()}
