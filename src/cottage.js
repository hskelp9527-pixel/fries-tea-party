import * as THREE from 'three/webgpu'
import { color, mx_noise_float, positionLocal, sin, time, vec3, vertexColor } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { things } from './garden.js'
import { model } from './models.js'
import { scene } from './scene.js'
import { RAPIER, world } from './physics.js'

// The March Hare's cottage interior, in the house's own frame: floor y 1.1, ceiling y 4.25, x -2.62..3.32, z -2.22..2.47.
// Everything visible is merged into one mesh per material and coloured per vertex; repeated props are instanced.
// Colliders (the `c` option of box and solid) are the original ones; the dressing on top of them is visual only.
const house=things.house,room=new THREE.Group();room.name='March Hare cottage interior';house.add(room)
const lit=(m,o={})=>Object.assign(new THREE.MeshStandardNodeMaterial({vertexColors:true,...o}),m)
const grain=mx_noise_float(positionLocal.mul(vec3(30,5,30))),mottle=mx_noise_float(positionLocal.mul(3))
const materials={
  plaster:lit({colorNode:color(0xffffff).mul(mx_noise_float(positionLocal.mul(45)).mul(.03).add(mottle.mul(.05)).add(.96))},{roughness:1}),
  wood:lit({colorNode:color(0xffffff).mul(grain.mul(.07).add(.95))},{roughness:.8}),
  stone:lit({colorNode:color(0xffffff).mul(mx_noise_float(positionLocal.mul(22)).mul(.1).add(.93))},{roughness:1}),
  cloth:lit({colorNode:color(0xffffff).mul(mx_noise_float(positionLocal.mul(130)).mul(.06).add(.94))},{roughness:.98}),
  brass:lit({},{metalness:.6,roughness:.45}),
  glass:lit({emissiveNode:vertexColor().mul(.45)},{roughness:.3}),
  glow:lit({emissiveNode:vertexColor().mul(2.2)},{roughness:1}),
  flame:lit({emissiveNode:vertexColor().mul(sin(time.mul(8)).mul(.15).add(.85))},{roughness:1,side:THREE.DoubleSide}),
}
const buckets=new Map(),tint=new THREE.Color()
let frame=null
const rnd=(s=>()=>(s=s*16807%2147483647)/2147483647)(11)
const shade=(hex,a=.08)=>new THREE.Color(hex).multiplyScalar(1+(rnd()-.5)*2*a)
function add(material,hex,geo){
  if(geo.index)geo=geo.toNonIndexed()
  geo.deleteAttribute('uv');if(frame)geo.applyMatrix4(frame)
  const c=hex.isColor?hex:tint.set(hex),n=geo.attributes.position.count,a=new Float32Array(n*3)
  for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}
  geo.setAttribute('color',new THREE.BufferAttribute(a,3))
  if(!buckets.has(material))buckets.set(material,[]);buckets.get(material).push(geo)
}
function solid(x,y,z,w,h,d){
  const position=house.localToWorld(new THREE.Vector3(x,y,z))
  world.createCollider(RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(...position.toArray()).setRotation(house.getWorldQuaternion(new THREE.Quaternion())))
}
const turn=(g,o)=>{if(o.rx)g.rotateX(o.rx);if(o.ry)g.rotateY(o.ry);if(o.rz)g.rotateZ(o.rz);return g}
function box(m,c,x,y,z,w,h,d,o={}){
  const g=o.r?new RoundedBoxGeometry(w,h,d,o.s??1,Math.min(o.r,w*.45,h*.45,d*.45)):new THREE.BoxGeometry(w,h,d)
  add(m,c,turn(g,o).translate(x,y,z));if(o.c)solid(x,y,z,w,h,d)
}
const cyl=(m,c,x,y,z,rt,rb,h,o={})=>add(m,c,turn(new THREE.CylinderGeometry(rt,rb,h,o.seg??10),o).translate(x,y,z))
const ball=(m,c,x,y,z,rx,ry=rx,rz=rx,o={})=>add(m,c,turn(new THREE.SphereGeometry(1,o.w??10,o.h??7).scale(rx,ry,rz),o).translate(x,y,z))
// A turned profile [radius, height] from the bottom up, outer wall first.
const lathe=(m,c,x,y,z,pts,seg=14,o={})=>add(m,c,turn(new THREE.LatheGeometry(pts.map(([r,h])=>new THREE.Vector2(r,h)),seg),o).translate(x,y,z))
const cone=(m,c,x,y,z,r,h,o={})=>add(m,c,turn(new THREE.ConeGeometry(r,h,o.seg??6),o).translate(x,y,z))
// Arched outline: straight sides from y0 for h, then a semicircle.
function arch(w,y0,h){const s=new THREE.Shape();s.moveTo(-w/2,y0);s.lineTo(w/2,y0);s.lineTo(w/2,y0+h);s.absarc(0,y0+h,w/2,0,Math.PI,false);s.lineTo(-w/2,y0);return s}
const extrude=(shape,depth,seg=16)=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:seg}).translate(0,0,-depth/2)
// Everything added inside runs in a local frame: +z is the surface's normal, the origin its centre.
function placed(x,y,z,ry,fn){frame=new THREE.Matrix4().makeRotationY(ry).setPosition(x,y,z);fn();frame=null}
const PLASTER=0xd8b985,CREAM=0xe8d6ab,WOOD=0x8a5a36,DARK=0x4a3022,MID=0x6e4a30,GREEN=0x46573e,RED=0x924443,RUST=0xa23937,MUSTARD=0xc89a3c,STONE=0x8f7d68,COPPER=0xb06a3a,BRASS=0xb2985f,ORANGE=0xd9782a,LEAF=0x4f7a34
const props=new Map()
const prop=(name,x,y,z,scale=1,ry=0,rz=0)=>{if(!props.has(name))props.set(name,[]);props.get(name).push(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,rz)),new THREE.Vector3().setScalar(scale)))}
const candle=(x,y,z,h=.1)=>{
  lathe('brass',BRASS,x,y,z,[[0,0],[.03,0],[.03,.012],[.01,.02],[.008,.05],[.02,.06],[0,.06]],10)
  cyl('cloth',0xf1e6c8,x,y+.06+h/2,z,.014,.014,h);ball('glow',0xffc860,x,y+.075+h,z,.01,.02,.01,{w:6,h:5})
}
// ---- Floor: boards with butt joints over a dark sub-floor, so the gaps read as gaps.
box('wood',0x2a1a12,.35,1.062,.125,6.1,.02,4.85)
for(let x=-2.58;x<3.4;x+=.24){const cut=-1.5+rnd()*3.7;box('wood',shade(WOOD,.14),x,1.075,(cut-2.3)/2,.232,.05,cut+2.3);box('wood',shade(WOOD,.14),x,1.075,(cut+2.55)/2,.232,.05,2.55-cut)}
box('wood',WOOD,1.3,1.075,2.7,1.62,.05,.38,{c:true})
solid(.35,1.03,.125,6.1,.14,4.85)
// ---- Shell: the collider walls, plastered, with timber wainscot, posts, beams and a plank-and-beam ceiling.
box('plaster',PLASTER,-2.66,2.71,.125,.08,3.22,4.85,{c:true});box('plaster',PLASTER,3.36,2.71,.125,.08,3.22,4.85,{c:true})
box('plaster',PLASTER,.35,2.71,-2.26,6.1,3.22,.08,{c:true})
box('plaster',PLASTER,-1.105,2.71,2.51,3.19,3.22,.08,{c:true});box('plaster',PLASTER,2.755,2.71,2.51,1.29,3.22,.08,{c:true})
box('plaster',PLASTER,1.3,3.68,2.51,1.62,1.28,.08,{c:true})
box('plaster',CREAM,.35,4.31,.125,6.1,.12,4.85,{c:true})
// Wainscot: vertical boards to y 2.02, a chair rail and a skirting on each wall run (centre, length, normal axis).
function wainscot(x,z,length,alongX){
  const n=Math.round(length/.16),w=length/n
  for(let i=0;i<n;i++){
    const u=-length/2+(i+.5)*w,c=shade(i%2?0x7a4d2e:0x84552f,.1)
    alongX?box('wood',c,x+u,1.56,z,w,.92,.03):box('wood',c,x,1.56,z+u,.03,.92,w)
  }
  alongX?(box('wood',DARK,x,2.04,z,length,.06,.06),box('wood',DARK,x,1.17,z,length,.1,.045)):(box('wood',DARK,x,2.04,z,.06,.06,length),box('wood',DARK,x,1.17,z,.045,.1,length))
}
wainscot(-2.605,.125,4.69,false);wainscot(3.305,.125,4.69,false);wainscot(.35,-2.205,5.94,true)
wainscot(-2.055,-.37,1.13,true);wainscot(-1.14,2.455,3.0,true);wainscot(2.72,2.455,1.22,true)
for(const[x,z]of[[-2.55,-2.15],[3.25,-2.15],[-2.55,2.4],[3.25,2.4]])box('wood',DARK,x,2.71,z,.14,3.2,.14)
for(const x of[-2.4,-.7,1,2.7])box('wood',shade(DARK,.1),x,4.1,.125,.2,.28,4.85)
for(const z of[-1.4,.1,1.6])box('wood',shade(DARK,.1),.35,4.14,z,6.0,.2,.2)
for(const x of[-2.4,-.7,1,2.7])box('wood',DARK,x,3.78,-2.0,.14,.07,.62,{rx:Math.PI/4})
for(let x=-2.5;x<3.3;x+=.3)box('wood',shade(0xcdb283,.07),x,4.24,.125,.29,.012,4.85)
// Door and sleeping-room arches: spandrel plates and a timber ring.
function archway(cx,spring,w,plateTop,depth,wall){
  const r=w/2
  add('plaster',wall,extrude(new THREE.Shape().moveTo(-r,0).absarc(0,0,r,Math.PI,0,true).lineTo(r,plateTop-spring).lineTo(-r,plateTop-spring).closePath(),depth).translate(cx,spring,0))
  const ring=new THREE.Shape().moveTo(-r-.07,0).absarc(0,0,r+.07,Math.PI,0,true).lineTo(r,0).absarc(0,0,r,0,Math.PI,false).closePath()
  add('wood',MID,extrude(ring,depth+.04).translate(cx,spring,0))
}
// Sleeping room: a plastered half-wall at z -0.45 with an arched opening.
for(const[x,width]of[[-2.08,1.18],[-.38,.22]])box('plaster',PLASTER,x,2.1,-.45,width,2,.1,{c:true})
placed(0,0,-.45,0,()=>archway(-.99,2.4,1.0,3.1,.1,PLASTER))
placed(0,0,-.45,0,()=>{box('wood',DARK,-1.47,3.13,0,2.4,.06,.16);for(const x of[-1.49,-.49])box('wood',MID,x,1.75,0,.07,1.3,.16)})
for(const x of[-2.08,-.38])box('wood',DARK,x,1.17,-.45,x<-1?1.18:.22,.1,.14)
// Front door: arched spandrel above the springline of the 1.62 m arch.
placed(0,0,2.46,Math.PI,()=>{archway(-1.3,2.21,1.62,3.04,.05,PLASTER)})
// ---- The focal wall: stone chimney breast with an arched firebox, a timber mantel and the watches.
const HX=1.28,HY=1.42
for(let y=1.1,row=0;y<3.1;y+=.13,row++){
  const by=y+.065,dy=by-HY,cut=by<HY?[HX-.38,HX+.38]:Math.abs(dy)<.5?[HX-Math.sqrt(.25-dy*dy),HX+Math.sqrt(.25-dy*dy)]:null
  for(const[a,b]of cut?[[.62,cut[0]],[cut[1],1.94]]:[[.62,1.94]]){
    for(let x=a-(row%2?.12:0);x<b-.005;){
      const w=.17+rnd()*.2,l=Math.max(x,a),r=Math.min(x+w,b);x+=w
      if(r-l<.04)continue
      const d=(by>1.95?.1:.25)+rnd()*.02;box('stone',shade(STONE,.16),(l+r)/2,y+.065,-2.22+d/2,r-l-.012,.118,d,{r:.012})
    }
  }
}
box('plaster',PLASTER,HX,3.7,-2.16,1.0,1.2,.12)
for(let i=0;i<9;i++){const a=(i+.5)*Math.PI/9;box('stone',shade(STONE,.12),HX+Math.cos(a)*.44,HY+Math.sin(a)*.44,-1.97,.13,.15,.08,{rz:a+Math.PI/2*0,r:.01})}
placed(HX,0,-2.2,0,()=>add('stone',0x2a1d18,extrude(arch(.76,1.18,.24),.02).translate(0,0,.01)))
box('stone',0x7a6a58,HX,1.14,-1.99,1.25,.08,.57,{c:true});box('stone',0x7a6a58,.82,1.49,-2.08,.16,.78,.3,{c:true});box('stone',0x7a6a58,1.74,1.49,-2.08,.16,.78,.3,{c:true})
box('stone',0x6b5a48,HX,1.106,-1.55,1.6,.012,.7)
box('wood',MID,HX,1.885,-2.0,1.75,.07,.4,{r:.015})
for(const x of[.74,1.82]){box('wood',MID,x,1.8,-2.05,.1,.1,.28,{r:.02});box('wood',MID,x,1.72,-2.05,.06,.08,.2,{rx:0,r:.01})}
// Fire: logs, embers, three flames (the flame material flickers) and the tools.
for(const z of[-2.1,-1.99])cyl('wood',0x3a2616,HX,1.22,z,.045,.045,.54,{rz:Math.PI/2})
for(let i=0;i<7;i++)ball('glow',0x8a2208,1.02+i*.085,1.2,-1.97,.04,.025,.04,{w:6,h:4})
const flame=new THREE.Shape();flame.moveTo(-.045,0);flame.bezierCurveTo(-.075,.07,.015,.12,.01,.22);flame.bezierCurveTo(.08,.13,.075,.04,.045,0);flame.closePath()
for(const[x,s,c]of[[1.08,1,0xff9a2e],[1.28,1.25,0xffb040],[1.48,1,0xff9a2e],[1.28,.6,0xffe08a]])add('flame',c,new THREE.ShapeGeometry(flame,8).scale(s,s,1).translate(x,1.2,-2.04))
cyl('brass',BRASS,1.9,1.5,-1.98,.01,.01,.75);cyl('brass',BRASS,1.94,1.5,-1.98,.01,.01,.75,{rz:.08});ball('brass',BRASS,1.9,1.9,-1.98,.03,.025,.03)
// Watches hang from brass nails above the mantel; the wall clock hangs between them.
for(const x of[.72,.94,1.62,1.84]){cyl('brass',BRASS,x,2.64,-2.09,.012,.012,.03,{rx:Math.PI/2});cyl('brass',BRASS,x,2.55,-2.075,.004,.004,.18);prop('pocket_watch',x,2.3,-2.075,3.2)}
prop('hanging_clock',HX,2.12,-2.0,1.5)
candle(.52,1.92,-2.0);candle(2.05,1.92,-2.0,.13)
// Note board behind the note (which stays where it is).
box('wood',MID,.15,1.72,-2.17,.72,.5,.1,{r:.015});box('plaster',0xe2d2a6,.15,1.72,-2.115,.64,.42,.01)
for(const x of[-.15,.45])cyl('brass',BRASS,x,1.9,-2.11,.012,.012,.02,{rx:Math.PI/2})
// ---- Logs and firewood beside the hearth.
for(const[x,y]of[[.35,1.14],[.45,1.14],[.55,1.14],[.4,1.22],[.5,1.22]])cyl('wood',shade(0x6a4a2c,.2),x,y,-2.0,.04,.04,.34,{rx:Math.PI/2})
// ---- Sleeping alcove (rear left): patchwork quilt bed with curved headboard, posts and a wall shelf.
box('wood',MID,-1.9,1.3,-1.4,1.15,.4,1.45,{c:true,r:.03});box('wood',0x4a3022,-1.9,1.12,-1.4,1.2,.04,1.5)
box('cloth',CREAM,-1.9,1.66,-1.4,1.13,.15,1.4,{r:.055})
const quilt=[RED,CREAM,GREEN,MUSTARD,RUST,0x7a8a5a,0xd9b98a]
for(let i=0;i<5;i++)for(let j=0;j<4;j++){const c=quilt[(i*3+j*5+(i&j))%quilt.length];box('cloth',shade(c,.06),-1.9-.46+i*.23,1.77,-1.67+j*.235+.07,.228,.03,.23,{r:.012})}
ball('cloth',0xf3ead2,-2.12,1.84,-1.93,.3,.09,.16,{w:12,h:8});ball('cloth',0xe3b9a0,-1.64,1.83,-1.93,.25,.08,.15,{w:12,h:8})
placed(-1.9,0,-2.13,0,()=>{
  const s=new THREE.Shape();s.moveTo(-.62,1.45);s.lineTo(-.62,1.95);s.quadraticCurveTo(-.62,2.17,-.3,2.17);s.quadraticCurveTo(0,2.3,.3,2.17);s.quadraticCurveTo(.62,2.17,.62,1.95);s.lineTo(.62,1.45);s.closePath()
  add('wood',DARK,extrude(s,.07));cone('cloth',ORANGE,0,1.92,.045,.05,.26,{rz:Math.PI});for(const a of[-.4,0,.4])cone('cloth',LEAF,Math.sin(a)*.05,2.1+Math.cos(a)*.03,.045,.022,.12,{rz:a})
  for(const x of[-.6,.6]){lathe('wood',MID,x,1.1,.02,[[0,0],[.05,0],[.04,.12],[.025,.3],[.045,.42],[.03,.6],[.03,.9],[.04,.94],[.03,.98],[0,.98]]);ball('wood',MID,x,2.14,.02,.045)}
})
for(const x of[-2.48,-1.32]){lathe('wood',MID,x,1.1,-.7,[[0,0],[.05,0],[.04,.1],[.03,.25],[.04,.45],[0,.45]]);ball('wood',MID,x,1.57,-.7,.04)}
box('wood',MID,-.95,2.3,-2.1,.5,.04,.2,{r:.01});for(const x of[-1.1,-.8])cone('wood',MID,x,2.25,-2.15,.03,.1,{rz:0});candle(-.95,2.32,-2.1,.08)
for(let i=0;i<4;i++)box('cloth',shade([RED,GREEN,MUSTARD,CREAM][i],.05),-1.07+i*.045,2.4,-2.1,.04,.14+i%2*.03,.11)
// ---- Sitting room.
function oval(x,z,rx,rz,rings){let r0=0;for(const[w,c]of rings){const g=new THREE.RingGeometry(r0,r0+w,40).rotateX(-Math.PI/2);g.scale(rx,1,rz);add('cloth',c,g.translate(x,1.106,z));r0+=w}}
oval(-1.0,1.1,1.25,.85,[[.12,CREAM],[.1,RED],[.12,MUSTARD],[.1,GREEN],[.12,RUST],[.1,CREAM],[.1,GREEN],[.14,RED]])
oval(-.95,-1.4,1.2,1.7,[[.2,GREEN],[.1,CREAM]])
box('cloth',GREEN,1.3,1.106,2.15,1.0,.012,.6,{r:.004});for(const x of[.85,1.0,1.15,1.3,1.45,1.6,1.75])box('cloth',CREAM,x,1.113,2.15,.03,.004,.54)
// Sofa (collider: seat block against the left wall).
box('wood',DARK,-2.25,1.27,1.2,.56,.32,1.16,{c:true,r:.025})
for(const[x,z]of[[-2.5,.66],[-2.5,1.74],[-2.0,.66],[-2.0,1.74]])lathe('wood',DARK,x,1.1,z,[[0,0],[.035,0],[.03,.06],[.04,.1],[0,.1]])
box('cloth',GREEN,-2.22,1.5,1.2,.5,.14,1.04,{r:.05,s:2})
box('cloth',GREEN,-2.53,1.82,1.2,.14,.7,1.14,{r:.06,s:2,rz:-.1})
for(const z of[.58,1.82]){cyl('cloth',GREEN,-2.22,1.62,z,.1,.1,.55,{rx:Math.PI/2});ball('cloth',GREEN,-2.22,1.62,z+(z<1?-.275:.275),.1)}
for(const z of[.9,1.2,1.5])ball('wood',BRASS,-2.455,1.9,z,.013)
ball('cloth',MUSTARD,-2.3,1.8,.82,.13,.13,.07,{ry:0,w:12,h:8});ball('cloth',RUST,-2.3,1.76,1.6,.12,.12,.07,{w:12,h:8})
box('cloth',0xb8785a,-2.18,1.595,1.2,.3,.01,.9,{r:.004})
for(let j=0;j<4;j++)box('cloth',shade(quilt[j*2%quilt.length],.05),-2.1,1.606,.9+j*.2,.2,.012,.19)
// Table with turned legs, two stools, and its tea things.
box('wood',WOOD,-1.13,1.67,1.1,.86,.1,.67,{c:true,r:.035,s:2})
box('wood',DARK,-1.13,1.6,1.1,.7,.07,.5)
for(const sx of[-1,1])for(const sz of[-1,1])lathe('wood',DARK,-1.13+sx*.35,1.1,1.1+sz*.25,[[0,0],[.035,0],[.03,.1],[.045,.2],[.03,.28],[.035,.47],[0,.47]])
box('cloth',RED,-1.13,1.724,1.1,.34,.006,.62);box('cloth',CREAM,-1.13,1.7255,1.1,.04,.006,.62)
for(const[x,z]of[[-1.13,.45],[-.38,1.12]]){lathe('wood',WOOD,x,1.1,z,[[0,0],[.15,0],[.14,.01],[.04,.02],[.035,.28],[.17,.32],[.17,.36],[0,.36]],14);box('cloth',RUST,x,1.462,z,.3,.01,.3,{r:.005})}
prop('teapot',-1.25,1.73,1.08,.65);prop('teacup',-.91,1.72,1.2);prop('saucer',-.91,1.72,1.2,.9);prop('plate',-1.42,1.727,1.3,1.1);prop('spoon',-.9,1.73,1.06,1.3,.6)
candle(-1.32,1.725,.9,.09)
// ---- Left wall: bookcase, the clock of butter, pictures over the sofa.
function frameAt(x,y,z,ry,w,h,fn){placed(x,y,z,ry,()=>{box('wood',DARK,0,0,0,w,h,.04,{r:.01});box('plaster',0xe2d2a6,0,0,.012,w-.08,h-.08,.03);fn(w,h)})}
frameAt(-2.595,2.95,.8,Math.PI/2,.36,.46,()=>{cone('cloth',ORANGE,0,-.02,.03,.05,.28,{rz:Math.PI});for(const a of[-.4,0,.4])cone('cloth',LEAF,Math.sin(a)*.06,.17+Math.cos(a)*.02,.03,.02,.14,{rz:a})})
frameAt(-2.595,2.85,1.85,Math.PI/2,.5,.36,()=>{lathe('cloth',0xd9d0b8,0,-.14,.03,[[0,0],[.06,0],[.07,.15],[.09,.2],[.06,.2],[.05,.04],[0,.03]],12,{rx:Math.PI/2});ball('cloth',0xd9d0b8,.09,-.03,.03,.01,.04,.012)})
box('wood',MID,-2.57,2.1,-.02,.05,2.0,.7);for(const z of[-.35,.31])box('wood',WOOD,-2.4,2.1,z,.36,2.0,.04)
for(const y of[1.45,1.95,2.45,2.95])box('wood',WOOD,-2.4,y,-.02,.35,.05,.7)
box('wood',DARK,-2.4,3.12,-.02,.42,.09,.76,{r:.02})
for(const y of[1.95,2.45]){let z=-.3;while(z<.27){const w=.04+rnd()*.03,h=.22+rnd()*.12,c=shade([RED,GREEN,MUSTARD,0x5c6f7a,CREAM,RUST][Math.floor(rnd()*6)],.1);box('cloth',c,-2.4,y+.025+h/2,z+w/2,.28,h,w-.004);z+=w}}
prop('book_stack',-2.4,1.475,-.02,.55);candle(-2.4,3.165,-.02,.1)
// ---- Windows: arched, with mullions, sill and curtains (right wall and back wall).
function window(x,y,z,ry){
  placed(x,y,z,ry,()=>{
    const w=1.0,h=.7,outer=arch(w+.16,-.08,h+.08);outer.holes.push(arch(w,0,h))
    add('glass',0x7fa4a6,new THREE.ShapeGeometry(arch(w,0,h),16).translate(0,0,-.03))
    add('wood',DARK,extrude(outer,.08))
    box('wood',DARK,0,(h+w/2)/2,0,.035,h+w/2,.06);box('wood',DARK,0,h*.5,0,w,.035,.06);box('wood',DARK,0,h,0,w,.035,.06)
    box('wood',MID,0,-.1,.06,w+.3,.05,.16,{r:.012})
  })
}
window(-1.9,2.4,-2.19,0);window(3.285,2.25,1.65,-Math.PI/2)
function curtain(x,y,z,ry,hex){
  placed(x,y,z,ry,()=>{
    const sheet=new THREE.PlaneGeometry(.24,1.3,10,10),p=sheet.attributes.position
    for(let i=0;i<p.count;i++)p.setZ(i,.022*Math.cos(p.getX(i)*110)*(1+.15*Math.sin(p.getY(i)*5)))
    sheet.computeVertexNormals();add('cloth',hex,sheet)
  })
}
for(const x of[-2.5,-1.3])curtain(x,2.95,-2.12,0,RED)
for(const z of[1.0,2.3])curtain(3.22,2.75,z,-Math.PI/2,RUST)
placed(-1.9,3.65,-2.12,0,()=>cyl('brass',BRASS,0,0,0,.012,.012,1.5,{rz:Math.PI/2}));placed(3.22,3.46,1.65,-Math.PI/2,()=>cyl('brass',BRASS,0,0,0,.012,.012,1.5,{rz:Math.PI/2}))
// ---- Kitchen along the right wall: counter, sink, tiles, open shelves with crockery.
box('wood',GREEN,3.02,1.48,.15,.6,.76,1.9,{c:true})
box('wood',0xb98a56,3.02,1.9,.15,.68,.07,1.98,{r:.02})
for(const z of[-.48,.15,.78]){box('wood',0x5c7050,2.708,1.5,z,.03,.56,.5,{r:.008});box('wood',0x4a5d40,2.72,1.5,z,.012,.44,.38);ball('brass',BRASS,2.69,1.6,z+.17,.017)}
box('wood',DARK,2.71,1.15,.15,.03,.1,1.88)
box('stone',0xcfc3a6,3.02,1.941,-.4,.46,.012,.42,{r:.004});box('wood',0x2a1d18,3.02,1.947,-.4,.36,.01,.32)
cyl('brass',BRASS,3.21,2.075,-.4,.012,.012,.24);cyl('brass',BRASS,3.11,2.195,-.4,.012,.012,.2,{rz:Math.PI/2});cyl('brass',BRASS,3.01,2.16,-.4,.012,.012,.07)
for(let i=0;i<9;i++)for(let j=0;j<4;j++)box('stone',shade((i+j)%2?0xe6dcc2:0x9eb0a0,.04),3.305,1.99+j*.125,-.8+i*.215,.012,.115,.2)
for(const y of[2.55,3.0]){box('wood',WOOD,3.185,y,.12,.27,.04,1.9,{r:.01});for(const z of[-.6,.1,.85])box('wood',DARK,3.2,y-.07,z,.2,.08,.03,{rz:0})}
for(let i=0;i<5;i++)prop('plate',3.29,2.69,-.7+i*.08,1.2,0,Math.PI/2.1)
for(let i=0;i<5;i++)prop('teacup',3.16,3.04,-.75+i*.25,1.3,Math.PI/2*0+i)
prop('jam_jar',3.22,3.04,.55,1.2)
prop('butter',3.1,1.995,.65,1)
cyl('brass',BRASS,3.2,2.8,.15,.008,.008,1.9,{rx:Math.PI/2})
for(const[z,k]of[[-.5,0],[0,1],[.6,2]]){cyl('brass',BRASS,3.18,2.76,z,.006,.006,.03);if(k===0)lathe('brass',COPPER,3.17,2.5,z,[[0,0],[.06,0],[.07,.09],[.06,.1],[.05,.1],[.05,.09],[0,.0]],12);else cone('cloth',k==1?LEAF:ORANGE,3.18,2.65,z,.05,.2,{rz:Math.PI})}
// ---- Dresser (the tall corner unit): cupboard below, open hutch above, plates and cups on show.
solid(3.01,2.0,-1.67,.58,1.8,.77)
box('wood',GREEN,3.0,1.475,-1.67,.6,.75,.8,{r:.015});box('wood',DARK,3.0,1.875,-1.67,.66,.06,.84,{r:.012})
for(const z of[-1.87,-1.47]){box('wood',0x5c7050,2.69,1.46,z,.03,.62,.36,{r:.008});box('wood',0x4a5d40,2.703,1.46,z,.012,.5,.26);ball('brass',BRASS,2.68,1.46,z+(z<-1.67?.12:-.12),.017)}
for(const z of[-2.03,-1.31])box('wood',WOOD,3.0,2.45,z,.5,1.0,.04)
box('wood',DARK,3.27,2.45,-1.67,.06,1.0,.74)
for(const y of[2.0,2.4,2.8])box('wood',WOOD,3.0,y,-1.67,.5,.04,.72,{r:.008})
box('wood',DARK,3.0,3.0,-1.67,.66,.1,.84,{r:.02});box('wood',DARK,3.0,3.07,-1.67,.46,.06,.6,{r:.02})
for(let i=0;i<6;i++)prop('plate',3.2,2.52,-2.0+i*.1,1,0,Math.PI/2.1)
for(let i=0;i<4;i++)prop('teacup',2.9,2.02,-1.95+i*.2,1.3,i*.4)
prop('teapot',2.95,2.42,-1.5,.8,2);prop('jam_jar',3.0,2.42,-1.9,1.4);prop('jam_jar',3.0,2.42,-1.78,1.4,1)
// ---- Storage by the hearth: barrel of carrots, crates, sacks.
lathe('wood',0x7a5232,2.16,1.1,-1.95,[[0,0],[.19,0],[.225,.22],[.19,.46],[.175,.46],[.175,.4],[0,.4]],14)
for(const[y,r]of[[.06,.205],[.22,.235],[.38,.205]])cyl('brass',0x2a2420,2.16,1.1+y,-1.95,r,r,.025,{seg:14})
for(let i=0;i<7;i++){const a=i*.9,x=2.16+Math.cos(a)*.1,z=-1.95+Math.sin(a)*.1;cone('cloth',shade(ORANGE,.1),x,1.57,z,.035,.24,{rz:Math.PI});ball('cloth',LEAF,x,1.72,z,.035,.025,.035,{w:6,h:4})}
box('wood',shade(WOOD,.1),2.54,1.25,-2.0,.32,.3,.34,{r:.012});box('wood',shade(WOOD,.1),2.5,1.55,-2.02,.28,.26,.3,{r:.012,ry:.2})
// ---- Drying pole: carrots, herbs and onions hang from the beams.
cyl('wood',MID,2.4,3.82,.0,.02,.02,2.6,{rx:Math.PI/2});for(const z of[-1.2,1.2])cyl('cloth',0xcdb283,2.4,4.04,z,.005,.005,.44)
for(let i=0;i<6;i++){const z=-.95+i*.38,k=i%3;cyl('cloth',0xcdb283,2.4,3.74,z,.004,.004,.14)
  if(k===0)for(const a of[0,2.1,4.2])cone('cloth',ORANGE,2.4+Math.cos(a)*.03,3.52,z+Math.sin(a)*.03,.028,.22,{rz:Math.PI});else if(k===1)for(let n=0;n<5;n++)ball('cloth',shade(LEAF,.15),2.4+(rnd()-.5)*.05,3.5-n*.05,z+(rnd()-.5)*.05,.05,.04,.04);else for(let n=0;n<4;n++)ball('cloth',shade(0xc79a4a,.1),2.4+(n%2-.5)*.07,3.5,z+((n>>1)-.5)*.07,.045,.04,.045)}
