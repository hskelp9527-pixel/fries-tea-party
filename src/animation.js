import * as THREE from 'three/webgpu'
import { clips } from './models.js'

const FADE = 0.2 // seconds

// Plays a model's glTF clips by name with crossfades. A box placeholder, or a glb without a clip, simply has
// nothing to play under that name.
export class Animator {
  constructor(object, name) {
    this.mixer = new THREE.AnimationMixer(object)
    this.actions = {}
    for (const clip of clips(name)) this.actions[clip.name] = this.mixer.clipAction(clip)
    this.current = null
  }

  has(name) {
    return name in this.actions
  }

  // Crossfades to a clip that loops, or with `once` plays a single time and holds its last frame.
  play(name, once = false) {
    const next = this.actions[name]
    if (!next || (next === this.current && !once)) return
    if (next === this.current) next.reset()
    else {
      this.current?.fadeOut(FADE)
      next.reset().fadeIn(FADE)
    }
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = once
    next.timeScale = 1
    next.play()
    this.current = next
  }

  // Whether a clip played with `once` is still going.
  playing(name) {
    return this.actions[name].isRunning()
  }

  // Sets a clip's playback rate so its feet cover `speed` metres per second on a model at `scale`.
  pace(name, speed, scale) {
    const action = this.actions[name]
    if (action) action.timeScale = speed / (action.getClip().userData.groundSpeed * scale)
  }
}
