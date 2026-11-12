import assert from 'node:assert/strict'
import fs from 'node:fs'
import { launch, sleep } from './browser.mjs'

const output = 'art/review/2026-11-11/complete'
fs.mkdirSync(output, { recursive: true })
const fps = Number(process.argv.find(arg => arg.startsWith('--fps='))?.slice(6) ?? 30)
const capture=process.argv.includes('--capture')
if(capture)fs.mkdirSync(`${output}/clips`,{recursive:true})
const browser = await launch({ width: 1280, height: 720 })
const summary = { fps, definition: 'World-space arm segments versus head sphere and torso capsule. Proximal shoulder attachment excluded. This is a skeletal envelope audit, not a triangle-triangle surface proof.', clips: [], failures: [] }
try {
  await browser.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&quality=high&diagnostics`)
  const deadline = Date.now() + 120000
  while (Date.now() < deadline && !await browser.evaluate(`!!document.getElementById('backend')?.textContent`).catch(() => false)) await sleep(250)
  assert.ok(await browser.evaluate('!!window.__tea && !!window.__characterContacts'))
  await browser.click(640, 360)
  await sleep(1000)
  await browser.evaluate(`window.__clipInfo=__tea.K.clipInfo`)
  const inventory = await browser.evaluate(`(()=>{
    __tea.renderer.setAnimationLoop(null);__characterContacts.clear();
    return ['fries','hatter','hare','dormouse'].map(name=>{const animator=name==='fries'?__tea.P.anim:__tea.C.cast[name].anim;
      return {name,clips:Object.entries(animator.actions).map(([clip,action])=>({clip,duration:action.getClip().duration}))};});
  })()`)
  for (const { name, clips } of inventory) for (const { clip, duration } of clips) {
    const result = await browser.evaluate(`(()=>{
      const name=${JSON.stringify(name)},clip=${JSON.stringify(clip)},duration=${duration},fps=${fps};
      const actor=name==='fries'?__tea.P.player.mesh:__tea.C.cast[name].object;
      const animator=name==='fries'?__tea.P.anim:__tea.C.cast[name].anim;
      const seated=name!=='fries'&&name!=='dormouse'&&(clip.startsWith('sit_')||['show_watch','mend','butter','dunk_watch','stuff'].includes(clip));
      let minimumHead=Infinity,minimumTorso=Infinity,penetratingFrames=0;const examples=[];
      for(let frame=0;frame<=Math.ceil(duration*fps);frame++){
        const time=Math.min(duration,frame/fps);
        if(name==='fries'){
          animator.mixer.stopAllAction();animator.current=null;animator.play(clip,true);
          const action=animator.current;action.stopFading().setEffectiveWeight(1);action.time=time;action.paused=true;animator.mixer.update(0);if(__clipInfo(clip).posture==='upper')animator.standLowerBody();actor.updateWorldMatrix(true,true);
        }else __tea.C.sampleActorPose(name,clip,time,seated);
        __characterContacts.solve(actor);
        const metrics=__characterContacts.metrics().find(row=>row.character===name);
        let failed=false;
        for(const [side,arm] of Object.entries(metrics?.arms??{})){
          if(!arm)continue;minimumHead=Math.min(minimumHead,arm.head);minimumTorso=Math.min(minimumTorso,arm.torso);
          if(arm.head < -0.002 || arm.torso < -0.002){failed=true;if(examples.length<5)examples.push({frame,time,side,head:arm.head,torso:arm.torso,shoulder:arm.shoulder,elbow:arm.elbow,wrist:arm.wrist});}
        }
        if(failed)penetratingFrames++;
      }
      return {character:name,clip,duration,seated,samples:Math.ceil(duration*fps)+1,minimumHead,minimumTorso,penetratingFrames,examples};
    })()`)
    summary.clips.push(result)
    if (result.penetratingFrames) summary.failures.push(result)
    if(capture){
      for(const side of ['front','side']){
        await browser.evaluate(`(()=>{
          const t=__tea,name=${JSON.stringify(name)},clip=${JSON.stringify(clip)},info=__clipInfo(clip),actor=name==='fries'?t.P.player.mesh:t.C.cast[name].object;
          const animator=name==='fries'?t.P.anim:t.C.cast[name].anim,time=info.contact?.time??${duration}*(info.contact?.phase??.5);
          if(name==='fries'){animator.mixer.stopAllAction();animator.current=null;animator.play(clip,true);const a=animator.current;a.stopFading().setEffectiveWeight(1);a.time=time;a.paused=true;animator.mixer.update(0);if(info.posture==='upper')animator.standLowerBody();}
          else t.C.sampleActorPose(name,clip,time,${result.seated});
          __characterContacts.solve(actor);actor.updateWorldMatrix(true,true);
          for(const object of t.scene.children){let keep=object.isLight===true;for(let p=actor;p;p=p.parent)if(p===object)keep=true;object.visible=keep;}
          for(const id of ['hud','prompt','subtitle','controls','pause-open','scene-skip'])document.getElementById(id).hidden=true;
          const scale=actor.getWorldScale(t.camera.position.clone()).x,point=actor.getObjectByName('mixamorigHead').getWorldPosition(t.camera.position.clone());point.y-=.24*scale;
          const offset=point.clone().set(...(${JSON.stringify(side)}==='front'?[.12,.05,2.4]:[2.4,.05,.12])).multiplyScalar(scale).applyQuaternion(actor.getWorldQuaternion(actor.quaternion.clone()));
          t.camera.layers.enable(1);t.camera.fov=50;t.camera.near=.01;t.camera.updateProjectionMatrix();t.camera.position.copy(point).add(offset);t.camera.lookAt(point);t.renderer.render(t.scene,t.camera);return true;
        })()`)
        await browser.shot(`${output}/clips/${name}-${clip}-${side}.jpg`)
      }
      result.images=['front','side'].map(side=>`clips/${name}-${clip}-${side}.jpg`)
    }
    console.log(`${name}/${clip}: ${result.penetratingFrames} intersecting samples / ${result.samples}`)
  }
  summary.browserErrors = browser.logs.filter(log => log.startsWith('[exception]') || log.startsWith('[error]'))
  summary.sampleCount = summary.clips.reduce((sum, clip) => sum + clip.samples, 0)
  fs.writeFileSync(`${output}/contact-audit.json`, JSON.stringify(summary, null, 2))
  fs.writeFileSync(`${output}/contact-audit.md`, `# Runtime contact audit\n\n${summary.definition}\n\nSampling: ${fps} Hz, ${summary.sampleCount} poses.\n\n| Character | Clip | Samples | Intersecting samples | Head clearance | Torso clearance |\n|---|---|---:|---:|---:|---:|\n` + summary.clips.map(row => `| ${row.character} | ${row.clip} | ${row.samples} | ${row.penetratingFrames} | ${row.minimumHead.toFixed(4)} | ${row.minimumTorso.toFixed(4)} |`).join('\n'))
  if(capture)fs.writeFileSync(`${output}/clips/index.html`,`<!doctype html><meta charset="utf-8"><title>Animation contact sheets</title><style>body{background:#201c21;color:#efdbc1;font:16px system-ui}section{display:inline-block;width:48%;padding:1%}img{width:50%}h2{font-size:16px}</style><h1>71 clips: front and side at contact</h1>`+summary.clips.map(row=>`<section><h2>${row.character} / ${row.clip}: ${row.penetratingFrames} intersections in ${row.samples} samples</h2>${row.images.map(file=>`<img src="${file.slice(6)}" alt="${file}">`).join('')}</section>`).join(''))
  assert.equal(summary.browserErrors.length, 0, summary.browserErrors.join('\n'))
  assert.equal(summary.failures.length, 0, `${summary.failures.length} clips still intersect their skeletal envelopes; see contact-audit.json`)
} finally { await browser.close() }
