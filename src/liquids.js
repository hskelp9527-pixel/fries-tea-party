import * as THREE from 'three/webgpu'
import { uniform, uv, sin, fract, smoothstep, mix, pow, dot, float, vec2, vec3, texture, normalMap, positionViewDirection } from 'three/tsl'
import { scene } from './scene.js'
import { awake, things } from './garden.js'
import { effects, syrup } from './layout.js'

export const TEA = new THREE.Color(0.5, 0.2, 0.05), SYRUP = new THREE.Color(0.95, 0.5, 0.1)
const TAU = Math.PI * 2, fract1 = x => x - Math.floor(x)
const streams = [], surfaces = [], sheets = []
const running = s => !s.frozen && (s.layer === 'live' || awake[s.layer])
export const liquidDebug = uniform(0) // 1: advected field, 2: resolved normals

// A deterministic, periodic slope field. Mip filtering keeps tiny tea sets from sparkling.
const N = 128, data = new Uint8Array(N * N * 4)
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const u = x / N * TAU, v = y / N * TAU
  const nx = 0.24 * Math.cos(u * 3 + Math.sin(v)) + 0.12 * Math.cos(u * 7 + v * 2)
  const ny = 0.24 * Math.cos(v * 4 + Math.sin(u)) + 0.12 * Math.cos(v * 9 - u * 2)
  const n = new THREE.Vector3(-nx, -ny, 1).normalize(), i = (y * N + x) * 4
  data[i] = (n.x * 0.5 + 0.5) * 255
  data[i + 1] = (n.y * 0.5 + 0.5) * 255
  data[i + 2] = (n.z * 0.5 + 0.5) * 255
  data[i + 3] = 255
}
const normals = new THREE.DataTexture(data, N, N)
normals.wrapS = normals.wrapT = THREE.RepeatWrapping
normals.generateMipmaps = true
normals.minFilter = THREE.LinearMipmapLinearFilter
normals.magFilter = THREE.LinearFilter
normals.needsUpdate = true

// Water2Mesh.js technique: two advected normal samples half a cycle apart, crossfaded
// where either phase resets. Environment PBR replaces per-cup planar reflection passes.
function flowNormal(run, coordinates, direction, speed) {
  const phase = fract(run.mul(speed)), other = fract(phase.add(0.5))
  const a = texture(normals, coordinates.sub(direction.mul(phase)))
  const b = texture(normals, coordinates.sub(direction.mul(other)))
  return mix(a, b, phase.sub(0.5).abs().mul(2))
}
function material(colour, mask = float(1), field = vec3(0.5, 0.5, 1), thickness = 0.01) {
  const m = new THREE.MeshPhysicalNodeMaterial({ color: colour, roughness: 0.13,
    clearcoat: 1, clearcoatRoughness: 0.08, transmission: 0.25, thickness,
    attenuationColor: colour, attenuationDistance: thickness * 5, ior: 1.333,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.015 })
  m.normalNode = normalMap(field)
  const fresnel = pow(float(1).sub(dot(m.normalNode, positionViewDirection).abs().saturate()), 5)
  m.opacityNode = mix(0.67, 0.96, fresnel).mul(mask)
  m.colorNode = mix(vec3(colour), field, liquidDebug.equal(1))
  m.colorNode = mix(m.colorNode, m.normalNode.mul(0.5).add(0.5), liquidDebug.equal(2))
  return m
}
const ringGeometry = new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2)
const dropGeometry = new THREE.SphereGeometry(1, 8, 6)

