// Tweens and waits driven by the game loop, so cutscenes run on game time.
import { game } from './state.js'
const active = new Set()

// Calls fn(t) every frame with t going from 0 to 1 over `seconds`, then resolves.
export function tween(seconds, fn = () => {}) {
  return new Promise((resolve, reject) => active.add({ elapsed: 0, seconds: Math.max(0, seconds), fn, resolve, reject }))
}

export const wait = seconds => tween(seconds)

export function updateTweens(dt) {
  if (game.paused) return
  for (const t of active) {
    t.elapsed = game.sceneSkipping && !game.miniGame ? t.seconds : Math.min(t.seconds, t.elapsed + dt * game.sceneRate)
    try { t.fn(t.seconds ? t.elapsed / t.seconds : 1) }
    catch (error) { active.delete(t); t.reject(error); continue }
    if (t.elapsed === t.seconds) {
      active.delete(t)
      t.resolve()
    }
  }
}

// Skip reaches every authored end state rather than abandoning pending promises.
export function requestSceneSkip() {
  if (!game.sceneDepth || game.miniGame || game.paused) return false
  game.sceneSkipping = true
  return true
}
export async function withSceneRate(rate, action) {
  const previous = game.sceneRate
  game.sceneRate = rate
  try { return await action() }
  finally { game.sceneRate = previous }
}
