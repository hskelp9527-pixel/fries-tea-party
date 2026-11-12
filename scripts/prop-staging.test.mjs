import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three/webgpu'
import {spoonBridge,centreProp}from'../src/prop-staging.js'

test('the asymmetric spoon spans the real bridge along its measured long axis',()=>{
  const spoon=new THREE.Group();spoon.add(new THREE.Mesh(new THREE.BoxGeometry(.15,.025,.027).translate(.055,.012,0)))
  const from=new THREE.Vector3(.1,.09,-1.65),to=new THREE.Vector3(.1,.008,-2.12)
  const bridge=spoonBridge(spoon,from,to);bridge.place()
  const a=spoon.localToWorld(new THREE.Vector3(-.02,.012,0)),b=spoon.localToWorld(new THREE.Vector3(.13,.012,0))
  assert.ok(a.distanceTo(to)<1e-6&&b.distanceTo(from)<1e-6,'The visible mesh must connect the actual endpoints')
})
test('the visible centre of a scaled face-up watch is the repair target',()=>{
  const watch=new THREE.Group();watch.add(new THREE.Mesh(new THREE.BoxGeometry(.052,.07,.025).translate(0,.035,0)))
  watch.scale.setScalar(4.5);watch.rotation.x=-Math.PI/2
  const target=new THREE.Vector3(-2.5,1.02,-6.45);centreProp(watch,target)
  assert.ok(new THREE.Box3().setFromObject(watch).getCenter(new THREE.Vector3()).distanceTo(target)<1e-6)
})
