import fs from 'node:fs'
import assert from 'node:assert/strict'
import { launch, sleep } from './browser.mjs'

const output = 'art/review/2026-11-11/complete/contacts'
fs.mkdirSync(output, { recursive: true })
const browser = await launch({ width: 1280, height: 900 })
const poses = [
  { name: 'drink', clip: 'drink', time: 4.88, prop: 'blue-cup' },
  { name: 'gear-tree', clip: 'reach', time: 4, prop: 'gear0' },
  { name: 'gear-fountain', clip: 'reach', time: 4, prop: 'gear1' },
  { name: 'gear-hall', clip: 'reach', time: 4, prop: 'gear2' },
  { name: 'page', clip: 'reach', time: 4, prop: 'page' },
  { name: 'clap', clip: 'clap', time: 0.18 },
  { name: 'watch', character: 'hatter', clip: 'mend', phase: 0.5, prop: 'watch' },
  { name: 'spoon', character: 'hare', clip: 'lay_spoon', phase: 0.6, prop: 'spoon' },
]
const rows = []
try {
  await browser.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&quality=high&diagnostics`)
  const deadline = Date.now() + 120000
  while (Date.now() < deadline && !await browser.evaluate(`!!document.getElementById('backend')?.textContent`).catch(() => false)) await sleep(250)
  assert.ok(await browser.evaluate('!!window.__tea && !!window.__characterContacts'))
  await browser.click(640, 450)
  await sleep(1000)
  await browser.evaluate(`(async()=>{__tea.renderer.setAnimationLoop(null);window.__clipInfo=__tea.K.clipInfo;window.__propStaging=__tea.PS;for(const id of ['hud','subtitle','prompt','objective','task-hint','pause-open','scene-skip','controls'])document.getElementById(id).hidden=true;return true})()`)
  for (const pose of poses) {
    const row = await browser.evaluate(`(async()=>{
      const pose=${JSON.stringify(pose)},t=__tea,h=__characterContacts;
      h.clear();
      h.setTarget(t.P.player.mesh,'right',null);
      const character=pose.character??'fries',actor=character==='fries'?t.P.player.mesh:t.C.cast[character].object;
      const animator=character==='fries'?t.P.anim:t.C.cast[character].anim;
      const clip=animator.actions[pose.clip].getClip(),time=pose.time??clip.duration*(pose.phase??0.5);
      if(character==='fries'){
        const gear=pose.prop?.startsWith('gear')?t.G.gears[Number(pose.prop.slice(4))]:null;
        t.P.setSize(gear?.by??'normal',0);t.P.updatePlayer(0.001);
        t.P.placePlayer(gear?.stand??(pose.prop==='blue-cup'?t.G.drinks[1].stand:pose.prop==='page'?t.L.page.stand:[-3.5,0,1.8]),gear?.rot??0);
        animator.mixer.stopAllAction();animator.current=null;animator.play(pose.clip,true);const action=animator.current;
        action.stopFading().setEffectiveWeight(1);action.time=time;action.paused=true;animator.mixer.update(0);
      }else t.C.sampleActorPose(character,pose.clip,time,false);
      if(pose.prop==='watch'){
        actor.position.set(-2.5,0,-6.85);actor.rotation.y=0;t.C.sampleActorPose(character,pose.clip,time,false);
        t.P.setSize('normal',0);t.P.updatePlayer(.001);t.P.placePlayer([-2.5,0,-6.05],180);
        const a=t.P.anim;a.mixer.stopAllAction();a.current=null;a.play('mend',true);a.current.stopFading().setEffectiveWeight(1);a.current.time=time;a.current.paused=true;a.mixer.update(0);
      }
      let prop;
      if(pose.prop==='blue-cup'){const drink=t.G.drinks[1];prop=drink.object;h.hold(prop,drink);}
      else if(pose.prop?.startsWith('gear')){const gear=t.G.gears[Number(pose.prop.slice(4))];prop=gear.object;prop.visible=true;prop.position.copy(gear.pos);h.hold(prop,{clip:pose.clip,grip:gear.grip});}
      else if(pose.prop==='page'){prop=t.G.things.book_page;prop.visible=true;actor.getObjectByName('mixamorigRightHand').getWorldPosition(prop.position);h.hold(prop,{clip:'reach',grip:[0,0.05,0.007]});}
      else if(pose.prop==='watch'){
        const r=t.L.repair,work=actor.position.clone().set(...r.centre);prop=t.G.things.pocket_watch;prop.visible=true;prop.scale.multiplyScalar(r.scale);prop.rotation.set(-Math.PI/2,0,0);__propStaging.centreProp(prop,work)
        for(const owner of [actor,t.P.player.mesh])for(const side of ['left','right']){const[x,y,z]=r.hands[owner===actor?'hatter':'fries'];h.setTarget(owner,side,work.clone().add(owner.position.clone().set((side==='left'?-1:1)*x,y,z)))}
      }
      else if(pose.prop==='spoon'){
        if(!t.M?.model)throw new Error('Expose models namespace as __tea.M for spoon capture');
        prop=t.M.model('spoon');t.scene.add(prop);const [from,to]=t.L.underTable.spoon.map(p=>actor.position.clone().set(...p)),bridge=__propStaging.spoonBridge(prop,from,to)
        prop.quaternion.copy(actor.getWorldQuaternion(actor.quaternion.clone())).multiply(actor.quaternion.clone().setFromAxisAngle(actor.position.clone().set(0,1,0),Math.PI/2));h.holdCastAt(prop,actor,'RightHand',bridge.handle)
      }
      if(character==='fries'&&__clipInfo(pose.clip).posture==='upper')animator.standLowerBody();
      if(pose.prop==='watch')t.P.anim.standLowerBody();
      h.update(0.5);h.update(1/60);
      for(const object of t.scene.children){let keep=object.isLight===true;for(const child of [actor,prop,...(pose.prop==='watch'?[t.P.player.mesh]:[])])for(let p=child;p;p=p.parent)if(p===object)keep=true;object.visible=keep;}
      document.getElementById('controls').hidden=true;
      window.__reviewProp=prop
      let gearIntrusions=0
      if(pose.prop?.startsWith('gear')){
        const v=actor.position.clone();actor.updateWorldMatrix(true,true);prop.updateWorldMatrix(true,true)
        actor.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const joints=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;if(!joints)return
          for(let i=0;i<joints.count;i++){let share=0;for(let k=0;k<4;k++)if(/Hand|ForeArm/.test(mesh.skeleton.bones[joints.getComponent(i,k)]?.name))share+=weights.getComponent(i,k);if(share<.65)continue
            mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);prop.worldToLocal(v);if(Math.abs(v.y)<.0062&&Math.hypot(v.x,v.z)<.0295)gearIntrusions++
          }
        })
      }
      return {name:pose.name,character,clip:pose.clip,time,mouth:h.mouthPoint(actor).toArray(),prop:prop?.getWorldPosition(actor.position.clone()).toArray(),propScale:prop?.scale.toArray(),pinchGap:prop?.userData.pinchGap,gearIntrusions,metrics:h.metrics().find(row=>row.character===character)};
    })()`)
    rows.push(row)
    for (const side of ['front', 'side']) {
      await browser.evaluate(`(()=>{
        if(${JSON.stringify(pose.prop)}==='watch'){const t=__tea,work=t.camera.position.clone().set(...t.L.repair.centre),offset=work.clone().set(...(${JSON.stringify(side)}==='front'?[-.85,.93,.05]:[.4,.95,.4]));t.camera.layers.enable(1);t.camera.position.copy(work).add(offset);t.camera.lookAt(work);t.camera.fov=42;t.camera.updateProjectionMatrix();t.renderer.render(t.scene,t.camera);return}
        const actor=${JSON.stringify(pose.character ?? 'fries')}==='fries'?__tea.P.player.mesh:__tea.C.cast[${JSON.stringify(pose.character ?? 'fries')}].object;
        const head=actor.getObjectByName('mixamorigHead'),scale=actor.getWorldScale(actor.position.clone()).x;const point=head.getWorldPosition(__tea.camera.position.clone());point.y-=0.18*scale;
        __tea.camera.layers.enable(1);__tea.camera.fov=40;__tea.camera.near=0.02;__tea.camera.updateProjectionMatrix();
        const offset=point.clone().set(...(${JSON.stringify(side)}==='front'?[0.3,0.1,1.65]:[1.65,0.1,0.2])).multiplyScalar(scale).applyQuaternion(actor.getWorldQuaternion(actor.quaternion.clone()));
        __tea.camera.position.copy(point).add(offset);
        __tea.camera.lookAt(point);__tea.renderer.render(__tea.scene,__tea.camera);return true;
      })()`)
      await browser.shot(`${output}/${pose.name}-${side}.jpg`)
    }
    if(pose.prop&&pose.prop!=='watch')for(const side of ['front','side']){
      await browser.evaluate(`(()=>{const t=__tea,prop=__reviewProp,point=prop.getWorldPosition(t.camera.position.clone()),actor=${JSON.stringify(pose.character??'fries')}==='fries'?t.P.player.mesh:t.C.cast[${JSON.stringify(pose.character??'fries')}].object,scale=actor.getWorldScale(actor.position.clone()).x;
        const distance=Math.max(.25*scale,${pose.prop==='spoon'?1.0:.25});let offset=point.clone().set(...(${JSON.stringify(side)}==='front'?[.08,distance,.1]:[distance,.12,.08]));if(${JSON.stringify(pose.prop)}==='spoon')offset.set(...(${JSON.stringify(side)}==='front'?[.1,.15,.8]:[.8,.12,.1])).applyQuaternion(actor.getWorldQuaternion(actor.quaternion.clone()));t.camera.position.copy(point).add(offset);t.camera.lookAt(point);t.camera.fov=40;t.camera.updateProjectionMatrix();t.renderer.render(t.scene,t.camera)})()`)
      await browser.shot(`${output}/${pose.name}-prop-${side}.jpg`)
    }
    if(pose.prop==='page'){
      await browser.evaluate(`(()=>{const t=__tea,prop=__reviewProp,point=t.camera.position.clone().set(...prop.userData.pinchPoint),normal=point.clone().set(0,.15,1).applyQuaternion(t.P.player.mesh.quaternion).normalize(),right=point.clone().set(1,0,0).applyQuaternion(t.P.player.mesh.quaternion);t.camera.position.copy(point).addScaledVector(normal,-.3).addScaledVector(right,.2).add(point.clone().set(0,.055,0));t.camera.lookAt(point);t.camera.fov=35;t.camera.near=.005;t.camera.updateProjectionMatrix();t.renderer.render(t.scene,t.camera)})()`)
      await browser.shot(`${output}/page-pinch-back.jpg`)
    }
  }
  fs.writeFileSync(`${output}/contacts.json`, JSON.stringify(rows, null, 2))
  assert.ok(rows.filter(r=>r.name.startsWith('gear')).every(r=>r.gearIntrusions===0),'Hands and forearms must stay out of the entire gear disc, including its central hole')
  console.log(`${rows.length} contact poses captured from front and side`)
  assert.equal(browser.logs.filter(log => log.startsWith('[exception]') || log.startsWith('[error]')).length, 0, browser.logs.join('\n'))
} finally { await browser.close() }