// Points are in parent's frame; use a scaled parent for miniature or giant teaware.
// height is the ballistic apex above the spout. Mutating from/to tracks a moving pour.
// stop() drains the tail; remove() drains and then releases the effect, as callers expect.
export function stream(from, to, { height = 0.1, radius = 0.01, colour = TEA, layer = 'live', parent = scene, frozen = false } = {}) {
  const run = uniform(0), head = uniform(layer === 'live' && !frozen ? 0 : 2), tail = uniform(-1)
  const along = uv().x
  const field = flowNormal(run, vec2(along.mul(3), uv().y.mul(0.6)), vec2(1, 0.08), 2.5)
  const beads = sin(along.mul(95).sub(run.mul(26))).mul(0.5).add(0.5)
  const breakup = mix(1, smoothstep(0.24, 0.52, beads), smoothstep(0.72, 1, along))
  const envelope = smoothstep(tail, tail.add(0.025), along).mul(float(1).sub(smoothstep(head.sub(0.025), head, along)))
  const m = material(colour, envelope.mul(breakup), field, radius * 2)
  const g = new THREE.BufferGeometry(), segments = 64, sides = 10
  const positions = new Float32Array((segments + 1) * (sides + 1) * 3), uvs = [], indices = []
  for (let i = 0; i <= segments; i++) for (let j = 0; j <= sides; j++) {
    uvs.push(i / segments, j / sides)
    if (i < segments && j < sides) {
      const a = i * (sides + 1) + j, b = a + sides + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  const body = new THREE.Mesh(g, m), group = new THREE.Group()
  group.add(body)
  parent.add(group)
  const rings = [0, 0.33, 0.67].map(phase => {
    const fade = uniform(0), ring = new THREE.Mesh(ringGeometry, material(colour, fade))
    ring.userData = { phase, fade }
    group.add(ring)
    return ring
  })
  const splashMaterial = material(colour)
  const droplets = new THREE.InstancedMesh(dropGeometry, splashMaterial, 12)
  droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  droplets.frustumCulled = false
  group.add(droplets)
  const point = new THREE.Vector3(), tangent = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3()
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), size = new THREE.Vector3()
  const s = { group, body, rings, droplets, from, to, layer, frozen, run, flight: 0, age: layer === 'live' && !frozen ? 0 : null, stopped: null, release: false,
    start() { s.age = s.frozen ? null : 0; s.stopped = null; head.value = s.frozen ? 2 : 0; tail.value = -1 },
    stop() { s.stopped ??= s.age },
    remove() { s.stop(); s.release = true },
    dispose() {
      group.removeFromParent(); g.dispose(); m.dispose(); droplets.dispose(); splashMaterial.dispose()
      for (const ring of rings) ring.material.dispose()
      streams.splice(streams.indexOf(s), 1)
    },
    update(dt) {
      const live = running(s)
      if (live) run.value += dt
      // Scale gravity with the authored nozzle size: similar pours retain their timing at every scale.
      const gravity = 9.81 * radius / 0.007, rise = Math.sqrt(2 * gravity * height)
      const duration = (rise + Math.sqrt(rise * rise + 2 * gravity * Math.max(0.00001, from.y - to.y))) / gravity
      s.flight = duration
      if (s.age === null) s.age = duration
      if (live) {
        s.age += dt
        head.value = s.age / duration
        tail.value = s.stopped === null ? -1 : (s.age - s.stopped) / duration
      }
      for (let i = 0; i <= segments; i++) {
        const t = i / segments, seconds = t * duration
        point.lerpVectors(from, to, t)
        point.y = from.y + rise * seconds - gravity * seconds * seconds / 2
        tangent.copy(to).sub(from); tangent.y = (rise - gravity * seconds) * duration; tangent.normalize()
        n.set(0, 0, 1)
        if (Math.abs(tangent.z) > 0.9) n.set(1, 0, 0)
        b.crossVectors(tangent, n).normalize(); n.crossVectors(b, tangent)
        const velocity = Math.sqrt((rise - gravity * seconds) ** 2 + ((to.x - from.x) ** 2 + (to.z - from.z) ** 2) / duration ** 2)
        const r = radius / Math.sqrt(1 + velocity / Math.sqrt(gravity * radius) * 0.25)
        const terminal = THREE.MathUtils.smoothstep(t, 0.72, 1)
        const bead = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 95 - run.value * 26)) ** 0.55
        const pulse = (1 + 0.13 * Math.sin(t * 40 - run.value * 18)) * (1 - terminal + terminal * bead)
        for (let j = 0; j <= sides; j++) {
          const a = j / sides * TAU, k = (i * (sides + 1) + j) * 3
          positions[k] = point.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * r * pulse
          positions[k + 1] = point.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * r * pulse
          positions[k + 2] = point.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * r * pulse
        }
      }
      g.attributes.position.needsUpdate = true
      g.computeVertexNormals(); g.computeBoundingSphere()
      const hitting = head.value >= 1 && tail.value < 1
      for (const ring of rings) {
        const k = fract1(run.value * 1.8 + ring.userData.phase)
        ring.visible = hitting
        ring.position.copy(to); ring.position.y += radius * 0.12
        ring.scale.setScalar(radius * (2 + k * 12))
        ring.userData.fade.value = (1 - k) ** 2 * 0.65
      }
      droplets.visible = hitting
      for (let i = 0; i < 12; i++) {
        const k = fract1(run.value * 2 + i / 12), a = i * 2.39996
        point.copy(to); point.x += Math.cos(a) * radius * 9 * k; point.z += Math.sin(a) * radius * 9 * k
        point.y += radius * (0.3 + 15 * k * (1 - k))
        size.set(radius * 0.3, radius * (0.45 + 0.4 * Math.abs(1 - 2 * k)), radius * 0.3).multiplyScalar(1 - k * 0.7)
        droplets.setMatrixAt(i, matrix.compose(point, rotation, size))
      }
      droplets.instanceMatrix.needsUpdate = true
      if (s.release && tail.value > 1.1) s.dispose()
    } }
  streams.push(s); s.update(0)
  return s
}

