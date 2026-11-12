import fs from 'node:fs'
import assert from 'node:assert/strict'
import {launch,sleep}from'./browser.mjs'
const output='art/review/2026-11-11/revision/drink';fs.mkdirSync(output,{recursive:true})
const b=await launch({width:1100,height:850})
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&diagnostics&quality=high`)
  for(let i=0;i<480&&!await b.evaluate(`!!document.getElementById('backend')?.textContent`).catch(()=>false);i++)await sleep(250)
  await b.click(550,425);await sleep(300)
  await b.evaluate(`(()=>{const t=__tea;t.renderer.setAnimationLoop(null);t.P.player.control=false;t.P.placePlayer([-1.45,0,-4.407],90);t.P.anim.mixer.stopAllAction();t.P.anim.current=null;t.P.act('drink');__characterContacts.hold(t.G.drinks[1].object,t.G.drinks[1]);for(const o of t.scene.children){let keep=o.isLight;for(const c of [t.P.player.mesh,t.G.drinks[1].object])for(let p=c;p;p=p.parent)if(p===o)keep=true;o.visible=!!keep;}for(const id of ['hud','prompt','subtitle','controls','pause-open','objective','task-hint'])document.getElementById(id).hidden=true;return true})()`)
  const times=[0,.6,1.6,2.6,3.6,4.2,4.88,5.3,6.2,7,8,8.8],rows=[]
  for(const time of times){
    const row=await b.evaluate(`(()=>{
      const t=__tea,p=t.P.player,a=t.P.anim,cup=t.G.drinks[1].object,v=t.camera.position.clone();a.current.time=${time};a.current.paused=true;a.current.stopFading().setEffectiveWeight(1);a.mixer.update(0);a.standLowerBody();__characterContacts.update(1/60);p.mesh.updateMatrixWorld(true);__characterContacts.update(1/60);p.mesh.updateMatrixWorld(true);
      let eyelidLow=Infinity,eyelidHigh=-Infinity;p.mesh.traverse(m=>{if(m.isSkinnedMesh&&/eyelid/i.test(m.name))for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);eyelidLow=Math.min(eyelidLow,v.y);eyelidHigh=Math.max(eyelidHigh,v.y)}});
      const mouth=__characterContacts.mouthPoint(p.mesh),rim=cup.localToWorld(v.clone().set(0,.065,0));
      let fingersInside=0;
      p.mesh.traverse(m=>{if(!m.isSkinnedMesh)return;const joints=m.geometry.attributes.skinIndex,weights=m.geometry.attributes.skinWeight;if(!joints)return;for(let i=0;i<joints.count;i++){let share=0;for(let k=0;k<4;k++)if(/Hand/.test(m.skeleton.bones[joints.getComponent(i,k)]?.name))share+=weights.getComponent(i,k);if(share<.65)continue;m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);cup.worldToLocal(v);const inner=.027+.015*(v.y-.005)/.06-.005;if(v.y>.006&&v.y<.062&&Math.hypot(v.x,v.z)<inner)fingersInside++}});
      const contact=cup.localToWorld(v.clone().set(0,.065,-.044));
      return {time:${time},mouth:mouth.toArray(),rim:rim.toArray(),mouthGap:mouth.distanceTo(contact),fingersInside,eyelidLow,eyelidHigh,aboveEyes:rim.y>eyelidLow-.008,metrics:__characterContacts.metrics().find(m=>m.character==='fries')};
    })()`);rows.push(row)
    for(const angle of ['front','side']){
      await b.evaluate(`(()=>{const t=__tea,p=t.P.player;const point=p.mesh.localToWorld(t.camera.position.clone().set(0,.87,.05)),offset=point.clone().set(...(${JSON.stringify(angle)}==='front'?[.3,.08,1.55]:[1.45,.05,.3])).applyQuaternion(p.mesh.quaternion);t.camera.layers.enable(1);t.camera.fov=38;t.camera.updateProjectionMatrix();t.camera.position.copy(point).add(offset);t.camera.lookAt(point);t.renderer.render(t.scene,t.camera);return true})()`)
      await b.shot(`${output}/${time}-${angle}.jpg`)
    }
  }
  fs.writeFileSync(`${output}/timeline.json`,JSON.stringify({rows,errors:b.logs},null,2));console.log(rows.map(({time,aboveEyes,rim,eyelidLow})=>({time,aboveEyes,rimHeight:rim[1],eyelidLow})))
  assert.equal(rows.filter(r=>r.aboveEyes).length,0,'The cup rim must stay below the protected eye/glasses band for the entire performance')
  assert.ok(rows.filter(r=>r.time>=4.2&&r.time<=5.3).every(r=>r.mouthGap<.01),'The actual back rim must meet the actual lip landmark during sipping')
  assert.equal(rows.reduce((sum,r)=>sum+r.fingersInside,0),0,'Finger skin must not enter the tea cavity')
}finally{await b.close()}
