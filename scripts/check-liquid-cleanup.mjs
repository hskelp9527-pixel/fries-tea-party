import assert from 'node:assert/strict'
import {launch} from './browser.mjs'
import {routeDriver} from './route.mjs'
const b=await launch({width:1280,height:720}),d=routeDriver(b)
try{
  await b.goto('http://127.0.0.1:5199/?start=explore&diagnostics');await d.until(`!!document.getElementById('backend')?.textContent`)
  const result=await b.evaluate(`(()=>{const t=__tea,l=t.liquids,before=l.counts().surfaces,v=t.camera.position.clone().set(0,.012,0),first=l.surface(t.G.drinks[0].object,v,.044,.065),second=l.surface(t.G.drinks[1].object,v,.044,.065);first.remove();first.remove();const afterRepeated=l.counts().surfaces;second.set(.5);const secondAlive=!!second.disc.parent;second.remove();return {before,afterRepeated,secondAlive,after:l.counts().surfaces}})()`)
  assert.equal(result.afterRepeated,result.before+1,'Repeated cleanup must leave the other cup surface registered')
  assert.equal(result.secondAlive,true);assert.equal(result.after,result.before)
  console.log(result)
}finally{await b.close()}
