import { game, checkpoint, onPhaseChange } from './state.js'
import { player } from './player.js'
import { ctx, setAudioLevels, setSubtitleLanguage, stopSpeaking } from './audio.js'
import { quality, setQuality } from './quality.js'
import { requestSceneSkip } from './tweens.js'
import { currentLanguage, tr, onLanguageChange } from './i18n.js'
import { conversationTotal } from './banter.js'
import { objectiveText, objectiveValues, guideGoal } from './explore.js'

const pause = document.getElementById('pause-menu'), open = document.getElementById('pause-open')
const resume = document.getElementById('pause-resume'), skip = document.getElementById('scene-skip')
const title = document.getElementById('start-label')
const guide = document.getElementById('guide'), guideBody = document.getElementById('guide-body'), guideChip = document.getElementById('guide-open'), toast = document.getElementById('guide-toast')
const objective = document.getElementById('objective')
let guideFromGame = false, toastSeen = false, toastLeft = 0, objectiveShown = ''
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
    guide.hidden = true
    if (audioWasRunning) ctx.resume().catch(() => {})
    if (focusBeforePause?.isConnected && focusBeforePause !== open) focusBeforePause.focus()
  }
}
function skipScene() {
  if (requestSceneSkip()) { stopSpeaking(); skip.textContent = tr('Finishing the scene…') }
}
// The guide pauses through setPaused; opened from play it resumes on close, opened from the pause menu it returns there.
const canGuide = () => game.phase === 'explore' && player.control && !game.miniGame && !game.sceneDepth
function openGuide() {
  guideFromGame = !game.paused
  setPaused(true)
  if (!game.paused) return
  toast.hidden = true; toastLeft = 0
  pause.hidden = true; guide.hidden = false
  renderGuide()
  document.getElementById('guide-close').focus()
}
function closeGuide() {
  if (guideFromGame) return setPaused(false)
  guide.hidden = true; pause.hidden = false; resume.focus()
}
open.addEventListener('click', () => setPaused(true))
document.getElementById('pause-guide').addEventListener('click', openGuide)
document.getElementById('guide-close').addEventListener('click', closeGuide)
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
    event.preventDefault(); event.stopImmediatePropagation()
    if (!guide.hidden) closeGuide(); else setPaused(!game.paused)
    return
  }
  if (event.code === 'KeyH' && !event.repeat && (!guide.hidden || canGuide())) {
    event.preventDefault(); event.stopImmediatePropagation(); if (guide.hidden) openGuide(); else closeGuide(); return
  }
  if (game.paused) {
    const panel = guide.hidden ? pause : guide, focusable = [...panel.querySelectorAll('button,select,input')].filter(element => !element.disabled)
    if (event.code === 'Tab') {
      const first = focusable[0], last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    } else if (!panel.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation() }
    return
  }
  if (event.code === 'Enter' && !event.repeat && game.phase !== 'title' && game.phase !== 'complete' && !game.miniGame) {
    event.preventDefault(); event.stopImmediatePropagation(); skipScene()
  }
}, true)
addEventListener('blur', () => { if (game.phase !== 'title' && game.phase !== 'complete') setPaused(true) })

const PLACES = { tea: 'Hollow', syrup: 'Grotto', flowers: 'Mantel' }
// The guide: sizes, the three gears (place, size, how) with ticks from game.found, what follows, and the keys. Rebuilt on open and on language change.
const SWATCH = { big: '#5a86d8', small: '#d8608a', normal: '#e8c98f' }
const SIZE_NAME = { big: 'Giant', small: 'Tiny', normal: 'Normal size' }
const GUIDE_GEARS = [
  ['tea', "The big tree's hollow", 'big', 'Reach into the hollow high in the trunk. Feel for the four gear teeth by warmth and ticking.'],
  ['syrup', "The fountain's grotto", 'small', 'Cross the spoon bridge and slip into the grotto. Cross where the syrup parts.'],
  ['flowers', "The cottage mantelpiece", 'normal', "Open the March Hare's door and listen for the watch with the calm double tick."],
]
const GUIDE_KEYS = [['WASD', 'Move'], ['Mouse', 'Look'], ['Shift', 'Run'], ['Space', 'Jump'], ['E', 'Interact'], ['V', 'Change view'],
  ['G / Right mouse', 'Hold a floating cup (giant)'], ['Esc', 'Pause'], ['H', 'This guide'], ['Enter', 'Skip a scene']]