// Normal-only flowing ripples: bounded discs stay inside the vessel, with no geometric crest claim.
export function surface(parent, centre, radius, top, { colour = TEA, fill = 1, layer = 'live', hot = colour !== SYRUP, frozen = false, flowDirection = new THREE.Vector2(1, 0.35), flowSpeed = 0.18 } = {}) {
  const run = uniform(0), field = flowNormal(run, uv().mul(1.7), uniform(flowDirection), flowSpeed)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2), material(colour, float(1), field, radius * 0.3))
  parent.add(disc)
  // Soft wisps reuse one pooled mesh. Their age and advection stop with the liquid clock.
  const steamMaterial = new THREE.MeshBasicNodeMaterial({ color: 0xfff5e8, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  const soft = float(1).sub(smoothstep(0.1, 0.5, uv().sub(0.5).length()))
  steamMaterial.opacityNode = soft.mul(0.085)
  const steamGeometry = new THREE.SphereGeometry(1, 10, 8)
  const steam = new THREE.InstancedMesh(steamGeometry, steamMaterial, 9)
  steam.frustumCulled = false
  parent.add(steam)
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), p = new THREE.Vector3(), size = new THREE.Vector3()
  const s = { disc, steam, layer, frozen, run, fill,
    set(f) { s.fill = THREE.MathUtils.clamp(f, 0, 1); disc.position.copy(centre).setY(centre.y + (top - centre.y) * s.fill); disc.visible = s.fill > 0 },
    remove() { disc.removeFromParent(); steam.removeFromParent(); disc.geometry.dispose(); disc.material.dispose(); steam.dispose(); steamGeometry.dispose(); steamMaterial.dispose(); surfaces.splice(surfaces.indexOf(s), 1) },
    update(dt) {
      if (running(s)) run.value += dt
      steam.visible = hot && s.fill > 0 && running(s)
      for (let i = 0; i < 9; i++) {
        const age = fract1(run.value * 0.28 + i / 9), angle = i * 2.39996
        p.copy(disc.position)
        p.x += radius * (Math.cos(angle) * 0.45 + Math.sin(age * 5 + i) * age * 0.6)
        p.z += radius * Math.sin(angle + age) * 0.45
        p.y += radius * (0.15 + age * 3.4)
        const envelope = Math.sin(age * Math.PI)
        size.set(1, 1.8, 1).multiplyScalar(radius * (0.16 + age * 0.38) * envelope)
        steam.setMatrixAt(i, matrix.compose(p, rotation, size))
      }
      steam.instanceMatrix.needsUpdate = true
    } }
  surfaces.push(s); s.set(fill); s.update(0)
  return s
}

