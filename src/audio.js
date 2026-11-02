import en from './lang/en.json'
import speakers from './speakers.json'

// Subtitles come from src/lang/<code>.json, keyed by line ID; ?lang=<code> picks a language.
const languages = import.meta.glob('./lang/*.json', { eager: true, import: 'default' })
const subtitles = languages[`./lang/${new URLSearchParams(location.search).get('lang') ?? 'en'}.json`]

export const ctx = new AudioContext()
const musicBus = ctx.createGain(), voiceBus = ctx.createGain(), sfxBus = ctx.createGain()
musicBus.gain.value = 0.8
for (const bus of [musicBus, voiceBus, sfxBus]) bus.connect(ctx.destination)

// Music by role: file in audio/ without .mp3, its length in seconds, whether it loops.
const MUSIC = {
  opening: ['01t_opening_b', 40, false],
  frozen: ['02t_explore_frozen_b', 120, true],
  awake: ['03t_explore_awake_a', 120, true],
  song: ['04t_little_bat_a', 80, false],
  ending: ['06t_ending_a', 30, false],
}

// Media present on disk at build time. A missing file becomes silence of the expected length, so every
// timing (song beats, line lengths, cutscenes) works the same with or without it.
const files = import.meta.glob(['/audio/*.mp3', '/audio/voice/lines/*.wav'], { eager: true, query: '?url', import: 'default' })
const load = async (path, seconds) => files[path]
  ? ctx.decodeAudioData(await (await fetch(files[path])).arrayBuffer())
  : ctx.createBuffer(1, Math.ceil(seconds * 8000), 8000)

const music = {}, voices = {}
await Promise.all([
  ...Object.entries(MUSIC).map(async ([role, [file, seconds]]) => { music[role] = await load(`/audio/${file}.mp3`, seconds) }),
  ...Object.entries(speakers).map(async ([id, who]) => { voices[id] = await load(`/audio/voice/lines/${id}_${who}.wav`, 0.6 + en[id].length * 0.06) }),
])

// Tracks now playing, by role: { source, gain, start } with start on the audio clock.
export const playing = {}

// Fades the music to a mix such as { frozen: 0.7, awake: 0.3 }; roles left out fade to silence and stop.
export function setMusic(mix, fade = 2) {
  const now = ctx.currentTime
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
      source.start(now)
      playing[role] = { source, gain, start: now }
    }
    const { gain } = playing[role]
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(level, now + fade)
  }
}

export const musicLength = role => music[role].duration

const subtitle = document.getElementById('subtitle')
let line = null, pitch = 1

// The pitch at which Fries hears the others: deep when he is small, squeaky when he is big.
export function setVoicePitch(value) {
  pitch = value
}

// Plays a voice line by ID with its subtitle. Resolves true when it finishes, false when another line cuts it off.
export function say(id) {
  line?.source.stop()
  const source = ctx.createBufferSource()
  source.buffer = voices[id]
  source.playbackRate.value = speakers[id] === 'fries' ? 1 : pitch
  source.connect(voiceBus)
  source.start()
  const current = line = { id, source }
  subtitle.textContent = subtitles[id]
  subtitle.className = speakers[id]
  return new Promise(resolve => {
    source.onended = () => {
      const finished = line === current
      if (finished) {
        line = null
        subtitle.textContent = ''
      }
      resolve(finished)
    }
  })
}

export const speaking = () => line !== null

// Stand-in sounds until prop sounds exist: a noise burst for footsteps and the clock, a ting for tapped cups.
const noise = ctx.createBuffer(1, 4410, 44100)
noise.getChannelData(0).forEach((_, i, data) => { data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 4 })

export function burst(rate, volume) {
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain()
  source.buffer = noise
  source.playbackRate.value = rate
  filter.frequency.value = 800 * rate
  gain.gain.value = volume
  source.connect(filter).connect(gain).connect(sfxBus)
  source.start()
}

export function ting(frequency) {
  const osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  osc.connect(gain).connect(sfxBus)
  osc.start(now)
  osc.stop(now + 0.3)
}

// The audio clock at a performance.now() moment, as the player hears it (output latency included).
export function heard(at = performance.now()) {
  const { contextTime, performanceTime } = ctx.getOutputTimestamp()
  return contextTime + (at - performanceTime) / 1000
}
