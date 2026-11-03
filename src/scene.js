import * as THREE from 'three/webgpu'
import {
  pass, mrt, normalView, normalWorldGeometry, uniform, vec3, vec4, float, Fn, dot, pow, exp, screenUV,
  positionWorld, cameraPosition, cameraViewMatrix, positionViewDirection, materialEmissive, texture3D, renderOutput,
  output, context, fog, rtt, vec2, mix, smoothstep,
} from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { ao } from 'three/addons/tsl/display/GTAONode.js'
import { lut3D } from 'three/addons/tsl/display/Lut3DNode.js'
import { SUN, skyRadiance, paintedSky } from './sky.js'
export { SUN, air } from './sky.js'

const params = new URLSearchParams(location.search)
// ?post=off draws the scene straight to the screen with the renderer's own tone mapping: the no-post baseline.
// ?view=ao|bloom|haze shows one of the picture's controlling signals instead of the picture.
// ?view=grade-off skips the LUT; ?view=look-off skips grading, bloom, shafts and authored lens effects.
// ?view=dof shows near/focus/far as red/green/blue; ?view=shafts|shaft-mask isolates sun shafts.
// ?view=clouds shows cloud coverage on the sky; ?view=sky-off isolates the clear-air gradient.
const POST = params.get('post') !== 'off', VIEW = params.get('view')

// WebGPURenderer falls back to its WebGL 2 backend on its own; ?webgl forces that path for testing.
export const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: params.has('webgl') })
await renderer.init()
// The WebGL fallback gets fewer floating objects, petals and grass and a smaller shadow map.
export const webgpu = renderer.backend.isWebGPUBackend === true

renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
// The single exposure and tone map of the picture (the pipeline applies them once, before the grade).
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
document.body.prepend(renderer.domElement)

export const scene = new THREE.Scene()
export const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 600)
camera.rotation.order = 'YXZ'

const sunDirection = uniform(SUN)
scene.backgroundNode = VIEW === 'sky-off' ? skyRadiance(normalWorldGeometry) : paintedSky(normalWorldGeometry, VIEW === 'clouds')

// Haze: clear near, warm far, thicker low down. Its colour is the sky's along the line of sight, just above the
// horizon, so distant hills melt into the sky behind them, golden towards the sun.
const HAZE = { start: 22, density: 0.011, height: 24 }
const sightline = positionWorld.sub(cameraPosition)
const distance = sightline.length()
const along = sightline.div(distance)
const haze = float(1).sub(exp(distance.sub(HAZE.start).max(0).mul(HAZE.density)
  .mul(exp(positionWorld.y.max(0).div(-HAZE.height))).negate()))
scene.fogNode = VIEW === 'haze' ? vec4(vec3(haze), 1) : fog(skyRadiance(vec3(along.x, along.y.max(0).add(0.04), along.z).normalize()), haze)

// The painted distance already contains its lighting. A single inward-facing ring keeps it behind the
// garden's near ridges; the same aerial perspective as the terrain dissolves it into the horizon.
const backdrops = import.meta.glob('/art/textures/backdrop.png', { eager: true, query: '?url', import: 'default' })
const backdropUrl = backdrops['/art/textures/backdrop.png']
if (backdropUrl) {
  const map = new THREE.TextureLoader().load(backdropUrl)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  const backdrop = new THREE.Mesh(
    new THREE.CylinderGeometry(150, 150, 120, 128, 1, true),
    new THREE.MeshBasicNodeMaterial({ map, side: THREE.BackSide, transparent: true, depthWrite: false }),
  )
  backdrop.name = 'Painted distance'
  backdrop.position.set(0, 20, -4) // bottom -40 m; the transparent upper half leaves the sky untouched
  scene.add(backdrop)
}

// The sky lights everything from every direction (diffuse and reflections), rendered once into an environment map.
const pmrem = new THREE.PMREMGenerator(renderer)
const skyOnly = new THREE.Scene()
skyOnly.backgroundNode = skyRadiance(normalWorldGeometry)
scene.environment = pmrem.fromScene(skyOnly, 0.04).texture
scene.environmentIntensity = 0.85
scene.add(new THREE.HemisphereLight(0xcbdfff, 0xb8b697, 0.55))

