import * as THREE from 'three/webgpu'

export function spoonBridge(spoon,from,to){
  const bounds=new THREE.Box3().setFromObject(spoon),size=bounds.getSize(new THREE.Vector3())
  const alongX=size.x>=size.z,axis=alongX?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1)
  const run=to.clone().sub(from),length=run.length(),scale=length/Math.max(size.x,size.z)
  const centre=from.clone().lerp(to,.5),localCentre=bounds.getCenter(new THREE.Vector3())
  const handle=localCentre.clone();handle[alongX?'x':'z']=bounds.max[alongX?'x':'z']-Math.max(size.x,size.z)*.1
  handle.y=bounds.min.y+size.y*.1
  const rotation=new THREE.Quaternion().setFromUnitVectors(axis.negate(),run.clone().normalize())
  // Keep the handle at the cup and a shallow spoon bowl at the ground end.
  spoon.scale.set(scale,scale*.4,scale)
  return {centre,length,handle,place(){
    spoon.quaternion.copy(rotation)
    spoon.position.copy(centre).sub(localCentre.clone().multiply(spoon.scale).applyQuaternion(rotation))
    spoon.updateWorldMatrix(true,true)
  }}
}

export function centreProp(object,point){
  object.updateWorldMatrix(true,true)
  const centre=new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
  const origin=object.getWorldPosition(new THREE.Vector3()).add(point).sub(centre)
  object.position.copy(object.parent?object.parent.worldToLocal(origin):origin)
  object.updateWorldMatrix(true,true)
}
