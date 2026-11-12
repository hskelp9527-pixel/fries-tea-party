import * as THREE from 'three/webgpu'
import {attribute,vec3,texture,mix} from 'three/tsl'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

// A static, heterogeneous prop can share one draw without losing its painted
// maps: its material identity becomes vertex data and a small sampler selector.
export function mergePaintedProp(root){
  root.updateMatrixWorld(true)
  const inverse=root.matrixWorld.clone().invert(),sources=[],pieces=[],maps=[]
  root.traverseVisible(mesh=>{if(mesh.isMesh&&!Array.isArray(mesh.material)&&!mesh.material.transparent)sources.push(mesh)})
  for(const mesh of sources){
    const source=mesh.material,geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld))
    const count=geometry.attributes.position.count,tint=new Uint8Array(count*3),surface=new Uint8Array(count*3),emission=new Uint8Array(count*3)
    const c=source.color,e=source.emissive.clone().multiplyScalar(source.emissiveIntensity)
    let map=0
    if(source.map){if(!maps.includes(source.map))maps.push(source.map);map=maps.indexOf(source.map)+1}
    for(let i=0;i<count;i++){
      tint.set([c.r*255,c.g*255,c.b*255],i*3);surface.set([source.roughness*255,source.metalness*255,map],i*3)
      emission.set([e.r*63.75,e.g*63.75,e.b*63.75],i*3)
    }
    for(const key of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(key))geometry.deleteAttribute(key)
    if(!geometry.hasAttribute('uv'))geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(count*2),2))
    geometry.setAttribute('propTint',new THREE.BufferAttribute(tint,3,true));geometry.setAttribute('propSurface',new THREE.BufferAttribute(surface,3,true));geometry.setAttribute('propEmission',new THREE.BufferAttribute(emission,3,true));geometry.clearGroups();pieces.push(geometry)
  }
  if(maps.length>12)throw Error('The static prop exceeds its texture sampler budget')
  const geometry=mergeGeometries(pieces),surface=attribute('propSurface','vec3')
  let paint=vec3(1)
  for(let i=0;i<maps.length;i++)paint=mix(paint,texture(maps[i]).rgb,surface.z.mul(255).round().equal(i+1))
  const material=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide})
  material.colorNode=attribute('propTint','vec3').mul(paint);material.roughnessNode=surface.x;material.metalnessNode=surface.y;material.emissiveNode=attribute('propEmission','vec3').mul(4)
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Unified painted tea table';mesh.receiveShadow=true
  geometry.computeBoundingSphere();sources.forEach(source=>source.removeFromParent());pieces.forEach(piece=>piece.dispose());root.add(mesh)
}
