import en from './lang/en.json'
import speakers from './speakers.json'
import files from 'virtual:tea-audio'
import { game } from './state.js'
import { currentLanguage, setLanguage, dialogue, onLanguageChange } from './i18n.js'

export const ctx = new AudioContext()
const musicBus = ctx.createGain(), voiceBus = ctx.createGain(), sfxBus = ctx.createGain()
musicBus.gain.value = 0.8
for (const bus of [musicBus, voiceBus, sfxBus]) bus.connect(ctx.destination)

export function setAudioLevels(levels = {}) {
  for (const [name, bus] of Object.entries({ music: musicBus, voice: voiceBus, sfx: sfxBus })) {
    if (!Number.isFinite(levels[name])) continue
    bus.gain.setTargetAtTime(Math.max(0, Math.min(1, levels[name])), ctx.currentTime, 0.025)
  }
}

// Only the selected variants are emitted by the build manifest. Loading a module never fetches audio.
const MUSIC = {
  opening: ['01t_opening_b', 40, false],
  frozen: ['02t_explore_frozen_b', 120, true],
  awake: ['03t_explore_awake_a', 120, true],
  song: ['04t_little_bat_a', 80, false],
  ending: ['06t_ending_a', 30, false],
}
const silence = seconds => ctx.createBuffer(1, Math.max(1, Math.ceil(seconds * 8000)), 8000)
async function decode(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Audio download failed (${response.status}): ${url}`)
  return ctx.decodeAudioData(await response.arrayBuffer())
}
async function load(path, seconds) {
  if (!files[path]) return silence(seconds)
  try { return await decode(files[path]) } catch (error) {
    console.warn(`Audio unavailable; preserving its timing: ${path}`, error)
    return silence(seconds)
  }
}

const music = {}, musicLoads = {}, voices = new Map()
export function prepareMusic(...roles) {
  return Promise.all(roles.flat().map(role => {
    if (!MUSIC[role]) throw new Error(`Unknown music role: ${role}`)
    return musicLoads[role] ??= load(`/audio/${MUSIC[role][0]}.mp3`, MUSIC[role][1])
      .then(buffer => (music[role] = buffer))
  }))
}
function voice(id) {
  if (voices.has(id)) return voices.get(id)
  const pending = load(`/audio/voice/lines/${id}_${speakers[id]}.wav`, 0.6 + (en[id]?.length ?? 0) * 0.06)
  voices.set(id, pending)
  // Optional conversations should not retain every decoded line for the whole session.
  if (voices.size > 24) voices.delete(voices.keys().next().value)
  return pending
}

// Tracks retain their audio-clock start, including after a non-looping track finishes.
export const playing = {}
let musicRequest = 0
export function setMusic(mix, fade = 2) {
  const request = ++musicRequest
  const missing = Object.keys(mix).filter(role => !music[role])
  if (missing.length) return prepareMusic(...missing).then(() => {
    if (request === musicRequest) applyMusic(mix, fade)
  })
  // Prepared tracks start synchronously, so choreography can immediately read playing[role].start.
  applyMusic(mix, fade)
}
function applyMusic(mix, fade) {
  const now = ctx.currentTime
  fade = Math.max(0, fade)
  for (const role in playing) {
    if (role in mix) continue
    const { source, gain } = playing[role]
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + fade)
    source.stop(now + fade)
    delete playing[role]
  }
  for (const [role, level] of Object.entries(mix)) {
    if (!playing[role]) {
      const source = ctx.createBufferSource(), gain = ctx.createGain()
      source.buffer = music[role]
      source.loop = MUSIC[role][2]
      gain.gain.value = 0
      source.connect(gain).connect(musicBus)
      source.onended = () => { source.disconnect(); gain.disconnect() }
      source.start(now)
      playing[role] = { source, gain, start: now }
    }
    const { gain } = playing[role]
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(Math.max(0, level), now + fade)
  }
}
export const musicLength = role => music[role]?.duration ?? MUSIC[role]?.[1] ?? 0

const subtitle = document.getElementById('subtitle')
let line = null, pitch = 1
function refreshSubtitle() {
  if (!subtitle) return
  const language=currentLanguage()
  subtitle.textContent = line?.source && line.distance < 12 ? dialogue(line.id) : ''
  subtitle.className = line ? speakers[line.id] : ''
  subtitle.lang = language === 'zh' ? 'zh-CN' : language
}
export function setSubtitleLanguage(code) {
  return setLanguage(code)
}
onLanguageChange(refreshSubtitle)
export const subtitleLanguage = currentLanguage
export function setVoicePitch(value) { pitch = Math.max(0.25, Math.min(3, value)) }

// Resolve immediately even if a stopped line is still downloading or decoding.
export function stopSpeaking(finished = false) {
  const previous = line
  if (!previous) return
  line = null
  cancelAnimationFrame(previous.skipFrame)
  if (previous.source) {
    previous.source.onended = null
    previous.source.stop()
    previous.source.disconnect()
    previous.analyser.disconnect()
    previous.gain.disconnect()
  }
  previous.resolve(finished)
  refreshSubtitle()
}

export function say(id, distance = 0) {
  stopSpeaking(game.sceneSkipping === true)
  if (game.sceneSkipping) return Promise.resolve(true)
  return new Promise(resolve => {
    const current = line = { id, distance, source: null, resolve, level: 0, levelAt: -1, skipFrame: 0 }
    refreshSubtitle()
    function watchSkip() {
      if (line !== current) return
      if (game.sceneSkipping) { stopSpeaking(true); return }
      current.skipFrame = requestAnimationFrame(watchSkip)
    }
    current.skipFrame = requestAnimationFrame(watchSkip)
    voice(id).then(buffer => {
      if (line !== current) return
      if (game.sceneSkipping) { stopSpeaking(true); return }
      const source = ctx.createBufferSource(), gain = ctx.createGain(), analyser = ctx.createAnalyser()
      source.buffer = buffer
      source.playbackRate.value = speakers[id] === 'fries' ? 1 : pitch
      gain.gain.value = Math.max(0.12, Math.min(1, 1 - (distance - 4) / 22))
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0
      source.connect(analyser).connect(gain).connect(voiceBus)
      Object.assign(current, { source, gain, analyser, samples: new Float32Array(analyser.fftSize) })
      source.onended = () => {
        source.disconnect(); analyser.disconnect(); gain.disconnect()
        if (line !== current) { resolve(false); return }
        cancelAnimationFrame(current.skipFrame)
        line = null
        refreshSubtitle()
        resolve(true)
      }
      source.start()
      refreshSubtitle()
    })
  })
}

export const speaking = () => line !== null
export const currentSpeaker = () => line && speakers[line.id]
export const currentLine = () => line && line.id

// Mouth movement follows the actual waveform, before distance attenuation and the user's volume setting.
export function voiceLevel(characterName) {
  if (!line?.analyser || ctx.state !== 'running' || speakers[line.id] !== String(characterName).toLowerCase()) return 0
  const now = ctx.currentTime
  if (line.levelAt === now) return line.level
  line.analyser.getFloatTimeDomainData(line.samples)
  let squared = 0
  for (const sample of line.samples) squared += sample * sample
  const target = Math.min(1, Math.max(0, Math.sqrt(squared / line.samples.length) - 0.008) * 5)
  const dt = line.levelAt < 0 ? 0.016 : Math.min(0.1, now - line.levelAt)
  line.level += (target - line.level) * (1 - Math.exp(-dt / (target > line.level ? 0.025 : 0.065)))
  line.levelAt = now
  return line.level
}

// CC0 recordings and their original licenses are listed in docs/audio-sources.md.
const recordings = import.meta.glob('/art/optimized/audio/*.ogg', { eager: true, query: '?url', import: 'default' })
const variants = prefix => Object.keys(recordings).filter(path => path.split('/').at(-1).startsWith(prefix)).sort()
const sounds = {
  footstep_grass: variants('footstep_grass_'),
  footstep_wood: variants('footstep_wood_'),
  footstep_stone: variants('footstep_concrete_'),
  cup: variants('impactPlate_light_'),
  glass: variants('impactGlass_light_'),
  interaction: variants('impactWood_light_'),
  clock_tick: variants('clock_tick_'),
  syrup_drop: variants('water_drop_'),
}
const soundLoads = new Map(), soundIndex = {}, activeSounds = new Set()
const aliases = { footstep: 'footstep_grass', grass: 'footstep_grass', wood: 'footstep_wood',
  stone: 'footstep_stone', footstep_concrete: 'footstep_stone', success: 'glass', fail: 'interaction',
  pickup: 'glass', tap: 'cup', tick: 'clock_tick', drop: 'syrup_drop', pour: 'syrup_drop', drink: 'syrup_drop' }
function soundBuffer(path) {
  if (!soundLoads.has(path)) soundLoads.set(path, decode(recordings[path]).catch(error => {
    console.warn(`Recorded sound unavailable: ${path}`, error)
    return null
  }))
  return soundLoads.get(path)
}
export function prepareSfx(...names) {
  return Promise.all([...new Set(names.flat().flatMap(name => sounds[aliases[name] ?? name] ?? []))].map(soundBuffer))
}
export async function playSfx(name, { pitch: playback = 1, gain: volume = 0.4 } = {}) {
  const key = aliases[name] ?? name, choices = sounds[key]
  if (!choices?.length || volume <= 0 || game.sceneSkipping) return null
  const index = soundIndex[key] = ((soundIndex[key] ?? -1) + 1) % choices.length
  const buffer = await soundBuffer(choices[index])
  if (!buffer || game.sceneSkipping || ctx.state !== 'running') return null
  // Keep overlapping footsteps and repeated input from creating an unbounded voice count.
  if (activeSounds.size >= 16) activeSounds.values().next().value.stop()
  const source = ctx.createBufferSource(), gain = ctx.createGain()
  source.buffer = buffer
  source.playbackRate.value = Math.max(0.25, Math.min(3, playback))
  gain.gain.value = Math.max(0, Math.min(1.5, volume))
  source.connect(gain).connect(sfxBus)
  activeSounds.add(source)
  source.onended = () => { activeSounds.delete(source); source.disconnect(); gain.disconnect() }
  source.start()
  return source
}
export function burst(rate = 1, volume = 0.4) {
  if (rate >= 6) return playSfx('clock_tick', { pitch: rate / 7, gain: volume })
  if (rate >= 3) return playSfx('interaction', { pitch: rate / 4, gain: volume })
  return playSfx('footstep', { pitch: rate, gain: volume })
}
export function ting(frequency = 1320) {
  return playSfx('cup', { pitch: frequency / 1320, gain: 0.4 })
}

// Map a performance timestamp to the audible clock; suspended contexts must not advance choreography.
export function heard(at = performance.now()) {
  if (ctx.state !== 'running') return ctx.currentTime
  const { contextTime, performanceTime } = ctx.getOutputTimestamp()
  return performanceTime ? Math.max(0, contextTime + (at - performanceTime) / 1000) : ctx.currentTime
}
