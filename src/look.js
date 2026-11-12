import * as THREE from 'three/webgpu'
import { uniform } from 'three/tsl'
import palette from './look-palette.json'

// The one visual contract: all creative color, illumination and grading lives here.
export const LOOK = {
  palette,
  rimColor: [1,.55,.22], rimIntensity:.25, sunRadiance:[5,2.7,.85],
  sun: [0.86, 0.22, -0.46], sunRadius: 0.85, exposure: 0.98,
  environment: 0.24, hemisphere: 0.14, bounce: 0.12, fillColor:0x8796c3, sunIntensity: 4.0,
  backdrop:{radius:150,height:120,altitude:32,repeat:2,offset:.02,apronRadius:35,apronDepth:4},
  fog: { start: 40, density: 0.006, height: 22 },
  bloom: { strength: 0.22, radius: 0.55, threshold: 1.25 },
  grade: { contrast: 1.035, saturation: 0.96, shadowCool: 0.016, highlightWarm: 0.015 },
  song: [[0.24, 4.0], [0.30, 4.4], [0.36, 4.9]],
}
export const lookPhase = { awake: uniform(0), pink: uniform(0) }
const sample = (phase, key) => new THREE.Color(palette[phase][key])
export const phaseColors = Object.fromEntries(['frozen', 'awake', 'sixOhOne'].map(phase => [phase, {
  horizon: sample(phase, phase === 'sixOhOne' ? 'roseSky' : 'sky').multiplyScalar(1.8),
  zenith: sample(phase, 'shadow').multiplyScalar(0.5),
  glow: sample(phase, 'main').multiplyScalar(2.2),
}]))
export const surfacePalette = {
  dry: sample('awake', 'secondary').lerp(sample('awake','sky'),.12).multiplyScalar(1.9),
  lush: sample('awake', 'secondary').lerp(sample('awake','shadow'),.08).multiplyScalar(1.8),
  moss: sample('frozen', 'secondary').lerp(sample('frozen','shadow'),.05).multiplyScalar(1.6),
  soil: sample('frozen', 'main').multiplyScalar(0.75),
  soilLight: sample('frozen', 'sky').multiplyScalar(0.8),
  wood: sample('frozen', 'secondary').lerp(sample('frozen', 'main'), 0.32),
  farGrass:new THREE.Color(0x5a6347),farDry:new THREE.Color(0x85805b),farForest:new THREE.Color(0x343f3c),
}
