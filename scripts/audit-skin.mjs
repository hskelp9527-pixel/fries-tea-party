import fs from 'node:fs'
import assert from 'node:assert/strict'
import {launch,sleep}from'./browser.mjs'
const b=await launch({width:1280,height:720})
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&quality=high&diagnostics`)
  for(let i=0;i<480&&!await b.evaluate(`!!document.getElementById('backend')?.textContent`).catch(()=>false);i++)await sleep(250)
  await b.click(640,360);await sleep(300)
  await b.evaluate(`window.__clipInfo=__tea.K.clipInfo`)
  const result=await b.evaluate(`(()=>{
    __tea.renderer.setAnimationLoop(null);__characterContacts.clear();const rows=[];
    for(const name of ['fries','hatter','hare','dormouse']){
      const actor=name==='fries'?__tea.P.player.mesh:__tea.C.cast[name].object,a=name==='fries'?__tea.P.anim:__tea.C.cast[name].anim;
      for(const [clip,action]of Object.entries(a.actions))for(const phase of [.12,.4,.65,.9]){
        const time=action.getClip().duration*phase;
        if(name==='fries'){a.mixer.stopAllAction();a.current=null;a.play(clip,true);a.current.stopFading().setEffectiveWeight(1);a.current.time=time;a.current.paused=true;a.mixer.update(0);if(__clipInfo(clip).posture==='upper')a.standLowerBody();actor.updateWorldMatrix(true,true)}
        else __tea.C.sampleActorPose(name,clip,time,clip.startsWith('sit_'));
        __characterContacts.solve(actor);actor.updateWorldMatrix(true,true);
        let maximum=1,count=0;const worst=[];
        actor.traverse(mesh=>{
          if(!mesh.isSkinnedMesh||/SpeechMouth|Eyelid/i.test(mesh.name))return;
          const p=mesh.geometry.attributes.position,index=mesh.geometry.index?.array,total=index?.length??p.count;
          const restA=actor.position.clone(),restB=restA.clone(),posedA=restA.clone(),posedB=restA.clone();
          const step=Math.max(3,Math.floor(total/600/3)*3);
          for(let edge=0;edge+1<total;edge+=step){
            const va=index?.[edge]??edge,vb=index?.[edge+1]??edge+1;
            restA.fromBufferAttribute(p,va).applyMatrix4(mesh.matrixWorld);restB.fromBufferAttribute(p,vb).applyMatrix4(mesh.matrixWorld);
            mesh.getVertexPosition(va,posedA).applyMatrix4(mesh.matrixWorld);mesh.getVertexPosition(vb,posedB).applyMatrix4(mesh.matrixWorld);
            const before=restA.distanceTo(restB),after=posedA.distanceTo(posedB),ratio=after/Math.max(.00001,before);maximum=Math.max(maximum,ratio);
            if(ratio>4&&after-before>.035){count++;if(worst.length<3){const joints=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;worst.push({mesh:mesh.name,va,vb,before,after,ratio,weights:[va,vb].map(v=>Array.from({length:4},(_,j)=>[mesh.skeleton.bones[joints.getComponent(v,j)].name,weights.getComponent(v,j)]))})}}
          }
        });rows.push({name,clip,phase,count,maximum,worst});
      }
    }return rows;
  })()`)
  const failures=result.filter(row=>row.count)
  fs.writeFileSync('art/review/2026-11-11/complete/skin-audit.json',JSON.stringify({definition:'Sampled triangle edges, four poses per clip. Fail if an edge grows beyond 4x and extends by more than 3.5 cm. Mouth and eyelid morphs excluded.',rows:result,failures},null,2))
  console.log(JSON.stringify(failures.slice(0,5),null,2));console.log(`${failures.length} stretched pose samples / ${result.length}`)
  assert.equal(failures.length,0,'See skin-audit.json for stretched surface edges')
}finally{await b.close()}
