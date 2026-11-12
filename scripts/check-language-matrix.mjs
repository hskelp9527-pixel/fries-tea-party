import assert from 'node:assert/strict'
import fs from 'node:fs'
import {launch,sleep} from './browser.mjs'
import {routeDriver} from './route.mjs'
const b=await launch({width:1440,height:900}),d=routeDriver(b),out='art/review/2026-11-11/revision/language-matrix'
fs.mkdirSync(out,{recursive:true});const rows=[]
const address=lang=>`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&diagnostics${lang?'&lang='+lang:''}`
async function load(lang){await b.goto(address(lang));await d.until(`!!document.getElementById('backend')?.textContent`);return b.evaluate(`({language:__localization.language(),title:document.querySelector('h1').textContent,selector:document.getElementById('subtitle-language').value})`)}
async function language(code){await b.evaluate(`(()=>{const l=document.getElementById('subtitle-language');l.value=${JSON.stringify(code)};l.dispatchEvent(new Event('change'))})()`);await sleep(200)}
try{
  let row=await load();assert.equal(row.language,'zh');rows.push({case:'clean default',...row})
  await b.click(720,450);await d.until('__tea.P.player.control')
  await b.evaluate(`void __tea.A.say('OP-03')`);await d.until(`document.getElementById('subtitle').textContent.length>0`)
  await language('en');assert.match(await b.evaluate(`document.getElementById('subtitle').textContent`),/plenty of room/)
  await language('zh');assert.match(await b.evaluate(`document.getElementById('subtitle').textContent`),/空位/)
  rows.push({case:'switch during voice',passed:true})
  await b.key('Escape','Escape');await b.evaluate(`document.getElementById('pause-save').click()`)
  await language('en')
  assert.match(await b.evaluate(`document.getElementById('pause-status').textContent`),/^Saved/)
  assert.match(await b.evaluate(`document.getElementById('controls').textContent`),/move/)
  await language('zh')
  assert.match(await b.evaluate(`document.getElementById('pause-status').textContent`),/保存/)
  assert.match(await b.evaluate(`document.getElementById('controls').textContent`),/移动/)
  rows.push({case:'save status and controls switch immediately while paused',passed:true})
  await b.key('Escape','Escape')
  await b.key('Escape','Escape');await b.shot(`${out}/pause-zh.jpg`)
  await b.evaluate(`(()=>{const input=document.getElementById('voice-volume');input.value=0;input.dispatchEvent(new Event('input'))})()`)
  await b.key('Escape','Escape');await b.evaluate(`void __tea.A.say('EX-10')`);await d.until(`document.getElementById('subtitle').textContent.includes('蓝茶')`)
  rows.push({case:'muted voice retains essential subtitle',subtitle:await b.evaluate(`document.getElementById('subtitle').textContent`)})
  await language('en');row=await load();assert.equal(row.language,'en');rows.push({case:'saved English reload',...row})
  await b.evaluate(`localStorage.setItem('tea-party-language-v2','zh');localStorage.setItem('tea-party-settings',JSON.stringify({language:'en',voice:0}))`)
  row=await load();assert.equal(row.language,'zh');assert.equal(row.selector,'zh');rows.push({case:'new language owner wins old settings',...row})
  row=await load('en');assert.equal(row.language,'en');assert.equal(row.selector,'en');rows.push({case:'explicit English query',...row})
  row=await load('zh');assert.equal(row.language,'zh');rows.push({case:'explicit Chinese query',...row})
  await b.shot(`${out}/title-zh.jpg`)
  assert.equal(b.logs.filter(l=>/^\[(error|exception)\]/.test(l)).length,0,b.logs.join('\n'))
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:true,rows,errors:b.logs},null,2));console.log(rows)
}catch(error){await b.shot(`${out}/failure.jpg`);fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:false,rows,error:String(error),logs:b.logs},null,2));throw error}finally{await b.close()}