function renderGuide() {
  const now = guideGoal(), swatch = (size, cls = '') => `<span class="swatch ${cls}" style="--c:${SWATCH[size]}"></span>`
  guideBody.innerHTML = `<p>${tr("Find three lost gears, mend the Hatter's watch, then sing time on to 6:01.")}</p>
    <h3>${tr('Sizes')}</h3><div class="guide-sizes">
      <div>${swatch('big')}<span><b>${tr('Blue tea')}</b><small>${tr('Giant')}</small></span></div>
      <div>${swatch('small')}<span><b>${tr('Pink tea')}</b><small>${tr('Tiny')}</small></span></div>
      <div>${swatch('normal', 'cake')}<span><b>${tr('Cake')}</b><small>${tr('Back to normal size')}</small></span></div></div>
    <p>${tr('Cakes glow when you are not your usual size. Follow the glow.')}</p>
    <h3>${tr('Three gears')} · ${game.gears}/3</h3>${GUIDE_GEARS.map(([layer, place, size, how]) => {
      const done = game.found.includes(layer)
      return `<div class="guide-gear${done ? ' done' : ''}${layer === now ? ' now' : ''}"><span class="tick">${done ? '✓' : ''}</span>${swatch(size, size === 'normal' ? 'cake' : '')}<span><b>${tr(place)}</b>${tr(SIZE_NAME[size])}<small>${tr(how)}</small></span></div>`
    }).join('')}
    <h3>${tr('After the gears')}</h3><ul>
      <li>${tr('Bring them to the Hatter at the table to mend the watch.')}</li>
      <li>${tr('Then tap Space or click when a cup lights, to keep the beat.')}</li>
      <li>${tr("The tea service at the table, offered by the March Hare, is a practice round.")}</li></ul>
    <h3>${tr('Controls')}</h3><div class="guide-keys">${GUIDE_KEYS.map(([key, what]) =>
      `<div${key.startsWith('G') && player.size === 'big' ? ' class="now"' : ''}><kbd>${/mouse|^Space/i.test(key) ? tr(key) : key}</kbd>${tr(what)}</div>`).join('')}</div>`
}
onLanguageChange(() => { if (!guide.hidden) renderGuide() })
function updateResults() {
  const { hits, total, best } = game.rhythm, ratio = hits / total
  const grade = ratio >= 0.9 ? 'Brilliant' : ratio >= 0.7 ? 'Good' : ratio >= 0.5 ? 'Steady' : 'Rusty'
  document.getElementById('result-discoveries').textContent = tr('{count} / {total} conversations · {gears}/3 gears',{count:game.discovered.length,total:conversationTotal,gears:game.gears})
  document.getElementById('result-rhythm').textContent = tr('{hits}/{total} notes · best streak {best} · {grade}',{hits,total,best,grade:tr(grade)})
  document.getElementById('result-puzzles').textContent = Object.entries(game.puzzles).filter(([, p]) => p.seconds !== undefined)
    .map(([layer, p]) => tr('{place} {seconds} s · {mistakes} slips',{place:tr(PLACES[layer]),seconds:p.seconds,mistakes:p.mistakes})).join(' · ') || '—'
  document.getElementById('result-tea').textContent = game.tea.total ? tr('caught {hits} / {total}',game.tea) : '—'
}
onLanguageChange(()=>{
  if(game.phase==='complete')updateResults()
  document.getElementById('pause-status').textContent=tr(savedFromMenu?'Saved. Continue from a safe place at the tea table when you return.':'Your progress is saved at safe chapter checkpoints.')
})
onPhaseChange(phase => { if (phase === 'complete') {
  updateResults()
  // The ending freezes the render loop, so clear transient play UI now rather
  // than relying on the next updateSessionUI frame.
  for(const id of ['objective','hud','prompt','controls','task-hint','subtitle','scene-skip','pause-open','guide-open','guide-toast','rhythm-cue','pause-menu','guide'])document.getElementById(id).hidden=true
} })
export function updateSessionUI(dt) {
  if (title) title.disabled = document.getElementById('start')?.getAttribute('aria-busy') === 'true'
  const playing = game.phase !== 'title' && game.phase !== 'complete'
  open.hidden = guideChip.hidden = !playing
  if (playing) {
    const step = objectiveText(), shown = [game.phase, game.gears, step && tr(step, objectiveValues())].join('|')
    if (shown !== objectiveShown) {
      objectiveShown = shown
      document.getElementById('objective-count').textContent = game.phase === 'explore' || game.phase === 'mending' ? tr('Gears {count}/3', { count: game.gears }) : ''
      document.getElementById('objective-step').textContent = step && tr(step, objectiveValues())
      objective.hidden = !step
    }
  }
  skip.hidden = !playing || player.control || game.miniGame || game.paused || !game.sceneDepth
  if (!game.sceneSkipping) skip.textContent = tr('Enter · Skip scene')
  if (game.paused) return
  if (!toastSeen && canGuide()) { toastSeen = true; toastLeft = 10; toast.hidden = false }
  if (toastLeft > 0 && (toastLeft -= dt) <= 0) toast.hidden = true
  saveAge += dt
  if (game.phase === 'explore' && player.control && saveAge > 10) { checkpoint(); saveAge = 0 }
}

// Call from the frame loop even while paused. The renderer stays live; gameplay,
// physics, tweens and the audio clock are suspended together by the main loop.
export const sessionUI = { setPaused, preferences }
