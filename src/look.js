import * as THREE from 'three/webgpu'
import { uniform } from 'three/tsl'
import palette from './look-palette.json'

// The one visual contract: all creative color, illumination and grading lives here.
export const LOOK = {
  palette,
  rimColor: [1,.55,.22], rimIntensity:.38, sunRadiance:[5,2.7,.85],
  sun: [0.86, 0.22, -0.46], sunRadius: 0.85, exposure: 1.04,
  environment: 0.36, hemisphere: 0.26, bounce: 0.2, fillColor:0x8796c3, sunIntensity: 4.4,
  backdrop:{radius:150,height:120,altitude:32,repeat:2,offset:.02,apronRadius:35,apronDepth:4},
  fog: { start: 40, density: 0.006, height: 22 },
  bloom: { strength: 0.22, radius: 0.55, threshold: 1.25 },
  grade: { contrast: 1.07, saturation: 1.06, shadowCool: 0.04, highlightWarm: 0.015 },
  song: [[0.24, 4.0], [0.30, 4.4], [0.36, 4.9]],
}
export const lookPhase = { awake: uniform(0), pink: uniform(0) }
const sample = (phase, key) => new THREE.Color(palette[phase][key])
export const phaseColors = Object.fromEntries(['frozen', 'awake', 'sixOhOne'].map(phase => [phase, {
  horizon: sample(phase, phase === 'sixOhOne' ? 'roseSky' : 'sky').multiplyScalar(1.8),
  dusk: sample(phase, 'dusk').multiplyScalar(1.3),
  zenith: sample(phase, 'zenithSky').multiplyScalar(0.8),
  glow: sample(phase, 'main').multiplyScalar(3.6),
}]))
// Authored albedo (sRGB hex): sunlit lawn, lush deep green, shaded moss, and pale sand for the paths.
export const surfacePalette = {
  dry: new THREE.Color(0xc8d85a),
  lush: new THREE.Color(0x92b640),
  moss: new THREE.Color(0x5f8236),
  soil: new THREE.Color(0xeab870),
  soilLight: new THREE.Color(0xf6d595),
  wood: sample('frozen', 'secondary').lerp(sample('frozen', 'main'), 0.32),
  farGrass:new THREE.Color(0x5a6347),farDry:new THREE.Color(0x85805b),farForest:new THREE.Color(0x343f3c),
}
