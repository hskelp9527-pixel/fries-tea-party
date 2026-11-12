const status = document.getElementById('loading-status')
const progress = document.getElementById('loading-progress')

export function loading(message, loaded, total) {
  if (status) status.textContent = tr(message)
  if (progress && total) { progress.max = total; progress.value = loaded }
}

export function ready() {
  document.getElementById('start')?.setAttribute('aria-busy', 'false')
  document.getElementById('loading')?.remove()
  document.getElementById('start-label').textContent = tr('Enter the garden')
  document.getElementById('start-label').disabled = false
}
import { tr } from './i18n.js'
