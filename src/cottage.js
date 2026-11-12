import * as THREE from 'three/webgpu'
import { color, mx_noise_float, positionLocal, sin, time } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { things } from './garden.js'
import { model } from './models.js'
import { scene } from './scene.js'
import { RAPIER, world } from './physics.js'

const house=things.house,room=new THREE.Group();room.name='March Hare cottage interior';house.add(room)
const materials={
  plaster:new THREE.MeshStandardNodeMaterial({roughness:1}),
  cream:new THREE.MeshStandardMaterial({color:0xe3d2a9,roughness:.95}),
  wood:new THREE.MeshStandardNodeMaterial({roughness:.8}),
  darkWood:new THREE.MeshStandardMaterial({color:0x3e2e24,roughness:.8}),
  stone:new THREE.MeshStandardMaterial({color:0x6b5d50,roughness:1}),
  green:new THREE.MeshStandardMaterial({color:0x46573e,roughness:.9}),
  cloth:new THREE.MeshStandardNodeMaterial({roughness:.98}),
  brass:new THREE.MeshStandardMaterial({color:0xb2985f,metalness:.6,roughness:.45}),
  coal:new THREE.MeshStandardMaterial({color:0x291712,emissive:0xb7350a,emissiveIntensity:.7,roughness:1}),
  flame:new THREE.MeshStandardNodeMaterial({color:0xffac43,roughness:1,side:THREE.DoubleSide}),
}
materials.wood.colorNode=color(0x755035).mul(mx_noise_float(positionLocal.mul(new THREE.Vector3(30,1,2))).mul(.08).add(.94))
materials.plaster.colorNode=color(0xbdb099).mul(mx_noise_float(positionLocal.mul(45)).mul(.035).add(.965))
materials.cloth.colorNode=color(0x924443).mul(mx_noise_float(positionLocal.mul(130)).mul(.06).add(.94))
materials.flame.emissiveNode=color(0xffa443).mul(sin(time.mul(8)).mul(.15).add(.8))
const boxes=new Map()
function geometry(material,part){if(!boxes.has(material))boxes.set(material,[]);boxes.get(material).push(part.index?part.toNonIndexed():part)}
function solid(x,y,z,w,h,d){
  const position=house.localToWorld(new THREE.Vector3(x,y,z))
  world.createCollider(RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(...position.toArray()).setRotation(house.getWorldQuaternion(new THREE.Quaternion())))
}
function box(material,x,y,z,w,h,d,collide=false,round=0){
  geometry(material,(round?new RoundedBoxGeometry(w,h,d,2,Math.min(round,w*.4,h*.4,d*.4)):new THREE.BoxGeometry(w,h,d)).translate(x,y,z))
  if(collide)solid(x,y,z,w,h,d)
}
function cylinder(material,x,y,z,r,h,rx=0,rz=0){geometry(material,new THREE.CylinderGeometry(r,r,h,12).rotateX(rx).rotateZ(rz).translate(x,y,z))}
// One connected floor, through the original arched doorway.
for(let x=-2.58;x<3.4;x+=.24)box('wood',x,1.075,.125,.232,.05,4.85)
solid(.35,1.03,.125,6.1,.14,4.85)
box('wood',1.3,1.075,2.7,1.62,.05,.38,true)
box('plaster',-2.66,2.71,.125,.08,3.22,4.85,true)
box('plaster',3.36,2.71,.125,.08,3.22,4.85,true)
box('plaster',.35,2.71,-2.26,6.1,3.22,.08,true)
box('plaster',-1.105,2.71,2.51,3.19,3.22,.08,true)
box('plaster',2.755,2.71,2.51,1.29,3.22,.08,true)
box('plaster',1.3,3.68,2.51,1.62,1.28,.08,true)
box('cream',.35,4.31,.125,6.1,.12,4.85,true)
for(const x of [-2.4,-.7,1,2.7])box('darkWood',x,4.17,.125,.12,.18,4.85)
for(const x of [-2.59,3.29])box('darkWood',x,1.35,.125,.1,.5,4.7)
for(const z of [-2.19,2.44])box('darkWood',.35,1.35,z,5.9,.5,.1)
// Sleeping room at the rear left, with an open doorway from the living room.
for(const [x,width]of [[-2.08,1.18],[-.38,.22]])box('cream',x,2.1,-.45,width,2,.1,true)
box('darkWood',-1.03,3.02,-.45,1.05,.12,.13)
for(const x of [-1.55,-.51])box('darkWood',x,2.03,-.45,.07,1.86,.14)
box('wood',-1.9,1.35,-1.4,1.15,.5,1.45,true)
box('cream',-1.9,1.66,-1.4,1.13,.15,1.4,false,.035)
box('cloth',-1.9,1.76,-1.18,1.16,.06,.94,false,.025)
box('cream',-1.9,1.8,-1.88,.78,.13,.31,false,.055)
box('darkWood',-1.9,1.9,-2.14,1.22,.65,.09)
for(const x of [-2.4,-2.15,-1.9,-1.65,-1.4])box('wood',x,1.95,-2.08,.12,.52,.035,false,.01)
for(const z of [-1.59,-1.23,-.87])box('cream',-1.9,1.795,z,1.08,.006,.008)
// A furnished sitting area with clear circulation from the door to the hearth.
box('cloth',-1.0,1.105,1.1,2.45,.012,1.7)
box('wood',-1.13,1.67,1.1,.86,.1,.67,true,.02)
for(const x of [-1.45,-.81])for(const z of [.87,1.33])box('darkWood',x,1.38,z,.07,.5,.07)
box('darkWood',-2.25,1.27,1.2,.56,.32,1.16,true,.025)
box('green',-2.25,1.5,1.2,.56,.15,1.12,false,.055)
box('green',-2.5,1.79,1.2,.17,.72,1.2,false,.055)
for(const z of [.59,1.81])box('wood',-2.25,1.67,z,.66,.14,.12,false,.025)
for(const z of [.77,1.64])box('cream',-2.4,1.85,z,.075,.32,.29,false,.03)
for(const z of [.28,1.92])for(let i=0;i<22;i++)box('cream',-2.16+i*.105,1.116,z,.018,.005,.07)
// Kitchen counters, a sink and a plate rack occupy the right side.
box('green',3.02,1.48,.15,.6,.76,1.9,true)
box('cream',3.02,1.89,.15,.66,.08,1.98)
for(const z of [-.48,.15,.78]){box('darkWood',2.7,1.47,z,.025,.59,.025);box('brass',2.675,1.56,z,.025,.025,.11);box('green',2.682,1.48,z,.018,.44,.45,false,.01)}
box('darkWood',3.02,1.935,-.4,.35,.012,.37)
for(const x of [2.8,3.24])box('stone',x,1.967,-.4,.045,.06,.47,false,.01)
for(const z of [-.64,-.16])box('stone',3.02,1.967,z,.48,.06,.045,false,.01)
cylinder('brass',3.21,2.075,-.4,.012,.24)
cylinder('brass',3.11,2.195,-.4,.012,.2,0,Math.PI/2)
cylinder('brass',3.01,2.16,-.4,.012,.07)
box('wood',3.19,2.71,-.5,.33,.1,1.8)
box('wood',3.25,2.99,-.5,.18,.5,1.8)
// A tall pantry and panelled doors provide actual household storage.
box('wood',3.01,2.0,-1.67,.58,1.8,.77,true,.015)
for(const z of [-1.87,-1.47]){box('green',2.706,2.0,z,.035,1.64,.35,false,.018);cylinder('brass',2.67,2.02,z,.014,.09,Math.PI/2)}
box('darkWood',3.01,2.94,-1.67,.66,.08,.84,false,.01)
// The actual quest mantel is at the back of the house, beyond the entrance.
box('stone',.82,1.49,-2.08,.16,.78,.3,true);box('stone',1.74,1.49,-2.08,.16,.78,.3,true)
box('stone',1.28,1.14,-1.99,1.25,.08,.57,true)
box('stone',1.28,1.86,-2.08,1.2,.12,.32,true)
box('darkWood',1.28,1.52,-2.17,.73,.61,.03)
for(const z of [-2.1,-1.99])cylinder('darkWood',1.28,1.22,z,.045,.54,0,Math.PI/2)
for(let i=0;i<7;i++)geometry('coal',new THREE.IcosahedronGeometry(.035,0).scale(1,.6,1).translate(1.02+i*.085,1.21,-1.97))
for(const x of [1.08,1.28,1.48]){
  const flame=new THREE.Shape();flame.moveTo(-.045,0);flame.bezierCurveTo(-.075,.07,.015,.12,.01,.22);flame.bezierCurveTo(.08,.13,.075,.04,.045,0);flame.closePath()
  geometry('flame',new THREE.ShapeGeometry(flame,8).translate(x,1.2,-2.04))
}
for(const x of [.98,1.13,1.28,1.43,1.58])box('darkWood',x,1.27,-1.87,.012,.16,.012)
// Bookshelves and framed windows make this a home rather than a stage backdrop.
for(const y of [1.45,1.95,2.45,2.95])box('wood',-2.4,y,-.02,.35,.07,.65)
for(let i=0;i<7;i++){const z=-.28+i*.08;box(i%2?'cloth':'green',-2.4,2.17,z,.29,.36,.055);for(const y of [2.06,2.28])box('cream',-2.249,y,z,.004,.012,.035)}
function windowAt(x,y,z,side=false){
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.14),new THREE.MeshStandardMaterial({color:0x6a8b90,emissive:0x728f91,emissiveIntensity:.3,roughness:.4}))
  glass.position.set(x,y,z);if(side)glass.rotation.y=-Math.PI/2;room.add(glass)
  if(side){for(const dz of [-.55,0,.55])box('darkWood',x-.025,y,z+dz,.06,1.24,.055);for(const dy of [-.62,0,.62])box('darkWood',x-.025,y+dy,z,.06,.055,1.15)}
  else{for(const dx of [-.55,0,.55])box('darkWood',x+dx,y,z+.025,.055,1.24,.06);for(const dy of [-.62,0,.62])box('darkWood',x,y+dy,z+.025,1.15,.055,.06)}
}
windowAt(-1.9,2.62,-2.2);windowAt(3.3,2.8,1.5,true)
function curtain(x,y,z,side=false){
  const sheet=new THREE.PlaneGeometry(.24,1.35,12,12),p=sheet.attributes.position
  for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i);p.setZ(i,.025*Math.cos(px*110)*(1+.15*Math.sin(py*5)))}
  sheet.computeVertexNormals();if(side)sheet.rotateY(-Math.PI/2);sheet.translate(x,y,z);geometry('cloth',sheet)
}
for(const x of [-2.53,-1.27])curtain(x,2.62,-2.14)
for(const z of [.87,2.13])curtain(3.24,2.8,z,true)
cylinder('brass',-1.9,3.32,-2.12,.012,1.48,0,Math.PI/2)
cylinder('brass',3.22,3.5,1.5,.012,1.48,Math.PI/2)
cylinder('brass',.4,3.87,.4,.008,.7)
geometry('cream',new THREE.CylinderGeometry(.12,.31,.25,24).translate(.4,3.48,.4))
for(const[material,parts]of boxes){const mesh=new THREE.Mesh(mergeGeometries(parts),materials[material]);mesh.name=`Cottage ${material}`;mesh.receiveShadow=true;mesh.castShadow=material!=='flame'&&material!=='coal';room.add(mesh);parts.forEach(p=>p.dispose())}
for(const[name,position,scale]of [['teapot',[-1.25,1.74,1.08],.65],['teacup',[-.91,1.73,1.2],1],['milk_jug',[3.02,1.94,.65],1],['plate',[3.0,2.78,.2],1],['candle',[-2.4,3.0,-.02],1],['book_stack',[-2.4,1.49,-.02],.55],['jam_jar',[3.02,1.94,.2],1]]){const prop=model(name);prop.position.set(...position);prop.scale.setScalar(scale);room.add(prop)}
const lamp=new THREE.PointLight(0xffd6a2,12,7,2);lamp.position.copy(house.localToWorld(new THREE.Vector3(.4,3.35,.4)));scene.add(lamp)
const bulb=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshStandardMaterial({color:0xffdfac,emissive:0xffcf80,emissiveIntensity:2,roughness:.9}));bulb.position.set(.4,3.32,.4);room.add(bulb)
export const cottageRoom=room
