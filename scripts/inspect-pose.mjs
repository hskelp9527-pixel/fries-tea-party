import{launch,sleep}from'./browser.mjs'
import fs from 'node:fs'
const b=await launch({width:1280,height:720})
try{
  for(const frame of ['s10','s12']){
    await b.goto(`http://127.0.0.1:5199/?frame=${frame}&perf&quality=high&diagnostics`)
    for(let i=0;i<480&&!await b.evaluate(`document.getElementById('perf')?.textContent.includes('FPS')`).catch(()=>false);i++)await sleep(250)
    const pose=await b.evaluate(`(()=>{const t=__tea,p=t.P.player,v=t.camera.position.clone();let low=Infinity;p.mesh.updateMatrixWorld(true);p.mesh.traverse(m=>{if(m.isSkinnedMesh)for(let i=0;i<m.geometry.attributes.position.count;i++)low=Math.min(low,m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld).y)});return {feet:p.feet.toArray(),size:p.p.scale,low,root:p.mesh.position.toArray(),standing:t.P.anim.standPose.map(p=>({name:p.bone.name,position:p.position.toArray()})),bones:['Hips','LeftFoot','RightFoot','LeftHand','RightHand'].map(name=>({name,position:p.mesh.getObjectByName('mixamorig'+name).getWorldPosition(v).toArray()})),watch:{position:t.G.things.pocket_watch.position.toArray(),visible:t.G.things.pocket_watch.visible,scale:t.G.things.pocket_watch.scale.toArray()},mouth:__characterContacts.mouthPoint(t.C.cast.hatter.object).toArray()}})()`)
    pose.metrics=await b.evaluate('__characterContacts.metrics()');fs.writeFileSync(`art/review/2026-11-11/complete/${frame}-pose.json`,JSON.stringify(pose,null,2));console.log(frame,JSON.stringify(pose))
    await b.evaluate(`document.getElementById('perf').hidden=true`);await b.shot(`art/review/2026-11-11/complete/views/${frame}.jpg`)
    if(frame==='s12')for(const[x,y,z]of[[-3.7,1.05,-6.45],[-3.5,1.3,-6.45],[-3.3,1.4,-7.2]]){
      await b.evaluate(`(()=>{__tea.camera.position.set(${x},${y},${z});__tea.camera.lookAt(-2.5,1.02,-6.45);return true})()`);await sleep(300);await b.shot(`art/review/2026-11-11/complete/watch-${y}.jpg`)
    }
  }
}finally{await b.close()}
