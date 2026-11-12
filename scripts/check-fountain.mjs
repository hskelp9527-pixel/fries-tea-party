import fs from 'node:fs'
import {launch,sleep}from'./browser.mjs'
import{routeDriver}from'./route.mjs'
const b=await launch({width:1440,height:900}),d=routeDriver(b),out='art/review/2026-11-11/revision/fountain';fs.mkdirSync(out,{recursive:true})
try{
  await b.goto('http://127.0.0.1:5199/?frame=s09&quality=high&diagnostics');await d.until(`document.getElementById('perf')?.textContent.includes('FPS')`)
  const rows=await b.evaluate(`(()=>{const rows=[];__tea.G.things.fountain.traverse(o=>{if(o.isMesh){o.userData.originalVisible=o.visible;rows.push({name:o.name,type:o.material.type,color:o.material.color?.getHexString(),vertices:o.geometry.attributes.position.count,liquid:!!o.geometry.attributes.liquidPart})}});return rows})()`)
  await b.shot(`${out}/all.jpg`)
  await b.evaluate(`__tea.G.things.fountain.traverse(o=>{if(o.isMesh)o.visible=o.material.type==='MeshPhysicalNodeMaterial'})`);await sleep(500);await b.shot(`${out}/liquids-only.jpg`)
  await b.evaluate(`__tea.G.things.fountain.traverse(o=>{if(o.isMesh)o.visible=o.material.type!=='MeshPhysicalNodeMaterial'&&o.userData.originalVisible})`);await sleep(500);await b.shot(`${out}/source-only.jpg`)
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({rows,logs:b.logs},null,2));console.log(rows)
}finally{await b.close()}