// ---- Pegs by the door, a framed picture and the tall clock in the front-left corner.
box('wood',DARK,2.75,2.55,2.44,1.0,.07,.04,{r:.01});for(const x of[2.4,2.6,2.8,3.0])cone('wood',MID,x,2.55,2.38,.02,.08,{rx:-Math.PI/2});
prop('hat',2.6,2.4,2.34,.6,0);
box('cloth',RUST,3.0,2.2,2.4,.08,.7,.02);cyl('wood',MID,3.2,1.8,2.2,.015,.015,1.4,{rz:.06})
frameAt(2.85,3.15,2.45,Math.PI,.5,.4,()=>{ball('cloth',0x7a9a6a,0,-.06,.03,.17,.07,.01);ball('cloth',0xc98a3a,.06,.04,.03,.06,.06,.01)})
solid(-2.2,2.2,2.28,.46,2.2,.34)
function grandfather(){
  placed(-2.2,1.1,2.29,Math.PI,()=>{
    box('wood',MID,0,.18,0,.46,.36,.34,{r:.02});box('wood',WOOD,0,.9,0,.34,1.1,.28,{r:.012});box('wood',MID,0,1.5,0,.42,.14,.32,{r:.02})
    box('wood',DARK,0,1.74,0,.4,.38,.3,{r:.015});cyl('wood',DARK,0,1.93,0,.2,.2,.3,{rx:Math.PI/2,seg:14})
    cyl('cloth',0xe8dcb4,0,1.8,.152,.15,.15,.01,{rx:Math.PI/2,seg:20});cyl('brass',BRASS,0,1.8,.159,.012,.012,.008,{rx:Math.PI/2})
    box('wood',DARK,0,1.8,.162,.008,.1,.004,{rz:.4});box('wood',DARK,0,1.8,.162,.006,.13,.004,{rz:-1.3,r:0})
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box('wood',DARK,Math.sin(a)*.125,1.8+Math.cos(a)*.125,.16,.008,.02,.004,{rz:-a})}
    box('glass',0x2a2f33,0,.88,.142,.2,.7,.01);cyl('brass',BRASS,0,.78,.16,.075,.075,.012,{rx:Math.PI/2,seg:16});cyl('brass',BRASS,0,1.0,.15,.003,.003,.5)
  })
}
grandfather()
// ---- Hanging lantern (also the room's light), picture over the hearth wall.
prop('lantern',.4,3.1,.4,1.2);cyl('wood',DARK,.4,3.9,.4,.007,.007,.7);ball('brass',BRASS,.4,4.22,.4,.03)
frameAt(-.65,2.85,-2.19,0,.5,.62,()=>{cone('cloth',ORANGE,-.02,-.02,.03,.075,.4,{rz:Math.PI});for(const a of[-.5,-.15,.2,.5])cone('cloth',LEAF,Math.sin(a)*.08,.22+Math.cos(a)*.03,.03,.03,.2,{rz:a})})
frameAt(2.35,2.75,-2.19,0,.55,.4,()=>{ball('cloth',0x7a9a6a,0,-.08,.03,.2,.05,.01);lathe('cloth',0xd9d0b8,-.04,-.1,.03,[[0,0],[.05,0],[.06,.12],[.08,.16],[.05,.16],[.04,.04],[0,.03]],12,{rx:Math.PI/2})})
// ---- Assemble.
for(const[material,parts]of buckets){const mesh=new THREE.Mesh(mergeGeometries(parts),materials[material]);mesh.name=`Cottage ${material}`;mesh.receiveShadow=true;mesh.castShadow=!['glow','flame','glass'].includes(material);room.add(mesh);parts.forEach(p=>p.dispose())}
// Props from the garden's models: one InstancedMesh per sub-mesh and model, whatever the copy count.
const unit=new THREE.Matrix4()
for(const[name,matrices]of props){
  const source=model(name);source.updateMatrixWorld(true)
  source.traverse(mesh=>{
    if(!mesh.isMesh)return
    const instanced=new THREE.InstancedMesh(mesh.geometry,mesh.material,matrices.length)
    matrices.forEach((m,i)=>instanced.setMatrixAt(i,unit.multiplyMatrices(m,mesh.matrixWorld)))
    instanced.castShadow=false;instanced.receiveShadow=true;instanced.frustumCulled=false;instanced.name=`Cottage ${name}`;room.add(instanced)
  })
}
const lamp=new THREE.PointLight(0xffd6a2,12,7,2);lamp.position.copy(house.localToWorld(new THREE.Vector3(.4,3.35,.4)));scene.add(lamp)
const fire=new THREE.PointLight(0xff8a3a,5,5,2);fire.position.copy(house.localToWorld(new THREE.Vector3(1.28,1.55,-1.6)));scene.add(fire)
export const cottageRoom=room