// A round lip in parent's coordinates, with a narrowing, streaked falling curtain.
export function sheet(centre, radius, top, bottom, { colour = SYRUP, layer = 'live', parent = scene, frozen = false } = {}) {
  const run = uniform(0), amount = uniform(1)
  const field = flowNormal(run, vec2(uv().x.mul(5), uv().y.mul(0.8)), vec2(0, -1), 1.4)
  const streak = texture(normals, vec2(uv().x.mul(4), uv().y.mul(0.3).add(run.mul(0.65)))).r
  const mask = smoothstep(0.39, 0.54, streak).mul(amount)
  const m = material(colour, mask, field, radius * 0.015)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, top - bottom, 128, 1, true), m)
  mesh.position.copy(centre).setY((top + bottom) / 2)
  parent.add(mesh)
  const rings = [0, 0.5].map(phase => {
    const fade = uniform(0), ring = new THREE.Mesh(ringGeometry, material(colour, fade))
    ring.position.copy(centre).setY(bottom + radius * 0.002)
    parent.add(ring)
    return { ring, fade, phase }
  })
  const splashMaterial = material(colour)
  const drops = new THREE.InstancedMesh(dropGeometry, splashMaterial, 32)
  drops.frustumCulled = false
  parent.add(drops)
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), p = new THREE.Vector3(), size = new THREE.Vector3()
  const s = { mesh, layer, frozen, run, set: value => { amount.value = value },
    update(dt) {
      if (running(s)) run.value += dt
      for (const { ring, fade, phase } of rings) {
        const age = fract1(run.value * 1.4 + phase)
        ring.scale.setScalar(radius * (1.15 + age * 0.35))
        fade.value = amount.value * (1 - age) * 0.4
      }
      drops.visible = amount.value > 0
      for (let i = 0; i < 32; i++) {
        const age = fract1(run.value * 2.1 + i / 32), angle = i * 2.39996
        const r = radius * (1.1 + age * 0.35)
        p.copy(centre).setY(bottom + radius * 0.32 * age * (1 - age))
        p.x += Math.cos(angle) * r; p.z += Math.sin(angle) * r
        size.set(1, 1.6, 1).multiplyScalar(radius * 0.012 * amount.value * (1 - age * 0.6))
        drops.setMatrixAt(i, matrix.compose(p, rotation, size))
      }
      drops.instanceMatrix.needsUpdate = true
    },
    remove() {
      mesh.removeFromParent(); mesh.geometry.dispose(); m.dispose()
      for (const { ring } of rings) { ring.removeFromParent(); ring.material.dispose() }
      drops.removeFromParent(); drops.dispose(); splashMaterial.dispose()
      sheets.splice(sheets.indexOf(s), 1)
    } }
  sheets.push(s)
  s.update(0)
  return s
}

// Story effects use exactly the same local-frame pieces as the lab and live pours.
let pools = [], hanging, drips, D
const dripMatrix = new THREE.Matrix4(), dripRotation = new THREE.Quaternion(), dripSize = new THREE.Vector3(0.022, 0.03, 0.022)
function placeDrips() {
  drips.forEach((p, i) => hanging.setMatrixAt(i, dripMatrix.compose(p, dripRotation, dripSize)))
  hanging.instanceMatrix.needsUpdate = true
}
if (!new URLSearchParams(location.search).has('liquid')) {
  for (const a of effects.teaArcs) stream(new THREE.Vector3(...a.from), new THREE.Vector3(...a.to), { height: a.height, radius: 0.011, layer: 'tea' })
  const fountain = things.fountain
  const at = ([r, y, a]) => new THREE.Vector3(Math.sin(a * Math.PI / 180) * r, y, Math.cos(a * Math.PI / 180) * r)
  for (const s of syrup.streams) stream(at(s.from), at(s.to), { height: s.height, radius: 0.02, colour: SYRUP, layer: 'syrup', parent: fountain })
  for (const [radius, top, bottom] of syrup.sheets) sheet(new THREE.Vector3(), radius, top, bottom, { parent: fountain, layer: 'syrup' })
  pools = syrup.pools.map(([radius, low, high]) => surface(fountain, new THREE.Vector3(0, low, 0), radius, high, { colour: SYRUP, fill: 0.1, layer: 'syrup' }))
  D = syrup.drops
  hanging = new THREE.InstancedMesh(dropGeometry, material(SYRUP), D.count)
  drips = Array.from({ length: D.count }, (_, i) => new THREE.Vector3(...D.center.map((c, axis) => c + (fract1(Math.sin(i * 71.7 + axis * 39.1) * 43758.5453) - 0.5) * D.size[axis])))
  placeDrips(); scene.add(hanging)
}
let syrupTime = 0
export function updateLiquids(dt) {
  if (awake.syrup && hanging) {
    syrupTime += dt
    for (const p of pools) p.set(Math.min(1, 0.1 + syrupTime / 8))
    for (const p of drips) {
      p.y -= dt * 0.6
      if (p.y < D.center[1] - D.size[1] / 2) p.y += D.size[1]
    }
    placeDrips()
  }
  for (let i = streams.length - 1; i >= 0; i--) streams[i].update(dt)
  for (const s of surfaces) s.update(dt)
  for (const s of sheets) s.update(dt)
}
