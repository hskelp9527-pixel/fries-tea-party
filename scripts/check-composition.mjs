import fs from 'node:fs'
import {launch,sleep} from './browser.mjs'
import {routeDriver} from './route.mjs'
const b=await launch({width:1600,height:900}),d=routeDriver(b),out='art/review/2026-11-11/revision/composition';fs.mkdirSync(out,{recursive:true})
try{
  await b.goto('http://127.0.0.1:5199/?frame=s14&quality=high&diagnostics');await d.until(`document.getElementById('perf')?.textContent.includes('FPS')`)
  await b.evaluate(`['hud','controls','objective','prompt','pause-open'].forEach(id=>document.getElementById(id).hidden=true)`)
  const shots=[['close',[-5.5,2.8,1.5],[1,1.6,-8.5],58],['side',[-6.2,3.2,-.5],[1,1.65,-7.5],58],['wide',[-7,3.2,2],[2.5,1.8,-9],60],['hero',[-3.8,2.3,-1.5],[.2,1.3,-6],58]]
  for(const[name,pos,look,fov]of shots){
    await b.evaluate(`(()=>{const t=__tea;t.camera.position.set(...${JSON.stringify(pos)});t.camera.lookAt(...${JSON.stringify(look)});t.camera.fov=${fov};t.camera.updateProjectionMatrix()})()`)
    await sleep(750);await b.shot(`${out}/${name}.jpg`)
  }
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({shots,errors:b.logs},null,2))
}finally{await b.close()}