// The sun: warm, low, with soft shadows. The shadow map covers 56 m round the point the camera looks at and moves
// in whole texels, so shadows never crawl as the camera moves.
export const sun = new THREE.DirectionalLight(0xffdfac, 3)
sun.castShadow = true
const SHADOW = { size: 56, map: webgpu ? 4096 : 2048 }
sun.shadow.autoUpdate = false
sun.shadow.needsUpdate = true
sun.shadow.mapSize.setScalar(SHADOW.map)
Object.assign(sun.shadow.camera, { left: -SHADOW.size / 2, right: SHADOW.size / 2, top: SHADOW.size / 2, bottom: -SHADOW.size / 2, near: 1, far: 160 })
sun.shadow.bias = -0.0003
sun.shadow.normalBias = 1.5 * SHADOW.size / SHADOW.map
sun.shadow.radius = 4
sun.shadow.camera.layers.enable(1) // Fries's layer: he casts a shadow even when first person hides him
scene.add(sun, sun.target)
// renderer.info has no native shadow-pass counter; record completed renders, including diagnostic views.
renderer.info.shadowMapRenders = 0
scene.onAfterRender = (activeRenderer, activeScene, activeCamera) => {
  if (activeCamera === sun.shadow.camera) activeRenderer.info.shadowMapRenders++
}

// A soft warm bounce from the lawn in front of the faces, so shadow sides stay readable against the low sun.
export const bounce = new THREE.DirectionalLight(0xffead4, 0.5)
bounce.position.set(0.3, 0.25, 1)
scene.add(bounce)

const texel = SHADOW.size / SHADOW.map
const right = new THREE.Vector3().crossVectors(THREE.Object3D.DEFAULT_UP, SUN).normalize(), upward = new THREE.Vector3().crossVectors(SUN, right)
const focus = new THREE.Vector3(), forward = new THREE.Vector3()
const projectedSun = new THREE.Vector3()
const shaftSun = uniform(new THREE.Vector2()), shaftVisibility = uniform(0), shaftMetric = uniform(new THREE.Vector2())
let shadowX, shadowY, shadowAge = 2
export function updateSun() {
  focus.copy(camera.getWorldDirection(forward)).multiplyScalar(14).add(camera.position).setY(0)
  const x = Math.round(focus.dot(right) / texel) * texel, y = Math.round(focus.dot(upward) / texel) * texel, z = focus.dot(SUN)
  // Commit the light transform only with its map. Refresh moving casters at least every second frame.
  if (x !== shadowX || y !== shadowY || ++shadowAge >= 2) {
    sun.target.position.copy(right).multiplyScalar(x).addScaledVector(upward, y).addScaledVector(SUN, z)
    sun.position.copy(sun.target.position).addScaledVector(SUN, 80)
    sun.shadow.needsUpdate = true
    shadowX = x
    shadowY = y
    shadowAge = 0
  }
  bounce.target.position.copy(sun.target.position)
  const facing = forward.dot(SUN)
  shaftVisibility.value = 0
  if (facing > 0) {
    projectedSun.copy(camera.position).addScaledVector(SUN, 300).project(camera)
    shaftSun.value.set(projectedSun.x * 0.5 + 0.5, 0.5 - projectedSun.y * 0.5)
    shaftVisibility.value = THREE.MathUtils.smoothstep(facing, 0.15, 0.55)
      * (1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(projectedSun.x), Math.abs(projectedSun.y)), 0.9, 1.5))
  }
  const tangent = Math.tan(camera.fov * Math.PI / 360)
  shaftMetric.value.set(camera.aspect * tangent, tangent)
  shaftMask.autoUpdate = shafts.autoUpdate = shaftVisibility.value > 0
}

// A thin gold rim where the low sun catches hair and shoulders from behind: strongest on edges seen against the
// light, on the side the sun is on. For the characters' materials.
const sunInView = cameraViewMatrix.mul(vec4(sunDirection, 0)).xyz
const edge = pow(float(1).sub(dot(normalView, positionViewDirection).saturate()), 3)
const behind = dot(positionViewDirection.negate(), sunInView).saturate().mul(0.8).add(0.2)
const sunSide = dot(normalView, sunInView).mul(0.5).add(0.5)
const RIM = vec3(1, 0.78, 0.45).mul(0.95)
export function rimLit(material) {
  const lit = new THREE.MeshStandardNodeMaterial().copy(material)
  lit.emissiveNode = materialEmissive.add(RIM.mul(edge).mul(behind).mul(sunSide))
  return lit
}

