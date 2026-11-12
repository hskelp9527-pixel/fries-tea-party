// Measures the head-motion, size-restore and floating-prop fixes. Needs the dev server (it imports /src/banter.js in the page).
// Run: TEA_URL=http://127.0.0.1:5199 node scripts/check-fixes.mjs   Prints one JSON object; exits 1 if any check fails.
import {launch,sleep}from'./browser.mjs'
const b=await launch({width:1100,height:850}),out={fail:[]},fail=m=>out.fail.push(m)
const ev=e=>b.evaluate(e)
try{
  await b.goto(`${process.env.TEA_URL??'http://127.0.0.1:5199'}/?start=explore&diagnostics&quality=${process.env.QUALITY??'high'}`)
  for(let i=0;i<480&&!await ev(`!!document.getElementById('backend')?.textContent`).catch(()=>false);i++)await sleep(250)
  await b.click(550,425);await sleep(500)
  // Page helpers: rec.start(who) samples that character's Head in its root's frame every animation frame; rec.stop() gives the numbers.
  await ev(`(()=>{
    const t=__tea,tmp=t.camera.quaternion.clone(),who=()=>({hatter:t.C.cast.hatter.object,hare:t.C.cast.hare.object,dormouse:t.C.cast.dormouse.object,fries:t.P.player.mesh})
    const mul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]
    const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3])))*180/Math.PI
    let s=null
    window.rec={
      start(name){const o=who()[name],head=o.getObjectByName('mixamorigHead');s={q:[],t:[],c:[],on:true};const am=name==='fries'?t.P.anim:t.C.cast[name].anim;(function f(){if(!s.on)return;const r=o.getWorldQuaternion(tmp),rc=[-r.x,-r.y,-r.z,r.w],h=head.getWorldQuaternion(tmp);s.q.push(mul(rc,[h.x,h.y,h.z,h.w]));s.t.push(performance.now()/1000);s.c.push(Object.entries(am.actions).filter(([,a])=>a.isScheduled()&&a.getEffectiveWeight()>0.001).map(([k,a])=>k+':'+a.getEffectiveWeight().toFixed(2)+'@'+a.time.toFixed(2)).join(' ')+' | '+t.A.currentLine()+' sc'+t.S.game.sceneDepth+' p'+o.position.toArray().map(v=>v.toFixed(2))+' s'+o.scale.x.toFixed(2));requestAnimationFrame(f)})()},
      stop(){s.on=false;const v=[],W=0.04;let peakW={};let maxFrame=0;for(let i=1;i<s.q.length;i++)maxFrame=Math.max(maxFrame,angle(s.q[i],s.q[i-1]));for(let i=1,j=0;i<s.q.length;i++){while(s.t[i]-s.t[j+1]>=W)j++;const dt=s.t[i]-s.t[j];if(dt>=W){const w=angle(s.q[i],s.q[j])/dt;v.push(w);if(w>(peakW.w??0))peakW={w,at:+(s.t[i]-s.t[0]).toFixed(2),c:s.c[i]}}}
        let range=0;for(let i=0;i<s.q.length;i+=2)for(let j=i+1;j<s.q.length;j+=2)range=Math.max(range,angle(s.q[i],s.q[j]))
        const jumps=[];for(let i=1;i<s.q.length;i++)jumps.push([angle(s.q[i],s.q[i-1]),i]);jumps.sort((a,b)=>b[0]-a[0]);const top=jumps.slice(0,3).map(([d,i])=>({deg:+d.toFixed(1),dtMs:+((s.t[i]-s.t[i-1])*1000).toFixed(1),at:+(s.t[i]-s.t[0]).toFixed(2),before:s.c[i-1],after:s.c[i]}));v.sort((a,b)=>a-b);return{peakAt:peakW,maxFrame:+maxFrame.toFixed(1),top,frames:s.q.length,seconds:+(s.t.at(-1)-s.t[0]).toFixed(2),peak:+(v.at(-1)??0).toFixed(1),p95:+(v[Math.floor(v.length*.95)]??0).toFixed(1),range:+range.toFixed(1)}}
    }
    // Plays one line through the banter (addressed to 'to', possibly the speaker itself) and records the speaker's head for its duration.
    window.line=async(id,name,to)=>{
      const B=await import('/src/banter.js'),frame=()=>new Promise(requestAnimationFrame);B.banter.seated=true;B.EVENTS.probe={lines:[id],to};B.event('probe')
      for(let i=0;t.A.currentLine()!==id;i++){if(i>3600)return{id,error:'line never started'};await frame()}
      rec.start(name);while(t.A.currentLine()===id)await frame();const r=rec.stop();B.banter.seated=false;return{id,name,to,...r}
    }
    return true})()`)
  const pressE=async()=>{await b.key('KeyE','e')}
  const control=()=>ev('__tea.P.player.control')
  // Presses E at a drink/cake stand; optional Enter after skipAt seconds; resolves when control returns.
  async function interact(d,size,skipAt,record){
    await ev(`(()=>{const t=__tea,d=t.G.drinks[${d}];t.P.setSize('${size}',0);t.P.placePlayer(d.stand,d.rot);return true})()`);await sleep(1200)
    if(record)await ev(`rec.start('fries')`)
    await pressE()
    for(let i=0;i<50&&await control();i++)await sleep(100)
    if(skipAt!==undefined){await sleep(skipAt*1000);await b.key('Enter','Enter')}
    for(let i=0;i<900&&!await control();i++)await sleep(100)
  }
  // 1. headTalk
  out.headTalk=[]
  for(const[id,name,to]of[['BT-10','hatter','hatter'],['BT-01','hatter','fries'],['BT-02','hare','fries'],['BT-13','dormouse','fries'],['BT-55','fries','fries'],['BT-58','fries','hatter']]){
    const r=await ev(`line(${JSON.stringify(id)},${JSON.stringify(name)},${JSON.stringify(to)})`);out.headTalk.push(r)
    if(r.error||r.peak>120||r.p95>70)fail(`headTalk ${id}`)
  }
  // 2. headDrink (pink tea, full performance, make Fries small)
  await interact(0,'normal',undefined,true);out.headDrink=await ev(`rec.stop()`)
  if(out.headDrink.peak>150)fail('headDrink') // the shrink startle is a deliberate ~126 deg/s turn
  // 3. cake: two eaten fully / skipped mid-bite (cakes are drinks 2 and 3, eaten small)
  out.cake=[]
  for(const[d,skip]of[[2],[3,2.2]]){
    const s0=await ev(`__tea.G.drinks[${d}].object.scale.x`);await interact(d,'small',skip);await sleep(2000)
    const s1=await ev(`__tea.G.drinks[${d}].object.scale.x`),ok=Math.abs(s1/s0-1)<.01;out.cake.push({cake:d,skipped:!!skip,before:s0,after:s1,ok});if(!ok)fail(`cake ${d}`)
  }
  // 4. cupPose: the blue cup's orientation after a drink skipped half way
  const q0=await ev(`__tea.G.drinks[1].object.quaternion.toArray()`)
  await interact(1,'normal',5);await sleep(1000)
  const q1=await ev(`__tea.G.drinks[1].object.quaternion.toArray()`),dot=Math.abs(q0.reduce((a,v,i)=>a+v*q1[i],0)),deg=2*Math.acos(Math.min(1,dot))*180/Math.PI
  out.cupPose={degrees:+deg.toFixed(2)};if(deg>1)fail('cupPose')
  // 5. floating: a giant standing in the cloud over the table, then at the tree gear spot; Fries turns slowly so the camera sees every side
  // (props outside the view are culled, so only drawn instances can be measured; `props` is how many were seen per frame at most).
  out.floating=[]
  for(const[name,x,z]of[['table',-1.8,-3.5],['tree',-4.48,-10.44]]){
    await ev(`(()=>{const t=__tea;t.P.setSize('big',0);t.P.placePlayer([${x},0,${z}],0);return true})()`);await sleep(1500)
    const r=await ev(`new Promise(resolve=>{
      const t=__tea,P=t.P.player,meshes=t.scene.children.filter(o=>o.isInstancedMesh&&o.name.startsWith('Floating ')),m=t.camera.matrixWorld.clone(),box=new (P.feet.constructor)(),end=performance.now()+20000
      const centres=new Map();for(const o of meshes){o.geometry.computeBoundingBox();centres.set(o,o.geometry.boundingBox.getCenter(box.clone()))}
      const bb=meshes[0].geometry.boundingBox.clone();let last=performance.now(),min=Infinity,inside=0,frames=0,props=0,hat=0,hatBox=0
      ;(function f(){const now=performance.now(),dt=(now-last)/1000;last=now;P.yaw+=dt*Math.PI*2/20
        const s=P.p.scale,y0=P.feet.y+.3*s,y1=P.feet.y+1.1*s;let seen=0
        for(const o of meshes){for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);const c=centres.get(o).clone().applyMatrix4(m),cy=Math.min(Math.max(c.y,y0),y1),d=Math.hypot(c.x-P.feet.x,c.y-cy,c.z-P.feet.z);seen++;min=Math.min(min,d);if(d<.45*s)inside++
          if(o.name==='Floating hat'){const h=o.geometry.boundingBox.clone().applyMatrix4(m).getSize(c.clone());hat=Math.max(hat,h.y);hatBox=Math.max(hatBox,h.x,h.y,h.z)}}}
        props=Math.max(props,seen);frames++
        if(performance.now()<end)requestAnimationFrame(f);else resolve({frames,props,minDistance:+min.toFixed(2),radius:+(.45*s).toFixed(2),samplesInside:inside,largestHatHeight:+hat.toFixed(3),largestHatSpan:+hatBox.toFixed(3),feet:P.feet.toArray().map(v=>+v.toFixed(2))})})()
    })`);out.floating.push({spot:name,...r});if(r.samplesInside)fail(`floating ${name}`)
  }
  out.errors=b.logs.filter(l=>/^\[(error|exception)\]/.test(l))
}catch(e){fail(String(e.stack??e))}finally{await b.close()}
console.log(JSON.stringify(out,null,1));process.exit(out.fail.length?1:0)
