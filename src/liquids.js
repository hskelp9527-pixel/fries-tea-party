import * as THREE from 'three/webgpu'
import { uniform, uv, sin, fract, smoothstep, mix, pow, dot, float, vec2, vec3, texture, normalMap, positionViewDirection, fwidth, attribute } from 'three/tsl'
import { scene } from './scene.js'
import { awake, things } from './garden.js'
import { effects, syrup } from './layout.js'

export const TEA = new THREE.Color(0.12, 0.028, 0.003), SYRUP = new THREE.Color(0.55, 0.19, 0.018)
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
  return mix(a.rgb, b.rgb, phase.sub(0.5).abs().mul(2))
}
function material(colour, mask = float(1), field = vec3(0.5, 0.5, 1), thickness = 0.01) {
  const m = new THREE.MeshPhysicalNodeMaterial({ color: colour, roughness: 0.09, envMapIntensity: 1.3,
    clearcoat: 0.65, clearcoatRoughness: 0.12, transmission: 0.18, thickness,
    attenuationColor: colour, attenuationDistance: thickness * 5, ior: 1.333,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.015 })
  m.normalNode = normalMap(field, vec2(0.22))
  const fresnel = pow(float(1).sub(dot(m.normalNode, positionViewDirection).abs().saturate()), 5)
  m.opacityNode = mix(0.67, 0.96, fresnel).mul(mask)
  m.colorNode = liquidDebug.equal(1).select(field.rgb, liquidDebug.equal(2).select(m.normalNode.mul(0.5).add(0.5), uniform(colour)))
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
        ring.scale.setScalar(radius * (1.5 + k * 6))
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

// Measured inner porcelain rings, shared by teacup.glb and both coloured game cups.
// Heights are in the cup's frame; the radius uses each scalloped ring's narrowest wall.
export const CUP_PROFILE = [[0.012, 0.0186], [0.018, 0.0275], [0.03, 0.0373],
  [0.045, 0.0421], [0.06, 0.0439], [0.0685, 0.0464]]
function innerRadius(profile, height) {
  let i = 1
  while (i < profile.length - 1 && height > profile[i][0]) i++
  const [low, r0] = profile[i - 1], [high, r1] = profile[i]
  return THREE.MathUtils.lerp(r0, r1, THREE.MathUtils.clamp((height - low) / (high - low), 0, 1))
}

// Normal-only flowing ripples: bounded discs stay inside the vessel, with no geometric crest claim.
export function surface(parent, centre, radius, top, { colour = TEA, fill = 1, layer = 'live', hot = colour !== SYRUP, frozen = false, flowDirection = new THREE.Vector2(1, 0.35), flowSpeed = 0.18, profile } = {}) {
  const run = uniform(0), flow = flowNormal(run, uv().mul(0.6), uniform(flowDirection), flowSpeed)
  const radial = uv().sub(0.5), distance = radial.length().max(0.001)
  const wave = sin(distance.mul(48).sub(run.mul(4))).mul(0.055)
  const field = vec3(flow.xy.add(radial.div(distance).mul(wave)), flow.z)
  const surfaceMaterial = material(colour, float(1), field, radius * 0.3)
  surfaceMaterial.transmission = 0.06
  surfaceMaterial.clearcoat = 0.35
  surfaceMaterial.opacityNode = float(0.97)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2), surfaceMaterial)
  parent.add(disc)
  // Soft wisps reuse one pooled mesh. Their age and advection stop with the liquid clock.
  const steamMaterial = new THREE.MeshBasicNodeMaterial({ color: 0xfff5e8, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  const soft = float(1).sub(smoothstep(0.1, 0.5, uv().sub(0.5).length()))
  steamMaterial.opacityNode = soft.mul(0.13)
  const steamGeometry = new THREE.SphereGeometry(1, 10, 8)
  const steam = new THREE.InstancedMesh(steamGeometry, steamMaterial, 9)
  steam.frustumCulled = false
  parent.add(steam)
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), p = new THREE.Vector3(), size = new THREE.Vector3()
  const s = { disc, steam, layer, frozen, run, fill,
    set(f) {
      s.fill = THREE.MathUtils.clamp(f, 0, 1)
      const floor = profile ? profile[0][0] : centre.y, height = THREE.MathUtils.lerp(floor, top, s.fill)
      disc.position.copy(centre).setY(height)
      disc.scale.setScalar(profile ? innerRadius(profile, height) / radius : 1)
      disc.visible = s.fill > 0
    },
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
        size.set(0.55, 2.8, 0.55).multiplyScalar(radius * (0.12 + age * 0.2) * envelope)
        steam.setMatrixAt(i, matrix.compose(p, rotation, size))
      }
      steam.instanceMatrix.needsUpdate = true
    } }
  surfaces.push(s); s.set(fill); s.update(0)
  return s
}

