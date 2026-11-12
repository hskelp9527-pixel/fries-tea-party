import fs from 'node:fs'
import assert from 'node:assert/strict'
import {launch}from'./browser.mjs'
import{routeDriver}from'./route.mjs'
const b=await launch({width:1280,height:900}),d=routeDriver(b),out='art/review/2026-11-11/revision/lean';fs.mkdirSync(out,{recursive:true})
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&quality=high&diagnostics`);await d.until(`!!document.getElementById('backend')?.textContent`);await b.click(640,450);await d.until('__tea.P.player.control')
  await b.evaluate(`(()=>{const t=__tea;t.renderer.setAnimationLoop(null);const m=t.C.cast.hatter;m.object.rotation.set(0,0,0);m.object.position.set(0,0,0);t.C.sampleActorPose('hatter','lean_over',0,false);const h=m.object.getObjectByName('mixamorigHead');window.__leanAxes=h.getWorldQuaternion(h.quaternion.clone()).invert().multiply(m.object.getWorldQuaternion(m.object.quaternion.clone()));return true})()`)
  const rows=[]
  for(const time of [0,1,2,3,4,6,8,9]){
    rows.push(await b.evaluate(`(()=>{const t=__tea,m=t.C.cast.hatter;t.C.sampleActorPose('hatter','lean_over',${time},false);const h=m.object.getObjectByName('mixamorigHead'),head=h.getWorldPosition(t.camera.position.clone()),forward=head.clone().set(0,0,1).applyQuaternion(h.getWorldQuaternion(h.quaternion.clone()).multiply(__leanAxes));return{time:${time},head:head.toArray(),forward:forward.toArray()}})()`))
  }
  fs.writeFileSync(`${out}/pose.json`,JSON.stringify({rows,errors:b.logs},null,2));console.log(rows)
  assert.ok(rows.some(r=>r.time>2&&r.time<6&&r.head[2]>rows[0].head[2]+.15&&r.head[1]<rows[0].head[1]-.03&&r.forward[1]<-.4))
}finally{await b.close()}
