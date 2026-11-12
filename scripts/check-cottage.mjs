import assert from 'node:assert/strict'
import fs from 'node:fs'
import{launch,sleep}from'./browser.mjs'
import{routeDriver}from'./route.mjs'
const b=await launch({width:1440,height:900}),drive=routeDriver(b,{skipScenes:false}),output='art/review/2026-11-11/revision/cottage';fs.mkdirSync(output,{recursive:true})
let stopRecording
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&diagnostics&quality=high`)
  await drive.until(`!!document.getElementById('backend')?.textContent`);await b.click(720,450);await drive.until('__tea.P.player.control')
  stopRecording=await b.record(`${output}/house-walkthrough.mp4`)
  await drive.path([[-3,2.6],[-3,-4.5],[-3.4,-8.8],[3,-8.8],[5.8,-7.3],[8,-8],[9,-11],[10,-13.5],[10,-15.2],[13,-15.2],[13,-16.5],[14.6,-16.5],[14.6,-17.85],[16,-19],[20.5,-22]],.2)
  const points=await b.evaluate(`(()=>{const h=__tea.G.things.house,v=__tea.camera.position.clone();return [[1.3,0,5],[1.3,0,3.9],[1.3,1.1,2.2],[.7,1.1,.7],[-1,1.1,-.7],[-.85,1.1,-1.2],[.7,1.1,.7],[2.05,1.1,.4],[1.183,1.1,-1.15],[.15,1.1,-1.35],[1.3,1.1,2.2],[1.3,0,3.9],[1.3,0,5]].map(p=>h.localToWorld(v.set(...p)).toArray())})()`)
  await drive.walk(points[0][0],points[0][2],.2)
  const rows=[]
  const views=new Map([[1,['entry',[.3,2,-.8]]],[2,['living',[-1.8,1.8,1.15]]],[4,['bedroom',[-1.9,1.8,-1.6]]],[6,['kitchen',[3,2.1,.4]]],[7,['hearth',[1.28,1.8,-2.08]]]])
  for(const[index,p]of points.slice(1).entries()){
    await drive.walk(p[0],p[2],.14,30)
    const state=await b.evaluate(`(()=>{const p=__tea.P.player;return {feet:p.feet.toArray(),local:__tea.G.things.house.worldToLocal(p.feet.clone()).toArray(),prompt:document.getElementById('prompt').textContent}})()`);rows.push({index,...state});console.log(index,state.local)
    if(index===7){await drive.interact('Pick up the gear',{skip:false});assert.equal(await b.evaluate('__tea.S.game.gears'),1)}
    if(index===8){await b.key('KeyE','e');await sleep(650);await b.shot(`${output}/note.jpg`);await drive.until('__tea.P.player.control')}
    if(views.has(index)){
      const[name,look]=views.get(index)
      await b.key('KeyV','v')
      await b.evaluate(`(()=>{const t=__tea,p=t.P.player,look=t.G.things.house.localToWorld(t.camera.position.clone().set(...${JSON.stringify(look)}));const dx=look.x-p.feet.x,dz=look.z-p.feet.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(look.y-p.feet.y-1.1,Math.hypot(dx,dz));return true})()`)
      await sleep(400);await b.shot(`${output}/${name}.jpg`);await b.key('KeyV','v')
    }
  }
  assert.equal(b.logs.filter(l=>/^\[(error|exception)\]/.test(l)).length,0,b.logs.join('\n'))
  const recording=await stopRecording();stopRecording=null
  fs.writeFileSync(`${output}/walkthrough.json`,JSON.stringify({passed:true,route:'Real keyboard/controller from the tea-table hub, up all ordinary stairs, through every room, actual pickup/note and exit; no placement or jump',rows,recording},null,2))
}catch(e){await b.shot(`${output}/failure.jpg`);fs.writeFileSync(`${output}/failure.json`,JSON.stringify({error:String(e),logs:b.logs},null,2));throw e}finally{if(stopRecording)await stopRecording().catch(()=>{});await b.close()}
