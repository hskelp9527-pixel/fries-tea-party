import * as THREE from 'three/webgpu'
import { clips } from './models.js'
import { clipInfo } from './clip-catalog.js'
import { registerContactRig, setRigAction } from './contact-ik.js'
import { registerCharacterMotion } from './secondary-motion.js'

const FADE = 0.2 // seconds

// Plays a model's glTF clips by name with crossfades. A box placeholder, or a glb without a clip, simply has
// nothing to play under that name.
export class Animator {
  constructor(object, name) {
    this.object = object
    this.name = name
    this.mixer = new THREE.AnimationMixer(object)
    this.actions = {}
    for (const clip of clips(name)) this.actions[clip.name] = this.mixer.clipAction(clip)
    this.current = null
    this.standPose=[]
    this.upperPose=[]
    if(this.actions.idle){
      const idle=this.actions.idle;idle.reset().play();this.mixer.update(0)
      object.traverse(bone=>{if(bone.isBone&&/(Hips|(?:Left|Right)(?:UpLeg|Leg|Foot|ToeBase|Toe_End))$/.test(bone.name))this.standPose.push({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone()})})
      object.traverse(bone=>{if(bone.isBone&&!this.standPose.some(p=>p.bone===bone)&&!bone.name.startsWith('secondary_')&&!/(Neck|Head)$/.test(bone.name))this.upperPose.push({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone()})})
      idle.stop()
    }
    if (object.parent) {
      registerContactRig(object, name)
      registerCharacterMotion(object, name)
    }
  }

  has(name) {
    return name in this.actions
  }
  standLowerBody(){
    for(const pose of this.standPose){pose.bone.position.copy(pose.position);pose.bone.quaternion.copy(pose.quaternion)}
  }
  relaxUpperBody(weight=1){
    for(const pose of this.upperPose){pose.bone.position.lerp(pose.position,weight);pose.bone.quaternion.slerp(pose.quaternion,weight)}
    this.object.updateWorldMatrix(true,true)
  }

  // Crossfades to a clip that loops, or with `once` plays a single time and holds its last frame.
  play(name, once = undefined, reverse = false, fade = FADE) {
    const next = this.actions[name]
    const metadata = clipInfo(name)
    once ??= !metadata.loop
    if (!next || (next === this.current && !once)) return
    if (next === this.current) next.reset()
    else {
      this.current?.fadeOut(fade)
      next.reset().fadeIn(fade)
    }
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = once
    next.timeScale = (reverse ? -1 : 1) * (metadata.duetDuration ? next.getClip().duration / metadata.duetDuration : 1)
    if (reverse) next.time = next.getClip().duration
    next.play()
    this.current = next
    if (this.object.parent) setRigAction(this.object, next, this.name)
  }

  // Whether a clip played with `once` is still going (a held clip is).
  playing(name) {
    return !!this.actions[name]?.isRunning() || this.held === name
  }

  // Holds a clip on its current frame, or (with false) lets it run on.
  hold(name, held = true) {
    if (this.actions[name]) this.actions[name].paused = held
    this.held = held ? name : null
  }

  // Sets a clip's playback rate so its feet cover `speed` metres per second on a model at `scale`.
  pace(name, speed, scale) {
    const action = this.actions[name]
    if (action) action.timeScale = speed / (action.getClip().userData.groundSpeed * scale)
  }
}

// Eyelids use both morphs together so the lid follows the eye. The lids are a group of two meshes (skin and lash
// line), each carrying the morph targets.
export class Blink {
  constructor(object) {
    this.lids = []
    object.getObjectByName('Eyelids')?.traverse(o => { if (o.morphTargetDictionary) this.lids.push(o) })
    this.timer = 2 + Math.random() * 4
    this.phase = -1
  }

  update(dt, sleeping = false) {
    let amount = 0
    if (sleeping) {
      amount = 1
      this.phase = -1
      this.timer = 2 + Math.random() * 4
    } else if (this.phase >= 0) {
      this.phase += dt
      amount = this.phase < 0.07 ? this.phase / 0.07 : Math.max(0, 1 - (this.phase - 0.07) / 0.1)
      if (this.phase >= 0.17) {
        this.phase = -1
        this.timer = Math.random() < 0.2 ? 0.12 : 2 + Math.random() * 4
      }
    } else if ((this.timer -= dt) <= 0) this.phase = 0
    for (const { morphTargetDictionary: indices, morphTargetInfluences: weights } of this.lids) {
      weights[indices.blink_half] = 1 - Math.abs(2 * amount - 1)
      weights[indices.blink] = Math.max(0, 2 * amount - 1)
    }
  }
}
