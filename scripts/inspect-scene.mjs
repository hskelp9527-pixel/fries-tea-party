import { launch, sleep } from './browser.mjs'
const b = await launch()
try {
  await b.goto('http://127.0.0.1:5199/?frame=s14&quality=high&diagnostics')
  for (let n=0;n<480&&!await b.evaluate('!!window.__tea && !!document.getElementById("backend")?.textContent').catch(()=>false);n++) await sleep(250)
  await sleep(4000)
  await b.evaluate(`(()=>{window.draws={};__tea.scene.traverse(o=>{if(!o.isMesh)return;o.onBeforeRender=(r,s,c,g,m,group)=>{
    const key=(c===__tea.camera?'main:':'shadow:')+(o.name||o.parent?.name||o.type)+':'+o.id+':'+g.type+':'+(o.isInstancedMesh?o.count:1);
    const count=(group?.count??g.index?.count??g.attributes.position.count)/3*(o.isInstancedMesh?o.count:g.instanceCount??1);
    draws[key]??={calls:0,triangles:0};draws[key].calls++;draws[key].triangles+=count;
  }});return true})()`)
  await sleep(500)
  console.log(await b.evaluate(`Object.entries(draws).sort((a,b)=>b[1].triangles-a[1].triangles).slice(0,30)`))
} finally { await b.close() }
