import assert from 'node:assert/strict'
import fs from 'node:fs'
import{launch,sleep}from'./browser.mjs'
const b=await launch({width:1280,height:800}),output='art/review/2026-11-11/revision/language';fs.mkdirSync(output,{recursive:true})
try{
  await b.goto('http://127.0.0.1:5199/?start=explore&diagnostics')
  for(let i=0;i<480&&!await b.evaluate(`!!document.getElementById('backend')?.textContent`).catch(()=>false);i++)await sleep(250)
  const title=await b.evaluate(`document.querySelector('h1').textContent`);await b.shot(`${output}/title.jpg`)
  assert.match(title,/[\u4e00-\u9fff]/,'The normal title defaults to Chinese')
  await b.click(640,400);await sleep(300)
  await b.evaluate(`__tea.P.placePlayer([-1.45,0,-4.407],90)`);await sleep(200)
  const prompt=await b.evaluate(`document.getElementById('prompt').textContent`)
  assert.match(prompt,/[\u4e00-\u9fff]/,'Interaction prompts are Chinese')
  await b.key('Escape','Escape');await sleep(200);await b.shot(`${output}/pause.jpg`)
  const menu=await b.evaluate(`document.getElementById('pause-menu').innerText`);assert.ok(!/Picture quality|Return to the garden|Music/.test(menu))
  fs.writeFileSync(`${output}/report.json`,JSON.stringify({passed:true,title,prompt,menu},null,2))
}finally{await b.close()}
