import fs from 'node:fs'
import {launch,sleep} from './browser.mjs'
import {routeDriver} from './route.mjs'
const b=await launch({width:1280,height:720}),d=routeDriver(b,{skipScenes:false}),out='art/review/2026-11-11/revision/spoon'
fs.mkdirSync(out,{recursive:true})
try {
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&diagnostics`)
  await d.until(`!!document.getElementById('backend')?.textContent`);await b.click(640,360);await d.until('__tea.P.player.control')
  await b.evaluate(`(__tea.P.setSize('small',0),__tea.P.placePlayer(__tea.L.underTable.landing,0))`)
  await sleep(14000)
  for(const[x,z]of [[.1,-2.05],[.4,-2.05],[.4,-1.1],[2,-1.1],[4,-2.15]]){console.log('Walk',x,z);await d.walk(x,z,.07,20)}
  await b.shot(`${out}/exit.jpg`)
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:true,feet:await b.evaluate('__tea.P.player.feet.toArray()'),errors:b.logs},null,2))
} catch(e) {
  await b.shot(`${out}/failure.jpg`)
  const state=await b.evaluate(`(()=>{const p=__tea.P.player.feet,rows=[];__tea.world.forEachCollider(c=>{const q=c.projectPoint(p,true);if(q&&Math.hypot(q.point.x-p.x,q.point.y-p.y,q.point.z-p.z)<.25)rows.push({handle:c.handle,type:c.shapeType(),position:c.translation(),point:q.point,inside:q.isInside})});return {feet:p.toArray(),colliders:rows}})()`)
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:false,error:String(e),state,errors:b.logs},null,2));throw e
}finally{await b.close()}
