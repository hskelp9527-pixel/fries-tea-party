import {test}from'node:test'
import assert from'node:assert/strict'
import {Vector3,Quaternion,Matrix4,Euler}from'three'
import{placed,doors}from'../src/layout.js'
import{pathDistance}from'../src/fields.js'
const world=(name,point)=>{const p=placed.find(p=>p.model===name);return new Vector3(...point).applyMatrix4(new Matrix4().compose(new Vector3(...p.pos),new Quaternion().setFromEuler(new Euler(0,(p.rot??0)*Math.PI/180,0)),new Vector3().setScalar(p.scale??1)))}
test('garden paths meet the tree portal and the cottage entrance',()=>{
  const d=doors.tree,entry=world('big_tree',[d.hinge[0]+.655*d.scale[0],d.hinge[1],d.hinge[2]])
  assert.ok(pathDistance(entry.x,entry.z)<.45,'The tree path reaches the actual transformed doorway')
  const house=world('house',[1.3,0,3.9]);assert.ok(pathDistance(house.x,house.z)<.8,'The cottage landing belongs to the connected path network')
  for(const[x,z]of[[10,-14.45],[13,-15.85],[14.6,-17.25]])assert.ok(pathDistance(x,z)<.55,'Each stair flight joins a path')
})
test('the tree approach arch is not embedded in the roots',()=>{
  const tree=placed.find(p=>p.model==='big_tree')
  for(const arch of placed.filter(p=>p.model==='rose_arch'))assert.ok(Math.hypot(arch.pos[0]-tree.pos[0],arch.pos[2]-tree.pos[2])>5,'Flower arches stand on open paths rather than inside the root mound')
})
