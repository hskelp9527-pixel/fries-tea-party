import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { RAPIER, world } from './physics.js'
import { shapes } from './layout.js'

// Every art/models/<name>.glb on disk at build time. Dropping a file in replaces that model's boxes.
const files = import.meta.glob('/art/models/*.glb', { eager: true, query: '?url', import: 'default' })
const loader = new GLTFLoader()
const gltfs = {}
await Promise.all(Object.entries(files).map(async ([path, url]) => {
  gltfs[path.slice('/art/models/'.length, -'.glb'.length)] = await loader.loadAsync(url)
}))

const box = new THREE.BoxGeometry()
const materials = {}

// A new instance of a model: the glb when present, otherwise its placeholder boxes.
export function model(name) {
  const object = gltfs[name] ? clone(gltfs[name].scene) : new THREE.Group()
  if (!gltfs[name]) {
    for (const [x, y, z, w, h, d, colour] of shapes[name]) {
      const mesh = new THREE.Mesh(box, materials[colour] ??= new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85 }))
      mesh.position.set(x, y, z)
      mesh.scale.set(w, h, d)
      object.add(mesh)
    }
  }
  object.rotation.order = 'YXZ'
  object.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
  return object
}

// Gives an object its own glowing materials, so it can light up without lighting its copies.
export function glow(object, colour, intensity) {
  object.traverse(o => {
    if (!o.isMesh) return
    o.material = o.material.clone()
    o.material.emissive.set(colour)
    o.material.emissiveIntensity = intensity
  })
}

const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3()

// Static colliders for a placed object: the glb's <name>_collider mesh, or else the placeholder boxes.
export function addColliders(name, object) {
  object.updateMatrixWorld(true)
  const node = object.getObjectByName(`${name}_collider`)
  if (node) {
    node.traverse(mesh => {
      if (!mesh.isMesh) return
      const position = mesh.geometry.attributes.position
      const vertices = new Float32Array(position.count * 3)
      for (let i = 0; i < position.count; i++) v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(vertices, i * 3)
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, new Uint32Array(mesh.geometry.index.array)))
    })
    node.removeFromParent()
    return
  }
  object.getWorldQuaternion(q)
  object.getWorldScale(s)
  for (const [x, y, z, w, h, d] of shapes[name]) {
    v.set(x, y, z).applyMatrix4(object.matrixWorld)
    world.createCollider(RAPIER.ColliderDesc.cuboid(w * s.x / 2, h * s.y / 2, d * s.z / 2)
      .setTranslation(v.x, v.y, v.z).setRotation(q))
  }
}
