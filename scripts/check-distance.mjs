import fs from 'node:fs'
import {launch,sleep}from'./browser.mjs'
import {routeDriver}from'./route.mjs'
const b=await launch({width:1600,height:900}),d=routeDriver(b),out='art/review/2026-11-11/revision/distance';fs.mkdirSync(out,{recursive:true})
try{
  await b.goto('http://127.0.0.1:5199/?frame=s14&quality=high&diagnostics');await d.until(`document.getElementById('perf')?.textContent.includes('FPS')`)
  await b.evaluate(`(()=>{let t=__tea;t.camera.position.set(-3.8,2.3,-1.5);t.camera.lookAt(.2,1.3,-6);t.camera.fov=58;t.camera.updateProjectionMatrix();t.scene.children.find(o=>o.geometry?.type==='PlaneGeometry'&&o.geometry.attributes.position.count>10000).name='Terrain';for(const id of ['hud','controls','objective','prompt','pause-open','perf'])document.getElementById(id).hidden=true})()`)
  for(const [name,code]of [['current',''],['no-terrain',`__tea.scene.getObjectByName('Terrain').visible=false`],['no-paint',`__tea.scene.getObjectByName('Terrain').visible=true;__tea.scene.getObjectByName('Painted distance').visible=false`],['no-fog',`__tea.scene.getObjectByName('Painted distance').visible=true;__tea.scene.fogNode=null`]]){
    if(code)await b.evaluate(code);await sleep(700);await b.shot(`${out}/${name}.jpg`)
  }
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({errors:b.logs},null,2))
}finally{await b.close()}
