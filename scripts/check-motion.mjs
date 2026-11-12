import assert from 'node:assert/strict'
import fs from 'node:fs'
import {launch,sleep}from'./browser.mjs'
const b=await launch({width:1280,height:720})
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&quality=high&diagnostics`)
  for(let i=0;i<480&&!await b.evaluate(`!!document.getElementById('backend')?.textContent`).catch(()=>false);i++)await sleep(250)
  await b.shot('art/review/2026-11-11/complete/ui-title.jpg')
  await b.click(640,360);await sleep(300)
  await b.key('Escape','Escape');await sleep(250)
  await b.shot('art/review/2026-11-11/complete/ui-pause.jpg')
  await b.key('Escape','Escape')
  await b.evaluate(`(()=>{__tea.A.setSubtitleLanguage('zh');__tea.A.say('OP-03');return true})()`)
  await sleep(180);await b.shot('art/review/2026-11-11/complete/ui-subtitle.jpg')
  const result=await b.evaluate(`new Promise(resolve=>{
    const actor=__tea.P.player.mesh,mouths=[],bones=[];actor.traverse(o=>{if(o.morphTargetDictionary?.mouth_open!==undefined)mouths.push(o);if(o.name.startsWith('secondary_'))bones.push({bone:o,rest:o.quaternion.clone()})});
    let maximumMouth=0,maximumSpring=0,subtitle='';const until=performance.now()+2200;
    function sample(){subtitle=document.getElementById('subtitle').textContent||subtitle;for(const m of mouths)maximumMouth=Math.max(maximumMouth,m.morphTargetInfluences[m.morphTargetDictionary.mouth_open]);for(const b of bones)maximumSpring=Math.max(maximumSpring,b.bone.quaternion.angleTo(b.rest));if(performance.now()<until)requestAnimationFrame(sample);else resolve({maximumMouth,maximumSpring,springBones:bones.length,subtitle,language:__tea.A.subtitleLanguage()})}sample();
  })`)
  assert.ok(result.maximumMouth>.04,'The actual recording opens the mouth morph')
  assert.ok(result.maximumSpring>.001,'Secondary bones move independently of the primary pose')
  assert.equal(result.language,'zh');assert.match(result.subtitle,/[\u4e00-\u9fff]/)
  await b.evaluate('__tea.A.stopSpeaking()');await sleep(900)
  fs.writeFileSync('art/review/2026-11-11/complete/motion-audio.json',JSON.stringify(result,null,2))
  assert.equal(b.logs.filter(log=>/^\[(error|exception)\]/.test(log)).length,0,b.logs.join('\n'))
  console.log(JSON.stringify(result))
}finally{await b.close()}