// Display grades as 32-cube LUTs over tone-mapped, encoded sRGB. Both table coordinates and stored bytes
// are in that same display domain: decoding the coordinates here would crush the entire picture twice.
function lut(grade) {
  const N = 32, data = new Uint8Array(N * N * N * 4), c = new THREE.Color()
  for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
    grade(c.setRGB(r / (N - 1), g / (N - 1), b / (N - 1)))
    const i = 4 * (r + N * (g + N * b))
    data[i] = c.r * 255
    data[i + 1] = c.g * 255
    data[i + 2] = c.b * 255
    data[i + 3] = 255
  }
  const texture = new THREE.Data3DTexture(data, N, N, N)
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture3D(texture)
}
const luma = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
const evening = lut(c => {
  const y = luma(c), shadow = (1 - y) ** 2, light = y ** 2
  c.r += 0.004 * shadow + 0.012 * light
  c.g += 0.009 * shadow + 0.009 * light
  c.b += 0.018 * shadow
  c.lerp({ r: y, g: y, b: y }, -0.035)
  c.r = Math.min(1, Math.max(0, c.r)), c.g = Math.min(1, Math.max(0, c.g)), c.b = Math.min(1, Math.max(0, c.b))
})
const sixOhOne = lut(c => {
  const y = luma(c)
  c.r = Math.min(1, c.r * 0.6 + y * 0.48 + 0.06)
  c.g = Math.min(1, c.g * 0.6 + y * 0.28 + 0.02)
  c.b = Math.min(1, c.b * 0.6 + y * 0.36 + 0.05)
})
export const pink = uniform(0)

// Authored cameras supply a world-space subject. Free play clears that ownership in main.js.
export const lens = { target: null, enabled: false, distance: uniform(4), range: uniform(1), radius: uniform(new THREE.Vector2()) }
const lensDirection = new THREE.Vector3(), lensOffset = new THREE.Vector3()
export function updateLens(cinematic, subject) {
  lens.enabled = cinematic
  if (!cinematic) {
    lens.target = null
    return
  }
  camera.getWorldDirection(lensDirection)
  lens.distance.value = Math.max(camera.near, lensOffset.copy(lens.target ?? subject).sub(camera.position).dot(lensDirection))
  lens.range.value = Math.max(0.08, lens.distance.value * 0.35)
  lens.radius.value.set(0.009 / camera.aspect, 0.009)
}

// Render colour, normals and indirect light together. Capture the lighting context through a zero GI input;
// the MRT reads the finished indirect terms. This keeps sun, emission and haze out of the AO composite.
const scenePass = pass(scene, camera)
const indirectLighting = new WeakMap()
scenePass.contextNode = context({
  getGI: (inputNode, { material }) => material.transparent ? inputNode : Fn(([], builder) => {
    indirectLighting.set(builder, builder.context.reflectedLight)
    return vec3(0)
  })(),
})
const indirect = Fn(([], builder) => {
  const light = indirectLighting.get(builder)
  if (!light || VIEW === 'haze') return vec4(0, 0, 0, output.a)
  const transmission = builder.material.fog ? float(1).sub(haze) : float(1)
  return vec4(light.indirectDiffuse.add(light.indirectSpecular).mul(transmission), output.a)
})()
scenePass.setMRT(mrt({ output, normal: normalView, indirect })
  .setBlendMode('indirect', new THREE.BlendMode(THREE.MaterialBlending))
  .setClearColor('indirect', 0, 0))
const aoPass = ao(scenePass.getTextureNode('depth'), scenePass.getTextureNode('normal'), camera)
aoPass.resolutionScale = 0.5
aoPass.radius.value = 0.6
const occlusion = float(1).sub(float(1).sub(aoPass.getTextureNode().sample(screenUV).r).mul(0.6)) // 60% strength: dense grass and leaves over-occlude
const hdr = scenePass.getTextureNode('output').sub(scenePass.getTextureNode('indirect').mul(float(1).sub(occlusion))).max(0)
// Geometry highlights and emission bloom in HDR; the sky and small sun already own their soft halo.
// Reuse scene depth rather than render the garden again for selective bloom.
const sceneDepth = scenePass.getTextureNode('depth')
const viewDistance = scenePass.getViewZNode().negate()

// A depth-cut solar light source and a short radial integration, both at quarter resolution and capped
// at 480 x 270. Alpha-tested canopy gaps are already present in the shared scene depth; no extra scene draw.
const sourceFalloff = exp(screenUV.sub(shaftSun).mul(shaftMetric).lengthSq().div(-0.008))
const shaftMask = rtt(vec4(vec3(sceneDepth.greaterThanEqual(1).mul(sourceFalloff)), 1), null, null, { depthBuffer: false })
const shafts = rtt(Fn(() => {
  const sum = float(0).toVar()
  let normalization = 0
  for (let i = 0; i < 24; i++) {
    const weight = 0.96 ** i
    const at = mix(screenUV, shaftSun, (i + 0.5) * 0.9 / 24)
    sum.addAssign(shaftMask.sample(at).r.mul(weight))
    normalization += weight
  }
  return vec4(vec3(sum.div(normalization)), 1)
})(), null, null, { depthBuffer: false })
const shaftLight = shafts.rgb.mul(vec3(1, 0.8, 0.52)).mul(shaftVisibility).mul(0.18)
  .mul(smoothstep(1, 14, viewDistance)) // foreground wood and faces stay solid at full-resolution depth edges
