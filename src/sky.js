import * as THREE from 'three/webgpu'
import { Fn, uniform, vec2, vec3, float, mix, dot, pow, exp, smoothstep, atan, asin, texture, time } from 'three/tsl'
import { LOOK, phaseColors } from './look.js'

// Linear HDR radiance. The garden, haze and sky share this low north-west sun.
export const SUN = new THREE.Vector3(...LOOK.sun).normalize()
const sunDirection = uniform(SUN)
export const air = {
  horizon: uniform(phaseColors.frozen.horizon.clone()),
  dusk: uniform(phaseColors.frozen.dusk.clone()),
  zenith: uniform(phaseColors.frozen.zenith.clone()),
  glow: uniform(phaseColors.frozen.glow.clone()),
}
const SUN_RADIUS = LOOK.sunRadius * Math.PI / 180

// A restrained forward-scattering lobe, not a second sun spread across the frame.
// Haze and the diffuse environment use this same clear-air radiance, without clouds or disc.
export const skyRadiance = Fn(([direction]) => {
  const up = direction.y.max(0)
  const angleSquared = float(1).sub(dot(direction, sunDirection)).max(0).mul(2)
  const halo = exp(angleSquared.div(-0.002)).mul(0.3).add(exp(angleSquared.div(-0.035)).mul(0.14)).add(exp(angleSquared.div(-0.35)).mul(0.22))
  const low = mix(air.dusk, air.horizon, dot(direction, sunDirection).max(0).pow(0.9))
  return mix(low, air.zenith, pow(up, 0.55)).add(air.glow.mul(halo))
})

// Bake two painted cloud layers once. Rounded lobes establish cumulus masses and flatter,
// higher strokes make cirrus; small periodic brush marks only erode their silhouettes.
// RG = low density / underside lighting, B = high density. U wraps without a seam.
const WIDTH = 1024, HEIGHT = 256, ELEVATION = 0.95, TAU = Math.PI * 2
let seed = 601
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296)
const puffs = []
for (let bank = 0; bank < 18; bank++) {
  const high = bank >= 12, u = random(), base = high ? 0.35 + random() * 0.3 : 0.045 + random() * 0.27
  for (let lobe = 0; lobe < 5; lobe++) {
    puffs.push({
      u: u + (lobe - 2) * (high ? 0.025 : 0.016),
      v: base + random() * (high ? 0.018 : 0.055),
      rx: high ? 0.04 + random() * 0.025 : 0.017 + random() * 0.018,
      ry: high ? 0.012 + random() * 0.015 : 0.035 + random() * 0.045,
      base, high,
    })
  }
}
const data = new Uint8Array(WIDTH * HEIGHT * 4)
for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
  const u = (x + 0.5) / WIDTH, v = (y + 0.5) / HEIGHT
  const brush = 0.12 + 0.055 * Math.sin(u * TAU * 47 + Math.sin(v * 53))
    + 0.035 * Math.sin(u * TAU * 91 + v * 97) + 0.02 * Math.sin(u * TAU * 173 - v * 213)
  let low = 0, high = 0, underside = 0
  for (const puff of puffs) {
    const du = u - puff.u - Math.round(u - puff.u)
    const shape = 1 - (du / puff.rx) ** 2 - ((v - puff.v) / puff.ry) ** 2
    const density = THREE.MathUtils.smoothstep(shape - brush, 0, 0.6)
      * THREE.MathUtils.smoothstep(v, puff.base - 0.035, puff.base + 0.005)
    if (puff.high) high = Math.max(high, density)
    else if (density > low) {
      low = density
      underside = 1 - THREE.MathUtils.smoothstep(v, puff.base, puff.base + 0.085)
    }
  }
  const i = (x + y * WIDTH) * 4
  data[i] = low * 255
  data[i + 1] = underside * 255
  data[i + 2] = high * 255
  data[i + 3] = 255
}
const clouds = new THREE.DataTexture(data, WIDTH, HEIGHT)
clouds.wrapS = THREE.RepeatWrapping
clouds.minFilter = THREE.LinearMipmapLinearFilter
clouds.magFilter = THREE.LinearFilter
clouds.generateMipmaps = true
clouds.needsUpdate = true

// Two filtered samples in the existing background draw: no raymarch, new pass, or history.
// The layers drift independently at 0.018 and 0.011 degrees/second; their shapes never boil.
export const paintedSky = Fn(([direction, cloudView]) => {
  const u = atan(direction.z, direction.x).div(TAU).add(0.5)
  const v = asin(direction.y.clamp(-1, 1)).div(ELEVATION)
  const low = texture(clouds, vec2(u.add(time.mul(0.00005)), v))
  const high = texture(clouds, vec2(u.sub(time.mul(0.00003)), v)).b
  const altitude = smoothstep(0.005, 0.04, direction.y)
  const lowCover = low.r.mul(altitude).mul(0.86)
  const highCover = high.mul(altitude).mul(0.42)
  const coverage = float(1).sub(float(1).sub(lowCover).mul(float(1).sub(highCover)))
  const towardSun = dot(direction, sunDirection).max(0)
  const shade = air.zenith.mul(0.6).add(air.dusk.mul(0.25))
  const lit = air.horizon.mul(0.8).add(air.glow.mul(towardSun.mul(0.4).add(0.2)))
  const lowColor = mix(shade, lit, low.g.mul(0.75).add(0.25))
  const highColor = air.horizon.mul(0.65).add(air.zenith.mul(0.25)).add(air.glow.mul(0.15))
  const sky = mix(mix(skyRadiance(direction), highColor, highCover), lowColor, lowCover)
  const disc = smoothstep(Math.cos(SUN_RADIUS * 1.12), Math.cos(SUN_RADIUS * 0.88), towardSun)
  const radiance = sky.add(vec3(...LOOK.sunRadiance).mul(disc).mul(float(1).sub(coverage)))
  return cloudView.select(vec3(coverage), radiance)
})
