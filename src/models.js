import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { RAPIER, world } from './physics.js'
import { shapes } from './layout.js'
import { rimLit } from './scene.js'

// Every art/models/<name>.glb on disk at build time, the garden kit in art/models/kit/ included, named by file.
// Dropping a file in replaces that model's boxes. art/models/blender/ holds modelling work files, some with the same
// names as the finished models, so it is left out.
const files = import.meta.glob(['/art/models/**/*.glb', '!/art/models/blender/**'], { eager: true, query: '?url', import: 'default' })
const loader = new GLTFLoader()
const gltfs = {}
await Promise.all(Object.entries(files).map(async ([path, url]) => {
  const gltf = gltfs[path.split('/').pop().slice(0, -'.glb'.length)] = await loader.loadAsync(url)
  stripRootMotion(gltf)
  // The characters (the models with clips) catch the sun on their edges.
  if (gltf.animations.length) gltf.scene.traverse(o => { if (o.isMesh) o.material = rimLit(o.material) })
}))

// Root motion: the clips carry the hips across the ground, but the game moves the character itself. Every
// clip keeps the hips' height and loses their horizontal travel, remembering the ground speed that travel
// implied (metres per second at scale 1) so walk and run can be paced to the real speed.
function stripRootMotion(gltf) {
  const hips = THREE.PropertyBinding.sanitizeNodeName('mixamorig:Hips')
  gltf.scene.updateMatrixWorld(true)
  for (const clip of gltf.animations) {
    const track = clip.tracks.find(t => t.name === `${hips}.position`)
    if (!track) continue
    const v = track.values, end = v.length - 3
    const scale = gltf.scene.getObjectByName(hips).parent.getWorldScale(new THREE.Vector3()).x
    clip.userData.groundSpeed = Math.hypot(v[end] - v[0], v[end + 2] - v[2]) * scale / clip.duration
    for (let i = 0; i < v.length; i += 3) {
      v[i] = v[0]
      v[i + 2] = v[2]
    }
  }
}

// The glTF clips of a model; none for a box placeholder.
export const clips = name => gltfs[name] ? gltfs[name].animations : []

const box = new THREE.BoxGeometry()
const DEG = Math.PI / 180
const materials = {}

// A new instance of a model: the glb when present, otherwise its placeholder boxes.
export function model(name) {
  const object = gltfs[name] ? clone(gltfs[name].scene) : new THREE.Group()
  if (!gltfs[name]) {
    for (const [x, y, z, w, h, d, colour, rx = 0, ry = 0, rz = 0] of shapes[name]) {
      const mesh = new THREE.Mesh(box, materials[colour] ??= new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85 }))
      mesh.position.set(x, y, z)
      mesh.rotation.set(rx * DEG, ry * DEG, rz * DEG, 'YXZ')
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

const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), turn = new THREE.Euler()

// Static colliders for a placed object: the glb's <name>_collider mesh, else the glb's own meshes (so openings in
// a model, the tunnel through the tree's roots, the grotto under the fountain, the cottage's doorway, stay
// open), else the placeholder boxes; with `boxes`, the placeholder boxes always. Returns the colliders.
export function addColliders(name, object, boxes = false) {
  object.updateMatrixWorld(true)
  const node = object.getObjectByName(`${name}_collider`), colliders = []
  if (!boxes && (node || gltfs[name])) {
    ;(node ?? object).traverse(mesh => {
      if (!mesh.isMesh) return
      const position = mesh.geometry.attributes.position
      const vertices = new Float32Array(position.count * 3)
      for (let i = 0; i < position.count; i++) v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(vertices, i * 3)
      colliders.push(world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, new Uint32Array(mesh.geometry.index.array))))
    })
    node?.removeFromParent()
    return colliders
  }
  object.getWorldQuaternion(q)
  object.getWorldScale(s)
  for (const [x, y, z, w, h, d, , rx = 0, ry = 0, rz = 0] of shapes[name]) {
    v.set(x, y, z).applyMatrix4(object.matrixWorld)
    colliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(w * s.x / 2, h * s.y / 2, d * s.z / 2)
      .setTranslation(v.x, v.y, v.z).setRotation(new THREE.Quaternion().setFromEuler(turn.set(rx * DEG, ry * DEG, rz * DEG, 'YXZ')).premultiply(q))))
  }
  return colliders
}