const atmosphericHdr = hdr.add(shaftLight)

// Signed circle of confusion in alpha, linear HDR in RGB. Both lens buffers are half resolution,
// capped at 960 x 540. Depth-similar taps keep soft background bokeh off the sharp subject's silhouette.
const coc = viewDistance.sub(lens.distance).div(viewDistance.max(0.01)).mul(lens.distance.div(lens.range)).clamp(-1, 1)
const lensSource = rtt(vec4(atmosphericHdr.rgb, coc), null, null, { depthBuffer: false })
const bokeh = rtt(Fn(() => {
  const centre = lensSource.sample(screenUV).toVar()
  const sum = centre.rgb.toVar(), weight = float(1).toVar()
  for (let i = 0; i < 16; i++) {
    const angle = i * 2.399963, radius = Math.sqrt((i + 0.5) / 16)
    const offset = vec2(Math.cos(angle) * radius, Math.sin(angle) * radius).mul(lens.radius).mul(centre.a.abs())
    const tap = lensSource.sample(screenUV.add(offset)).toVar()
    const w = float(1).sub(smoothstep(0.15, 0.6, tap.a.sub(centre.a).abs()))
    sum.addAssign(tap.rgb.mul(w))
    weight.addAssign(w)
  }
  return vec4(sum.div(weight), 1)
})(), null, null, { depthBuffer: false })
function resizeLens() {
  const scale = Math.min(0.5, 960 / (innerWidth * renderer.getPixelRatio()), 540 / (innerHeight * renderer.getPixelRatio()))
  lensSource.setResolutionScale(scale)
  bokeh.setResolutionScale(scale)
  shaftMask.setResolutionScale(scale * 0.5)
  shafts.setResolutionScale(scale * 0.5)
}
resizeLens()
const lensHdr = vec4(mix(atmosphericHdr.rgb, bokeh.rgb, smoothstep(0.03, 0.35, coc.abs())), 1)
const glow = bloom(hdr.mul(sceneDepth.lessThan(1)), 0.32, 0.5, 1.05)
glow.smoothWidth.value = 0.25
glow.setResolutionScale(0.35)
const toned = renderOutput(atmosphericHdr.add(glow), THREE.ACESFilmicToneMapping, THREE.SRGBColorSpace)
const graded = lut3D(lut3D(toned, evening, 32, 1), sixOhOne, 32, pink)
export const pipeline = new THREE.RenderPipeline(renderer)
pipeline.outputColorTransform = false
pipeline.outputNode = VIEW === 'ao' ? vec4(vec3(occlusion), 1)
  : VIEW === 'bloom' ? renderOutput(glow, THREE.NoToneMapping, THREE.SRGBColorSpace)
  : VIEW === 'shaft-mask' ? shaftMask
  : VIEW === 'shafts' ? renderOutput(vec4(shaftLight, 1), THREE.NoToneMapping, THREE.SRGBColorSpace)
  : VIEW === 'grade-off' ? toned
  : VIEW === 'look-off' ? renderOutput(hdr, THREE.ACESFilmicToneMapping, THREE.SRGBColorSpace)
  : graded

const cinematicPipeline = new THREE.RenderPipeline(renderer)
cinematicPipeline.outputColorTransform = false
const lensToned = renderOutput(lensHdr.add(glow), THREE.ACESFilmicToneMapping, THREE.SRGBColorSpace)
cinematicPipeline.outputNode = VIEW === 'dof' ? vec4(coc.negate().max(0), float(1).sub(coc.abs()), coc.max(0), 1)
  : VIEW === 'grade-off' ? lensToned : lut3D(lut3D(lensToned, evening, 32, 1), sixOhOne, 32, pink)
const authoredLensView = !VIEW || VIEW === 'grade-off' || VIEW === 'dof'
export const render = POST ? () => (lens.enabled && authoredLensView ? cinematicPipeline : pipeline).render() : () => renderer.render(scene, camera)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  resizeLens()
})
