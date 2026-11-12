const PRESETS = {
  high: { pixelRatio: 1.5, distance: 1, post: true },
  medium: { pixelRatio: 1, distance: 1.35, post: true },
  low: { pixelRatio: 0.75, distance: 1.8, post: false },
}
const listeners = new Set()
let saved = 'auto'
try { saved = localStorage.getItem('tea-party-quality') ?? saved } catch {}
const requested = new URLSearchParams(location.search).get('quality') ?? saved
export const quality = { mode: requested in PRESETS ? requested : 'auto', level: 'high', ...PRESETS.high }

function apply(level) {
  quality.level = level
  Object.assign(quality, PRESETS[level])
  for (const notify of listeners) notify()
}
export function setQuality(mode) {
  quality.mode = mode in PRESETS ? mode : 'auto'
  apply(quality.mode === 'auto' ? 'high' : quality.mode)
  try { localStorage.setItem('tea-party-quality', quality.mode) } catch {}
  slowFor = 0
  settleFor = 3000
}
export const onQualityChange = notify => listeners.add(notify)
export function settleInitialQuality(milliseconds){
  if(quality.mode!=='auto')return
  apply(milliseconds>24?'low':milliseconds>16?'medium':'high')
  slowFor=0;settleFor=3000
}
let slowFor = 0, settleFor = 3000
export function updateQuality(milliseconds) {
  if (quality.mode !== 'auto' || document.hidden) return
  if (settleFor > 0) { settleFor -= Math.min(milliseconds, 250); return }
  // Ignore startup compilation and isolated stalls. A sustained slow window
  // reduces one tier; automatic mode never oscillates back and forth.
  slowFor = milliseconds > 28 ? slowFor + Math.min(milliseconds, 250) : Math.max(0, slowFor - milliseconds * 0.5)
  if (slowFor < 5000) return
  const next = quality.level === 'high' ? 'medium' : 'low'
  if (next !== quality.level) apply(next)
  slowFor = 0
  settleFor = 1500
}
apply(quality.mode === 'auto' ? 'high' : quality.mode)
