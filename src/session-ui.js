import { game, checkpoint, onPhaseChange } from './state.js'
import { player } from './player.js'
import { ctx, setAudioLevels, setSubtitleLanguage, stopSpeaking } from './audio.js'
import { quality, setQuality } from './quality.js'
import { requestSceneSkip } from './tweens.js'
import { currentLanguage, tr, onLanguageChange } from './i18n.js'
import { conversationTotal } from './banter.js'

const pause = document.getElementById('pause-menu'), open = document.getElementById('pause-open')
const resume = document.getElementById('pause-resume'), skip = document.getElementById('scene-skip')
const title = document.getElementById('start-label')
let controlsBeforePause = false, focusBeforePause, audioWasRunning = false, saveAge = 0
let savedFromMenu=false
let preferences = { music: 0.8, voice: 1, sfx: 0.8, language: currentLanguage() }
try { Object.assign(preferences, JSON.parse(localStorage.getItem('tea-party-settings') ?? '{}')) } catch {}
preferences.language=currentLanguage()
for (const bus of ['music', 'voice', 'sfx']) {
  const input = document.getElementById(`${bus}-volume`)
  input.value = preferences[bus]
  input.addEventListener('input', () => { preferences[bus] = Number(input.value); applyPreferences() })
}
const language = document.getElementById('subtitle-language'), picture = document.getElementById('pause-quality')
language.value = preferences.language
picture.value = quality.mode
language.addEventListener('change', () => { preferences.language = language.value; applyPreferences() })
picture.addEventListener('change', () => {
  setQuality(picture.value)
  const titleQuality = document.getElementById('quality')
  if (titleQuality) titleQuality.value = quality.mode
})
function applyPreferences() {
  setAudioLevels({ music: preferences.music, voice: preferences.voice, sfx: preferences.sfx })
  setSubtitleLanguage(preferences.language)
  try { localStorage.setItem('tea-party-settings', JSON.stringify(preferences)) } catch {}
}
applyPreferences()

export function setPaused(paused) {
  if (game.phase === 'title' || game.phase === 'complete' || game.paused === paused) return
  if (paused) {
    controlsBeforePause = player.control
    focusBeforePause = document.activeElement
    player.control = false
    game.paused = true
    audioWasRunning = ctx.state === 'running'
    ctx.suspend().catch(() => {})
    document.exitPointerLock?.()
    pause.hidden = false
    picture.value = quality.mode
    resume.focus()
    checkpoint()
  } else {
    game.paused = false
    player.control = controlsBeforePause
    pause.hidden = true
    if (audioWasRunning) ctx.resume().catch(() => {})
    if (focusBeforePause?.isConnected && focusBeforePause !== open) focusBeforePause.focus()
  }
}
function skipScene() {
  if (requestSceneSkip()) { stopSpeaking(); skip.textContent = tr('Finishing the scene…') }
}
open.addEventListener('click', () => setPaused(true))
resume.addEventListener('click', () => setPaused(false))
skip.addEventListener('click', skipScene)
document.getElementById('pause-save').addEventListener('click', () => {
  checkpoint()
  savedFromMenu=true
  document.getElementById('pause-status').textContent = tr('Saved. Continue from a safe place at the tea table when you return.')
})
document.getElementById('pause-restart').addEventListener('click', () => {
  const url = new URL(location.href)
  url.searchParams.delete('start')
  location.href = url.href
})
addEventListener('keydown', event => {
  if (event.code === 'Escape' && game.phase !== 'title' && game.phase !== 'complete') {
    event.preventDefault(); event.stopImmediatePropagation(); setPaused(!game.paused); return
  }
  if (game.paused) {
    const focusable = [...pause.querySelectorAll('button,select,input')].filter(element => !element.disabled)
    if (event.code === 'Tab') {
      const first = focusable[0], last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    } else if (!pause.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation() }
    return
  }
  if (event.code === 'Enter' && !event.repeat && game.phase !== 'title' && game.phase !== 'complete' && !game.miniGame) {
    event.preventDefault(); event.stopImmediatePropagation(); skipScene()
  }
}, true)
addEventListener('blur', () => { if (game.phase !== 'title' && game.phase !== 'complete') setPaused(true) })

const PLACES = { tea: 'Hollow', syrup: 'Grotto', flowers: 'Mantel' }
function updateResults() {
  const { hits, total, best } = game.rhythm, ratio = hits / total
  const grade = ratio >= 0.9 ? 'Brilliant' : ratio >= 0.7 ? 'Good' : ratio >= 0.5 ? 'Steady' : 'Rusty'
  document.getElementById('result-discoveries').textContent = tr('{count} / {total} conversations · {gears}/3 gears',{count:game.discovered.length,total:conversationTotal,gears:game.gears})
  document.getElementById('result-rhythm').textContent = tr('{hits}/{total} notes · best streak {best} · {grade}',{hits,total,best,grade:tr(grade)})
  document.getElementById('result-puzzles').textContent = Object.entries(game.puzzles).filter(([, p]) => p.seconds !== undefined)
    .map(([layer, p]) => tr('{place} {seconds} s · {mistakes} slips',{place:tr(PLACES[layer]),seconds:p.seconds,mistakes:p.mistakes})).join(' · ') || '—'
}
onLanguageChange(()=>{
  if(game.phase==='complete')updateResults()
  document.getElementById('pause-status').textContent=tr(savedFromMenu?'Saved. Continue from a safe place at the tea table when you return.':'Your progress is saved at safe chapter checkpoints.')
})
onPhaseChange(phase => { if (phase === 'complete') {
  updateResults()
  // The ending freezes the render loop, so clear transient play UI now rather
  // than relying on the next updateSessionUI frame.
  for(const id of ['objective','hud','prompt','controls','task-hint','subtitle','scene-skip','pause-open','rhythm-cue','pause-menu'])document.getElementById(id).hidden=true
} })
export function updateSessionUI(dt) {
  if (title) title.disabled = document.getElementById('start')?.getAttribute('aria-busy') === 'true'
  const playing = game.phase !== 'title' && game.phase !== 'complete'
  open.hidden = !playing
  skip.hidden = !playing || player.control || game.miniGame || game.paused || !game.sceneDepth
  if (!game.sceneSkipping) skip.textContent = tr('Enter · Skip scene')
  if (game.paused) return
  saveAge += dt
  if (game.phase === 'explore' && player.control && saveAge > 10) { checkpoint(); saveAge = 0 }
}

// Call from the frame loop even while paused. The renderer stays live; gameplay,
// physics, tweens and the audio clock are suspended together by the main loop.
export const sessionUI = { setPaused, preferences }
