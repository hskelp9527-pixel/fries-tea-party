import fs from 'node:fs'
import { launch, sleep } from './browser.mjs'
const output=process.env.TEA_OUT??'art/review/2026-11-11/complete/views';fs.mkdirSync(output,{recursive:true})
const address=process.env.TEA_URL??'http://127.0.0.1:5199'
const ids=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7).split(',')??[...Array.from({length:16},(_,i)=>`s${String(i+1).padStart(2,'0')}`),'fp_small','fp_giant']
const b=await launch({width:1600,height:900}),rows=[]
async function ready(){const end=Date.now()+120000;while(Date.now()<end){if(b.logs.some(log=>/^\[(error|exception)\]/.test(log)))throw Error(b.logs.join('\n'));if(await b.evaluate(`document.getElementById('perf')?.textContent.includes('FPS')`).catch(()=>false))return;await sleep(200)}throw Error('View failed to become ready')}
try{
  for(const id of ids){
    await b.goto(`${address}/?frame=${id}&quality=high&perf&diagnostics`);await ready();await sleep(700)
    const stats=await b.evaluate(`({panel:document.getElementById('perf').textContent,position:__tea.camera.position.toArray(),build:[...document.scripts].map(s=>s.src).filter(Boolean)})`)
    await b.evaluate(`['perf','hud','objective','prompt','controls','pause-open','task-hint'].forEach(id=>document.getElementById(id).hidden=true)`)
    await b.shot(`${output}/${id}.jpg`);rows.push({id,...stats,logs:[...b.logs]});console.log(`Captured ${id}`)
  }
  for(const id of process.argv.includes('--quick')?[]:['s01','s14','s12']){
    await b.goto(`${address}/?frame=${id}&quality=high&post=off&perf&diagnostics`);await ready();await sleep(700)
    await b.evaluate(`['perf','hud','objective','prompt','controls','pause-open','task-hint'].forEach(id=>document.getElementById(id).hidden=true)`)
    await b.shot(`${output}/${id}-no-post.jpg`);console.log(`Captured ${id} without post`)
  }
  const locations=[
    ['hall-front',`(()=>{const h=__tea.G.things.house;return [h.localToWorld(__tea.camera.position.clone().set(.35,2.35,2.1)).toArray(),h.localToWorld(__tea.camera.position.clone().set(.4,1.9,-1.2)).toArray()]})()`],
    ['hall-side',`(()=>{const h=__tea.G.things.house;return [h.localToWorld(__tea.camera.position.clone().set(2.2,2.25,-1.3)).toArray(),h.localToWorld(__tea.camera.position.clone().set(-1.3,1.8,.7)).toArray()]})()`],
    ['under-table-front',`[[-.55,.17,-1.2],[.1,.09,-2.5]]`],['under-table-side',`[[.85,.16,-2.5],[-.5,.12,-1.6]]`],
    ['rose-path-front',`[[-5.18,1.4,-16.19],[-1,1.4,-24]]`],['rose-path-side',`[[-.18,1.4,-24.85],[-4.5,1.3,-17.6]]`],
  ]
  if(process.argv.includes('--quick')){console.log('Focused captures complete');process.exitCode=0}
  else {
  await b.goto(`${address}/?frame=s16&quality=high&perf&diagnostics`);await ready()
  await b.evaluate(`['perf','hud','objective','prompt','controls','pause-open','task-hint'].forEach(id=>document.getElementById(id).hidden=true)`)
  for(const[name,expression]of locations){
    await b.evaluate(`(()=>{const [pos,look]=${expression};__tea.camera.position.set(...pos);__tea.camera.lookAt(...look);__tea.lens.target=__tea.camera.position.clone().set(...look);__tea.camera.fov=60;__tea.camera.updateProjectionMatrix();return true})()`)
    await sleep(800);await b.shot(`${output}/${name}.jpg`);console.log(`Captured ${name}`)
  }
  }
  const previous=process.argv.some(arg=>arg.startsWith('--only='))&&fs.existsSync(`${output}/frames.json`)?JSON.parse(fs.readFileSync(`${output}/frames.json`,'utf8')):[]
  const updated=new Map(previous.map(row=>[row.id,row]));for(const row of rows)updated.set(row.id,row)
  fs.writeFileSync(`${output}/frames.json`,JSON.stringify([...updated.values()],null,2))
}finally{await b.close()}
