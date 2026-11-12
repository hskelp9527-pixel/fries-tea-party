import * as THREE from 'three/webgpu'
import { color, mix, mx_noise_float, positionLocal, sin, smoothstep } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { things } from './garden.js'
import { roses } from './foliage.js'
import { scene } from './scene.js'
import { surfacePalette } from './look.js'
import './cottage.js'

// Small authored details share geometry by material; none changes the walkable route.
function batch(parent, name, material, boxes) {
  const pieces = boxes.map(([x,y,z,w,h,d]) => new THREE.BoxGeometry(w,h,d).translate(x,y,z))
  const geometry = mergeGeometries(pieces)
  pieces.forEach(piece => piece.dispose())
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name; mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
const wood = new THREE.MeshStandardNodeMaterial({ roughness: 0.86 })
const grain = sin(positionLocal.y.mul(110).add(mx_noise_float(positionLocal.mul(8)).mul(9))).mul(0.5).add(0.5)
wood.colorNode = color(surfacePalette.wood).mul(grain.mul(0.3).add(0.8))
const brass = new THREE.MeshStandardMaterial({ color: 0xb99559, metalness: 0.65, roughness: 0.4 })
const stone = new THREE.MeshStandardMaterial({ color: 0x776857, roughness: 0.95 })
const under = new THREE.Group(); under.name='Under-table reading nook'; scene.add(under)
const books=[]
for(let i=0;i<4;i++) books.push([-.62,0.022+i*.035,-2.4,0.22+(i%2)*.06,.025,.15])
batch(under,'Tiny stacked books',wood,books)
batch(under,'Sugar stepping stones',new THREE.MeshStandardMaterial({color:0xf2dbad,roughness:1}),[[.45,.025,-2.0,.09,.05,.08],[.6,.02,-2.14,.075,.04,.09],[.67,.018,-2.3,.08,.036,.07]])
const threads=[]
for(let i=0;i<80;i++) {
  const z=-7.2+i*.10
  for(const x of [-1.11,1.11]) threads.push([x,.35-.025*Math.sin(i*1.7),z,.009,.09,.009])
}
batch(under,'Woven cloth fringe',new THREE.MeshStandardMaterial({color:0xc8b997,roughness:1}),threads)

// A world-space bark lining avoids stretching the original tree's atlas inside the tunnel.
const bark = new THREE.MeshStandardNodeMaterial({ side: THREE.BackSide, roughness: 1 })
const furrow = mx_noise_float(positionLocal.mul(new THREE.Vector3(18,2,4))).mul(.5).add(.5)
bark.colorNode = mix(color(0x211b19),color(0x65432e),furrow)
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(.87,.87,2.1,24,1,true).rotateX(Math.PI/2),bark)
tunnel.name='Detailed hollow lining'; tunnel.scale.y=1.4; tunnel.position.set(-.18,1.5,.08)
things.big_tree.add(tunnel)
// Taller rose banks screen the terrace view on the far side without closing the path.
const hedge = new THREE.MeshStandardNodeMaterial({roughness:1})
hedge.colorNode = color(0x333b28).mul(mx_noise_float(positionLocal.mul(12)).mul(.3).add(.85))
const banks=[]
const start=new THREE.Vector3(-5.18,0,-16.19),end=new THREE.Vector3(.82,0,-26.59),direction=end.clone().sub(start).normalize(),across=new THREE.Vector3(-direction.z,0,direction.x)
for(let d=0;d<10;d+=.5)for(const side of [-1,1]){
  const p=start.clone().addScaledVector(direction,d).addScaledVector(across,side*1.55)
  banks.push([p.x,.75,p.z,.72,1.5,.72])
}
// The surrounding leaf volumes provide the screening; no opaque block core.