// One lit mesh owns the rolled lip, ballistic curtain, impact foam and expanding rings.
// A second pooled draw owns detached ropes, splash droplets and fine spray.
export function sheet(centre, radius, top, bottom, { colour = SYRUP, layer = 'live', parent = scene, frozen = false, spread = radius * 0.42, drift = new THREE.Vector2(), rippleReach = radius * 0.24 } = {}) {
  const run = uniform(0), amount = uniform(1), kind = attribute('liquidPart', 'float')
  const a = uv().x.mul(TAU), t = uv().y
  const warp = sin(a.mul(5).add(t.mul(8)).sub(run.mul(2))).mul(0.45)
  const lobes = sin(a.mul(11).add(warp)).mul(0.22)
    .add(sin(a.mul(23).sub(t.mul(9)).add(run.mul(3))).mul(0.14))
    .add(sin(a.mul(37).add(t.mul(21)).sub(run.mul(9))).mul(0.08)).add(0.53)
  const edge = fwidth(lobes).add(0.035)
  const cutoff = pow(t.max(0), 1.15).mul(0.86).sub(0.05)
  const coverage = smoothstep(cutoff.sub(edge), cutoff.add(edge), lobes)
  const crest = float(1).sub(smoothstep(0.01, 0.3, t)).mul(lobes.mul(0.7).add(0.25))
  const foam = kind.equal(0).select(crest, kind.equal(1).select(float(0.65).add(lobes.mul(0.3)), float(0.12)))
  const field = flowNormal(run, vec2(uv().x.mul(4), t.mul(0.7)), vec2(0, -1), 1.1)
  const m = material(colour, float(1), field, radius * 0.035)
  // Covered fragments are dense liquid; holes supply the lower curtain's transparency.
  m.transmission = 0; m.transparent = false; m.forceSinglePass = true; m.depthWrite = true; m.alphaToCoverage = true
  m.opacityNode = kind.equal(0).select(coverage.mul(0.96), attribute('liquidFade', 'float')).mul(amount)
  m.alphaTest = 0.2
  m.colorNode = liquidDebug.equal(1).select(vec3(coverage, foam, t), liquidDebug.equal(2).select(m.normalNode.mul(0.5).add(0.5), mix(uniform(colour), vec3(0.88, 0.79, 0.59), foam)))
  m.roughnessNode = mix(0.09, 0.48, foam)
  const g = new THREE.BufferGeometry(), segments = 160, rows = 40
  const positions = [], uvs = [], parts = [], fades = [], indices = []
  function patch(part, rowCount) {
    const start = positions.length / 3
    for (let y = 0; y <= rowCount; y++) for (let x = 0; x <= segments; x++) {
      positions.push(0, 0, 0); uvs.push(x / segments, y / rowCount); parts.push(part); fades.push(1)
      if (y < rowCount && x < segments) {
        const k = start + y * (segments + 1) + x, next = k + segments + 1
        indices.push(k, next, k + 1, next, next + 1, k + 1)
      }
    }
    return start
  }
  const curtainStart = patch(0, rows)
  const impactStart = patch(1, 6)
  const rippleStarts = [patch(2, 2), patch(2, 2), patch(2, 2)]
  const p = new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  const fade = new THREE.Float32BufferAttribute(fades, 1).setUsage(THREE.DynamicDrawUsage)
  g.setAttribute('position', p); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('liquidPart', new THREE.Float32BufferAttribute(parts, 1)); g.setAttribute('liquidFade', fade); g.setIndex(indices)
  const mesh = new THREE.Mesh(g, m)
  mesh.position.copy(centre); mesh.frustumCulled = false; parent.add(mesh)
  const splashMaterial = material(colour)
  splashMaterial.transmission = 0; splashMaterial.forceSinglePass = true
  splashMaterial.colorNode = mix(uniform(colour), vec3(0.85, 0.78, 0.59), uv().y.mul(0.5))
  const drops = new THREE.InstancedMesh(dropGeometry, splashMaterial, 160)
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drops.frustumCulled = false; parent.add(drops)
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), point = new THREE.Vector3(), size = new THREE.Vector3()
  const fall = top - bottom, landing = radius * 1.05 + spread
  const s = { mesh, drops, layer, frozen, run, set: value => { amount.value = value },
    update(dt) {
      if (running(s)) run.value += dt
      const clock = run.value
      mesh.visible = drops.visible = amount.value > 0
      for (let y = 0; y <= rows; y++) {
        const v = y / rows, flight = Math.max(0, (v - 0.08) / 0.92)
        for (let x = 0; x <= segments; x++) {
          const angle = x / segments * TAU
          const lobe = Math.sin(angle * 11 + Math.sin(angle * 5 + flight * 8 - clock * 2) * 0.45)
          const wave = Math.sin(angle * 23 - flight * 9 + clock * 3)
          const wobble = (lobe * 0.028 + wave * 0.018) * radius
          const roll = Math.min(1, v / 0.08) * Math.PI / 2
          const r = radius * (0.96 + 0.09 * Math.sin(roll)) + spread * flight + wobble * (0.65 + flight)
          const height = top + radius * 0.025 * Math.cos(roll) - fall * flight * flight
            + radius * 0.022 * Math.sin(angle * 17 + flight * 24 - clock * 9) * (0.2 + flight)
          p.setXYZ(curtainStart + y * (segments + 1) + x, Math.cos(angle) * r + drift.x * flight, height, Math.sin(angle) * r + drift.y * flight)
        }
      }
      function ring(start, rowCount, inner, width, lift, opacity) {
        for (let y = 0; y <= rowCount; y++) for (let x = 0; x <= segments; x++) {
          const angle = x / segments * TAU, v = y / rowCount, k = start + y * (segments + 1) + x
          const churn = Math.sin(angle * 31 - clock * 11) * Math.sin(angle * 19 + clock * 7)
          const r = inner + v * width + radius * 0.006 * churn
          p.setXYZ(k, Math.cos(angle) * r + drift.x, bottom + radius * 0.008 + Math.sin(v * Math.PI) * lift * (1 + churn * 0.35), Math.sin(angle) * r + drift.y)
          fade.setX(k, Math.sin(v * Math.PI) * opacity * (0.75 + churn * 0.25))
        }
      }
      ring(impactStart, 6, landing - radius * 0.055, radius * 0.12, radius * 0.055, 0.88)
      rippleStarts.forEach((start, i) => {
        const age = fract1(clock * 0.9 + i / 3)
        ring(start, 2, landing + age * rippleReach, radius * 0.014, radius * 0.005, (1 - age) ** 2 * 0.45)
      })
      p.needsUpdate = fade.needsUpdate = true; g.computeVertexNormals()
      for (let i = 0; i < drops.count; i++) {
        const age = fract1(clock * (i < 48 ? 1.4 : 2.3) + i * 0.618034), angle = i * 2.39996
        let r, height, scale, travel = 1
        if (i < 48) {
          // Detached lower ropes continue the curtain's outward ballistic trajectory.
          const flight = 0.64 + age * 0.36
          travel = flight
          r = radius * 1.05 + spread * flight; height = top - fall * flight * flight
          scale = radius * 0.009 * Math.sin(age * Math.PI)
          size.set(scale, scale * 3.5, scale)
        } else {
          const fine = i >= 112, velocity = fine ? 0.26 : 0.18
          r = landing + Math.min(radius * velocity, rippleReach) * age
          height = bottom + radius * (fine ? 0.48 : 0.32) * age * (1 - age)
          scale = radius * (fine ? 0.0028 : 0.009) * (1 - age) ** 0.6
          size.set(scale, scale * (fine ? 1 : 1.8), scale)
        }
        point.set(centre.x + Math.cos(angle) * r + drift.x * travel, centre.y + height, centre.z + Math.sin(angle) * r + drift.y * travel)
        drops.setMatrixAt(i, matrix.compose(point, rotation, size.multiplyScalar(amount.value)))
      }
      drops.instanceMatrix.needsUpdate = true
    },
    remove() {
      mesh.removeFromParent(); g.dispose(); m.dispose()
      drops.removeFromParent(); drops.dispose(); splashMaterial.dispose()
      sheets.splice(sheets.indexOf(s), 1)
    } }
  sheets.push(s); s.update(0)
  return s
}

