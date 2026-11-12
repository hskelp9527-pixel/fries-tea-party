import * as THREE from 'three/webgpu'
import { uniform, uv, sin, cos, fract, smoothstep, mix, pow, dot, float, vec2, vec3, texture, normalMap, positionViewDirection, fwidth, attribute, Fn, cross, varying, transformNormalToView, faceDirection } from 'three/tsl'
import { scene, camera } from './scene.js'
import { awake, things } from './garden.js'
import { effects, syrup } from './layout.js'

export const TEA = new THREE.Color(0.12, 0.028, 0.003), SYRUP = new THREE.Color(0.55, 0.19, 0.018)
const TAU = Math.PI * 2, fract1 = x => x - Math.floor(x)
const streams = [], surfaces = [], sheets = []
export const liquidCounts=()=>({streams:streams.length,surfaces:surfaces.length,sheets:sheets.length})
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
    clearcoat: 0.65, clearcoatRoughness: 0.12, transmission: 0, thickness,
    attenuationColor: colour, attenuationDistance: thickness * 5, ior: 1.333,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, alphaTest: 0.015 })
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
  const source = uniform(from), destination = uniform(to), flightTime = uniform(1)
  const gravity = 9.81 * radius / 0.007, rise = Math.sqrt(2 * gravity * height)
  const gpuGravity=uniform(gravity),gpuRise=uniform(rise),gpuRadius=uniform(radius),gpuSpeed=uniform(Math.sqrt(gravity*radius))
  const seconds = along.mul(flightTime), delta = destination.sub(source)
  const tangent = vec3(delta.x, gpuRise.sub(seconds.mul(gpuGravity)).mul(flightTime), delta.z).normalize()
  const reference = tangent.z.abs().greaterThan(0.9).select(vec3(1, 0, 0), vec3(0, 0, 1))
  const binormal = cross(tangent, reference).normalize(), normal = cross(binormal, tangent)
  const angle = uv().y.mul(TAU), radial = normal.mul(cos(angle)).add(binormal.mul(sin(angle)))
  const speed = gpuRise.sub(seconds.mul(gpuGravity)).pow(2).add(delta.xz.lengthSq().div(flightTime.pow(2))).sqrt()
  const width = gpuRadius.div(speed.div(gpuSpeed).mul(0.25).add(1).sqrt())
  const terminal = smoothstep(0.72, 1, along)
  const bead = sin(along.mul(95).sub(run.mul(26))).mul(0.5).add(0.5).pow(0.55).mul(0.75).add(0.25)
  const pulse = sin(along.mul(40).sub(run.mul(18))).mul(0.13).add(1).mul(mix(1, bead, terminal))
  const centreLine = mix(source, destination, along)
  m.positionNode = vec3(centreLine.x, source.y.add(seconds.mul(gpuRise)).sub(seconds.pow(2).mul(gpuGravity).mul(.5)), centreLine.z).add(radial.mul(width).mul(pulse))
  m.normalNode = transformNormalToView(varying(radial)).mul(faceDirection).normalize()
  m.opacityNode = mix(0.67, 0.96, pow(float(1).sub(dot(m.normalNode, positionViewDirection).abs().saturate()), 5)).mul(envelope).mul(breakup)
  const g = new THREE.BufferGeometry(), segments = 64, sides = 10
  const positions = new Float32Array((segments + 1) * (sides + 1) * 3), uvs = [], indices = []
  for (let i = 0; i <= segments; i++) for (let j = 0; j <= sides; j++) {
    uvs.push(i / segments, j / sides)
    if (i < segments && j < sides) {
      const a = i * (sides + 1) + j, b = a + sides + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(positions.length).map((_, i) => i % 3 === 2 ? 1 : 0), 3))
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
  const point = new THREE.Vector3()
  g.boundingSphere = new THREE.Sphere()
  const previousFrom = new THREE.Vector3(), previousTo = new THREE.Vector3()
  let initialized = false, previousClock = -1
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), size = new THREE.Vector3()
  const s = { group, body, rings, droplets, from, to, layer, frozen, run, flight: 0, age: layer === 'live' && !frozen ? 0 : null, stopped: null, release: false,
    start() { initialized = false; s.age = s.frozen ? null : 0; s.stopped = null; head.value = s.frozen ? 2 : 0; tail.value = -1 },
    stop() { s.stopped ??= s.age },
    remove() { s.stop(); s.release = true },
    dispose() {
      group.removeFromParent(); g.dispose(); m.dispose(); droplets.dispose(); splashMaterial.dispose()
      for (const ring of rings) ring.material.dispose()
      streams.splice(streams.indexOf(s), 1)
    },
    update(dt) {
      const live = running(s)
      if (!live && initialized && previousClock === run.value && previousFrom.equals(from) && previousTo.equals(to)) return
      if (live) run.value += dt
      // Scale gravity with the authored nozzle size: similar pours retain their timing at every scale.
      const duration = (rise + Math.sqrt(rise * rise + 2 * gravity * Math.max(0.00001, from.y - to.y))) / gravity
      s.flight = duration
      flightTime.value = duration
      g.boundingSphere.center.lerpVectors(from, to, 0.5)
      g.boundingSphere.radius = from.distanceTo(to) / 2 + height + radius * 10
      if (s.age === null) s.age = duration
      if (live) {
        s.age += dt
        head.value = s.age / duration
        tail.value = s.stopped === null ? -1 : (s.age - s.stopped) / duration
      }
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
      previousFrom.copy(from); previousTo.copy(to); previousClock = run.value; initialized = true
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
  surfaceMaterial.transmission = 0
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
  const s = { disc, steam, layer, frozen, run, fill, removed:false,
    set(f) {
      s.fill = THREE.MathUtils.clamp(f, 0, 1)
      const floor = profile ? profile[0][0] : centre.y, height = THREE.MathUtils.lerp(floor, top, s.fill)
      disc.position.copy(centre).setY(height)
      disc.scale.setScalar(profile ? innerRadius(profile, height) / radius : 1)
      disc.visible = s.fill > 0
    },
    remove() {
      if(s.removed)return
      s.removed=true
      disc.removeFromParent();steam.removeFromParent();disc.geometry.dispose();disc.material.dispose();steam.dispose();steamGeometry.dispose();steamMaterial.dispose()
      const index=surfaces.indexOf(s);if(index>=0)surfaces.splice(index,1)
    },
    update(dt) {
      if (running(s)) run.value += dt
      steam.visible = hot && s.fill > 0 && running(s)
      if (!steam.visible) return
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
  // Local polar UVs own the curtain, foam and ripples. Only their clock changes;
  // geometry, opacity and normals all derive from this same bounded field on the GPU.
  const fall = top - bottom, landing = radius * 1.05 + spread
  const ringPhase = attribute('liquidPhase', 'float')
  const ringAge = fract(run.mul(0.9).add(ringPhase))
  const ringInner = kind.equal(1).select(landing - radius * 0.055, ringAge.mul(rippleReach).add(landing))
  const ringWidth = kind.equal(1).select(radius * 0.12, radius * 0.014)
  const ringLift = kind.equal(1).select(radius * 0.055, radius * 0.005)
  const ringOpacity = kind.equal(1).select(0.88, float(1).sub(ringAge).pow(2).mul(0.45))
  const shape = Fn(([coord]) => {
    const angle = coord.x.mul(TAU), v = coord.y
    const flight = v.sub(0.08).div(0.92).max(0)
    const lobe = sin(angle.mul(11).add(sin(angle.mul(5).add(flight.mul(8)).sub(run.mul(2))).mul(0.45)))
    const wave = sin(angle.mul(23).sub(flight.mul(9)).add(run.mul(3)))
    const wobble = lobe.mul(0.028).add(wave.mul(0.018)).mul(radius)
    const roll = v.div(0.08).min(1).mul(Math.PI / 2)
    const r = sin(roll).mul(0.09).add(0.96).mul(radius).add(flight.mul(spread)).add(wobble.mul(flight.add(0.65)))
    const height = cos(roll).mul(radius * 0.025).add(top).sub(flight.pow(2).mul(fall))
      .add(sin(angle.mul(17).add(flight.mul(24)).sub(run.mul(9))).mul(radius * 0.022).mul(flight.add(0.2)))
    const curtain = vec3(cos(angle).mul(r).add(flight.mul(drift.x)), height, sin(angle).mul(r).add(flight.mul(drift.y)))
    const churn = sin(angle.mul(31).sub(run.mul(11))).mul(sin(angle.mul(19).add(run.mul(7))))
    const rr = ringInner.add(v.mul(ringWidth)).add(churn.mul(radius * 0.006))
    const ring = vec3(cos(angle).mul(rr).add(drift.x), sin(v.mul(Math.PI)).mul(ringLift).mul(churn.mul(0.35).add(1)).add(bottom + radius * 0.008), sin(angle).mul(rr).add(drift.y))
    return kind.equal(0).select(curtain, ring)
  })
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
  m.ior=1.45;m.attenuationDistance=radius*.18;m.clearcoat=.22;m.envMapIntensity=.7
  const position = shape(uv())
  m.positionNode = position
  // Exact derivatives of the authored polar field, evaluated once per vertex.
  const analyticNormal = Fn(([coord]) => {
    const a = coord.x.mul(TAU), v = coord.y, f = v.sub(0.08).div(0.92).max(0)
    const fv = v.greaterThanEqual(0.08).select(1 / 0.92, 0)
    const roll = v.div(0.08).min(1).mul(Math.PI / 2), rv = v.lessThan(0.08).select(Math.PI / 0.16, 0)
    const warp = a.mul(5).add(f.mul(8)).sub(run.mul(2)), lobe = a.mul(11).add(sin(warp).mul(0.45))
    const wave = a.mul(23).sub(f.mul(9)).add(run.mul(3)), crest = a.mul(17).add(f.mul(24)).sub(run.mul(9))
    const wobble = sin(lobe).mul(0.028).add(sin(wave).mul(0.018)).mul(radius)
    const wa = cos(lobe).mul(cos(warp).mul(2.25).add(11)).mul(0.028).add(cos(wave).mul(0.414)).mul(radius)
    const wf = cos(lobe).mul(cos(warp).mul(3.6)).mul(0.028).sub(cos(wave).mul(0.162)).mul(radius)
    const r = sin(roll).mul(0.09).add(0.96).mul(radius).add(f.mul(spread)).add(wobble.mul(f.add(0.65)))
    const ra = wa.mul(f.add(0.65))
    const rV = cos(roll).mul(radius * 0.09).mul(rv).add(wf.mul(f.add(0.65)).add(wobble).add(spread).mul(fv))
    const ya = cos(crest).mul(radius * 0.022 * 17).mul(f.add(0.2))
    const yv = sin(roll).mul(-radius * 0.025).mul(rv).sub(f.mul(2 * fall).mul(fv))
      .add(cos(crest).mul(24).mul(f.add(0.2)).add(sin(crest)).mul(radius * 0.022).mul(fv))
    const da = vec3(cos(a).mul(ra).sub(sin(a).mul(r)), ya, sin(a).mul(ra).add(cos(a).mul(r)))
    const dv = vec3(cos(a).mul(rV).add(fv.mul(drift.x)), yv, sin(a).mul(rV).add(fv.mul(drift.y)))
    const ca = a.mul(31).sub(run.mul(11)), cb = a.mul(19).add(run.mul(7))
    const churn = sin(ca).mul(sin(cb)), derivative = cos(ca).mul(sin(cb)).mul(31).add(sin(ca).mul(cos(cb)).mul(19))
    const rr = ringInner.add(v.mul(ringWidth)).add(churn.mul(radius * 0.006)), rra = derivative.mul(radius * 0.006)
    const rha = sin(v.mul(Math.PI)).mul(ringLift).mul(derivative).mul(0.35)
    const rhv = cos(v.mul(Math.PI)).mul(Math.PI).mul(ringLift).mul(churn.mul(0.35).add(1))
    const ringA = vec3(cos(a).mul(rra).sub(sin(a).mul(rr)), rha, sin(a).mul(rra).add(cos(a).mul(rr)))
    const ringV = vec3(cos(a).mul(ringWidth), rhv, sin(a).mul(ringWidth))
    return kind.equal(0).select(cross(dv, da), cross(ringV, ringA)).normalize()
  })
  m.normalNode = transformNormalToView(varying(analyticNormal(uv()))).mul(faceDirection).normalize()
  // Blend the thin amber curtain as well as opening holes. Treating covered
  // pixels as opaque made it read as cream glaze. Environment highlights and
  // alpha blending avoid an extra full-resolution transmission render target.
  m.transmission = 0; m.transparent = true; m.forceSinglePass = true; m.depthWrite = false; m.alphaToCoverage = false
  const churn = sin(a.mul(31).sub(run.mul(11))).mul(sin(a.mul(19).add(run.mul(7))))
  const ringFade = sin(t.mul(Math.PI)).mul(ringOpacity).mul(churn.mul(0.25).add(0.75))
  m.opacityNode = kind.equal(0).select(coverage.mul(0.64), ringFade).mul(amount)
  m.alphaTest = 0.04
  m.colorNode = liquidDebug.equal(1).select(vec3(coverage, foam, t), liquidDebug.equal(2).select(m.normalNode.mul(0.5).add(0.5), mix(uniform(colour).mul(.55), vec3(0.75, 0.41, 0.12), foam.mul(.12))))
  m.roughnessNode = mix(0.07, 0.2, foam.mul(.2))
  const g = new THREE.BufferGeometry(), segments = 160, rows = 40
  const positions = [], uvs = [], parts = [], phases = [], indices = []
  function patch(part, rowCount, phase = 0) {
    const start = positions.length / 3
    for (let y = 0; y <= rowCount; y++) for (let x = 0; x <= segments; x++) {
      positions.push(0, 0, 0); uvs.push(x / segments, y / rowCount); parts.push(part); phases.push(phase)
      if (y < rowCount && x < segments) {
        const k = start + y * (segments + 1) + x, next = k + segments + 1
        indices.push(k, next, k + 1, next, next + 1, k + 1)
      }
    }
    return start
  }
  patch(0, rows); patch(1, 6)
  for (let i = 0; i < 3; i++) patch(2, 2, i / 3)
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(positions.map((_, i) => i % 3 === 1 ? 1 : 0), 3))
  g.setAttribute('liquidPart', new THREE.Float32BufferAttribute(parts, 1)); g.setAttribute('liquidPhase', new THREE.Float32BufferAttribute(phases, 1)); g.setIndex(indices)
  const extent = landing + rippleReach + radius * 0.15
  g.boundingBox = new THREE.Box3(new THREE.Vector3(-extent + Math.min(0, drift.x), bottom - radius * 0.1, -extent + Math.min(0, drift.y)), new THREE.Vector3(extent + Math.max(0, drift.x), top + radius * 0.1, extent + Math.max(0, drift.y)))
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere())
  const mesh = new THREE.Mesh(g, m)
  mesh.position.copy(centre); parent.add(mesh)
  const splashMaterial = material(colour)
  splashMaterial.transmission = 0; splashMaterial.forceSinglePass = true
  splashMaterial.colorNode = mix(uniform(colour), vec3(0.85, 0.78, 0.59), uv().y.mul(0.5))
  const drops = new THREE.InstancedMesh(dropGeometry, splashMaterial, 160)
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drops.frustumCulled = false; parent.add(drops)
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), point = new THREE.Vector3(), size = new THREE.Vector3()
  const bounds = new THREE.Sphere(), frustum = new THREE.Frustum(), projection = new THREE.Matrix4()
  let initialized = false, lastAmount, lastClock
  const s = { mesh, drops, layer, frozen, run, set: value => { amount.value = value },
    update(dt, viewCamera = camera) {
      mesh.visible = drops.visible = amount.value > 0
      if (initialized && ((!running(s) && lastAmount === amount.value && lastClock === run.value) || !mesh.visible)) return
      mesh.updateWorldMatrix(true, false)
      bounds.copy(g.boundingSphere).applyMatrix4(mesh.matrixWorld)
      projection.multiplyMatrices(viewCamera.projectionMatrix, viewCamera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(projection, viewCamera.coordinateSystem)
      if (initialized && (viewCamera.position.distanceTo(bounds.center) > 25 + bounds.radius || !frustum.intersectsSphere(bounds))) return
      if (running(s)) run.value += dt
      const clock = run.value
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
      initialized = true
      lastAmount = amount.value
      lastClock = run.value
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
export function updateLiquids(dt, viewCamera = camera) {
  if (awake.syrup && hanging) {
    for (const p of drips) {
      p.y -= dt * 0.6
      if (p.y < D.center[1] - D.size[1] / 2) p.y += D.size[1]
    }
    placeDrips()
  }
  for (let i = streams.length - 1; i >= 0; i--) streams[i].update(dt)
  for (const s of surfaces) s.update(dt)
  for (const s of sheets) s.update(dt, viewCamera)
}
