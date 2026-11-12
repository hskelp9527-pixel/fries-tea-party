import assert from 'node:assert/strict'
import fs from 'node:fs'
import {launch,sleep} from './browser.mjs'
import {routeDriver} from './route.mjs'
const skipScenes=!process.argv.includes('--no-skip'),challenges=process.argv.includes('--challenges')
const browser=await launch({width:1600,height:900}),drive=routeDriver(browser,{skipScenes})
const output=`art/review/2026-11-11/revision/${challenges?'challenges':skipScenes?'standard-quick':'standard-full'}`;fs.mkdirSync(output,{recursive:true})
const address=()=>`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?quality=high&diagnostics${challenges?'&challenges':''}`
const log=[],mark=text=>{log.push(text);console.log(text)}
let stopRecording, recording,recordingOriginMs
const languageStages=[]
const frameStages=[]
try{
  await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__playEvidence=[];addEventListener('DOMContentLoaded',()=>{const last=new Map();setInterval(()=>{for(const id of ['subtitle','objective','prompt','task-hint','controls','rhythm-instruction']){const element=document.getElementById(id),text=element?.textContent.trim();if(text&&last.get(id)!==text){last.set(id,text);__playEvidence.push({at:performance.now(),id,lineId:id==='subtitle'?window.__tea?.A.currentLine():undefined,text})}}},100)})`})
  await browser.goto(address())
  await drive.until(`!!document.getElementById('backend')?.textContent`)
  if(!skipScenes){recordingOriginMs=await browser.evaluate('performance.now()');stopRecording=await browser.record(`${output}/ordinary-playthrough.mp4`)}
  await browser.click(800,450);await sleep(300);if(skipScenes)await browser.key('Enter','Enter')
  await drive.until('__tea.P.player.control',80)
  const recovery=await browser.evaluate(`(async()=>{try{await __tea.runScene(async()=>{throw Error('test recovery')})}catch{}return __tea.P.player.control&&!__tea.P.player.cinematic})()`)
  assert.ok(recovery)
  await browser.key('Escape','Escape');const before=await browser.evaluate('__tea.S.game.elapsed');await sleep(600)
  assert.equal(await browser.evaluate('__tea.S.game.elapsed'),before);await browser.key('Escape','Escape')
  mark('Opening, scene error recovery and pause passed')
  await drive.walk(-1.48,-4.4,.18);await drive.interact('Drink the blue tea')
  assert.equal(await browser.evaluate('__tea.P.player.size'),'big')
  await drive.walk(-4.48,-8.0,.4)
  await drive.interact('Pick up the gear',{skip:false,control:!challenges});if(challenges)await drive.puzzle()
  assert.equal(await browser.evaluate('__tea.S.game.gears'),1)
  mark('Walked from the opening to blue tea and collected the tree gear')
  await drive.path([[-4.5,-5],[4,-3],[9,-7],[18,-10],[23,-13],[24,-18.45]],.45)
  await drive.interact('Eat the cake')
  assert.equal(await browser.evaluate('__tea.P.player.size'),'normal')
  const cottage=await browser.evaluate(`(()=>{const h=__tea.G.things.house,v=__tea.camera.position.clone();return [[1.3,0,5],[1.3,0,3.9],[1.3,1.1,2.2],[1.3,1.1,.2],[1.183,1.1,-1.15]].map(p=>h.localToWorld(v.set(...p)).toArray())})()`)
  await drive.path([[23,-21],...cottage.map(p=>[p[0],p[2]])],.2)
  await drive.interact('Pick up the gear',{skip:false,control:!challenges});if(challenges)await drive.puzzle()
  mark('Entered the full cottage through its door and collected the mantel gear')
  await drive.path([...cottage.slice(0,-1).reverse().map(p=>[p[0],p[2]]),[16,-19],[14.6,-17.2],[13,-15.8],[10,-14.4],[9,-11],[8,-8],[5.8,-7.3],[3,-8.8],[-2.5,-8.8],[-2.5,-5.55],[-1.48,-5.55]],.2)
  await drive.interact('Drink the pink tea')
  assert.ok(await browser.evaluate('__tea.P.player.pitch<=0'),'Shrinking must return a navigable ground view, not the cinematic upward gaze')
  await browser.shot(`${output}/after-shrink.jpg`)
  await drive.path([[.1,-2.05],[.4,-2.05],[.4,-1.1],[2,-1.1],[4,-2.15],[10,-5],[17.7,-5],[18.1,-5]],.07)
  await drive.interact('Pick up the gear',{skip:false,control:!challenges});if(challenges)await drive.puzzle()
  assert.equal(await browser.evaluate('__tea.S.game.gears'),3)
  mark('Crossed the spoon bridge, walked into the frozen fountain and collected its gear')
  await drive.path([[17.1,-5],[10,-3],[5,-1.2],[3.3,-1.2]],.09)
  await drive.interact('Eat the cake')
  const saved=await browser.evaluate('(__tea.S.checkpoint(),__tea.S.savedGame())')
  languageStages.push({stage:'exploration',lines:await browser.evaluate('__playEvidence'),missing:await browser.evaluate('[...__localization.missing]')})
  frameStages.push({stage:'opening-and-exploration',...await browser.evaluate('__tea.frameAudit')})
  await browser.goto(address())
  await drive.until(`!!document.getElementById('backend')?.textContent`)
  await browser.evaluate(`document.getElementById('continue').click()`)
  await drive.until('__tea.P.player.control')
  assert.equal(await browser.evaluate('__tea.S.game.gears'),3)
  assert.deepEqual(await browser.evaluate('__tea.S.game.puzzles'),saved.puzzles)
  mark('Reloaded the actual checkpoint with gears, puzzle records and discoveries retained')
  await drive.path([[-2.7,2.6],[-3,-4.5],[-2.1,-6]],.2)
  await drive.interact('Mend the watch',{skip:skipScenes,control:false})
  await drive.until(`__tea.S.game.phase==='song'`,60)
  await sleep(1500)
  if(skipScenes)await browser.key('Enter','Enter')
  else {
    const tapped = new Set(),end = Date.now()+360000
    while(await browser.evaluate(`__tea.S.game.phase==='song'`)){
      assert.ok(Date.now()<end,'The song must finish naturally')
      const cue=await browser.evaluate(`(()=>{const c=document.getElementById('rhythm-cue');return {visible:!c.hidden,open:c.dataset.open==='true',note:c.dataset.note}})()`)
      if(cue.visible&&cue.open&&!tapped.has(cue.note)){tapped.add(cue.note);await browser.key('Space',' ')}
      await sleep(25)
    }
    const rhythm=await browser.evaluate('__tea.S.game.rhythm')
    assert.ok(rhythm.hits/rhythm.total>.8,JSON.stringify(rhythm))
    mark(`Played the visible rhythm cues without skipping: ${rhythm.hits}/${rhythm.total} hits`)
  }
  await drive.until(`__tea.S.game.phase==='ending'`,360)
  if(skipScenes)await browser.key('Enter','Enter');await drive.until(`!document.getElementById('results').hidden`,100)
  assert.equal(await browser.evaluate('__tea.S.savedGame()'),null)
  assert.equal(await browser.evaluate('Object.keys(__tea.S.game.puzzles).length'),3)
  frameStages.push({stage:'restored-exploration-repair-song-ending',...await browser.evaluate('__tea.frameAudit')})
  const frameAudit={maximum:Math.max(...frameStages.map(s=>s.maximum)),spikes:frameStages.flatMap(s=>s.spikes.map(spike=>({...spike,stage:s.stage}))),stages:frameStages}
  const languageEvidence=await browser.evaluate('({lines:__playEvidence,missing:[...__localization.missing],language:__localization.language(),results:document.getElementById("results").innerText})')
  languageEvidence.stages=languageStages
  languageEvidence.missing=[...new Set([...languageEvidence.missing,...languageStages.flatMap(s=>s.missing)])]
  languageEvidence.recordingOriginMs=recordingOriginMs
  fs.writeFileSync(`${output}/language.json`,JSON.stringify(languageEvidence,null,2))
  assert.deepEqual(languageEvidence.missing,[],'Every displayed localized source string must be translated')
  assert.deepEqual(await browser.evaluate(`['objective','prompt','controls','task-hint','subtitle','scene-skip','pause-open','rhythm-cue'].filter(id=>!document.getElementById(id).hidden)`),[],'Results must hide all transient play controls and overlays before the final freeze')
  await browser.shot(`${output}/results.jpg`)
  mark('All gears, repair, song, ending and results passed without position or size overrides')
  await browser.evaluate(`document.getElementById('replay').click()`)
  await drive.until(`!!document.getElementById('backend')?.textContent`)
  assert.ok(await browser.evaluate(`!!document.getElementById('start')`))
  if(stopRecording){recording=await stopRecording();stopRecording=null}
  fs.writeFileSync(`${output}/playthrough.json`,JSON.stringify({passed:true,mode:challenges?'challenges':'standard',skippedScenes:skipScenes,route:'Keyboard through the real controller; camera steering only; no placePlayer/setSize calls or automatic jumps',checks:log,frameAudit,recording,errors:browser.logs},null,2))
}catch(error){
  await browser.shot(`${output}/regression-failure.jpg`).catch(()=>{})
  fs.writeFileSync(`${output}/playthrough.json`,JSON.stringify({passed:false,checks:log,error:String(error),logs:browser.logs},null,2))
  throw error
}finally{if(stopRecording)await stopRecording().catch(()=>{});await browser.close()}