// Horizontal GLB sections: basin, lower bowl, middle bowl and upper cup.
// The reconstructed fountain has shallow inner floors and offset tier centres.
const fountainBowls = [
  { x: 0, z: 0, top: 0.49, lip: 0.52, radius: 1.24,
    profile: [[0.412, 0.5], [0.416, 1.04], [0.425, 1.207], [0.43, 1.225], [0.47, 1.218], [0.49, 1.218]] },
  { x: 0, z: 0.025, top: 0.975, lip: 0.98, radius: 0.99,
    profile: [[0.927, 0.45], [0.934, 0.803], [0.94, 0.8], [0.95, 0.883], [0.96, 0.89], [0.975, 0.899]] },
  { x: -0.17, z: 0.085, top: 1.643, lip: 1.65, radius: 0.55,
    profile: [[1.594, 0.15], [1.602, 0.471], [1.61, 0.474], [1.62, 0.478], [1.63, 0.482], [1.643, 0.49]] },
  { x: -0.176, z: 0.064, top: 2.052, lip: 2.06, radius: 0.355,
    profile: [[1.977, 0.08], [1.985, 0.298], [2, 0.302], [2.02, 0.311], [2.04, 0.318], [2.052, 0.322]] },
]

// Story effects use exactly the same local-frame pieces as the lab and live pours.
let hanging, drips, D
const dripMatrix = new THREE.Matrix4(), dripRotation = new THREE.Quaternion(), dripSize = new THREE.Vector3(0.022, 0.03, 0.022)
function placeDrips() {
  drips.forEach((p, i) => hanging.setMatrixAt(i, dripMatrix.compose(p, dripRotation, dripSize)))
  hanging.instanceMatrix.needsUpdate = true
}
if (!new URLSearchParams(location.search).has('liquid')) {
  for (const a of effects.teaArcs) stream(new THREE.Vector3(...a.from), new THREE.Vector3(...a.to), { height: a.height, radius: 0.011, layer: 'tea' })
  const fountain = things.fountain
  // Mouth centres picked on the actual GLB, rather than the old polar placeholders.
  const spouts = [
    { from: [0.005, 2.56, 0.055], to: [0.05, 2.052, 0.12] },
    { from: [0.62, 1.22, 0.14], to: [0.72, 0.975, 0.28] },
  ]
  for (const s of spouts) stream(new THREE.Vector3(...s.from), new THREE.Vector3(...s.to), { height: 0, radius: 0.014, colour: SYRUP, layer: 'syrup', parent: fountain })
  for (let i = 1; i < fountainBowls.length; i++) {
    const b = fountainBowls[i], below = fountainBowls[i - 1], spread = [0, 0.1, 0.14, 0.09][i]
    sheet(new THREE.Vector3(b.x, 0, b.z), b.radius, b.lip, below.top, { parent: fountain, layer: 'syrup', spread,
      drift: new THREE.Vector2(below.x - b.x, below.z - b.z), rippleReach: [0, 0.025, 0.13, 0.025][i] })
  }
  fountainBowls.forEach(b => surface(fountain, new THREE.Vector3(b.x, b.profile[0][0], b.z), b.radius, b.top, { colour: SYRUP, fill: 1, layer: 'syrup', profile: b.profile }))
  D = syrup.drops
  hanging = new THREE.InstancedMesh(dropGeometry, material(SYRUP), D.count)
  drips = Array.from({ length: D.count }, (_, i) => new THREE.Vector3(...D.center.map((c, axis) => c + (fract1(Math.sin(i * 71.7 + axis * 39.1) * 43758.5453) - 0.5) * D.size[axis])))
  placeDrips(); scene.add(hanging)
}
export function updateLiquids(dt) {
  if (awake.syrup && hanging) {
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
