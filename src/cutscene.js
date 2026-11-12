import { player } from './player.js'
import { lens } from './scene.js'
import { game } from './state.js'

const owners = []
export function onSceneCleanup(cleanup) {
  const owner = owners.at(-1)
  if (owner) owner.cleanups.push(cleanup)
  return () => { if (owner) owner.cleanups = owner.cleanups.filter(fn => fn !== cleanup) }
}

// One owner for scripted input. A failed action must always leave exploration usable.
export async function runScene(action, { resume = true } = {}) {
  const owner = { cleanups: [] }
  owners.push(owner)
  game.sceneDepth++
  player.control = false
  let failed = false
  try {
    return await action()
  } catch (error) {
    failed = true
    throw error
  } finally {
    for (const cleanup of owner.cleanups.reverse()) {
      try { await cleanup(failed) } catch (error) { console.error('Scene cleanup failed', error) }
    }
    owners.splice(owners.indexOf(owner), 1)
    game.sceneDepth = Math.max(0, game.sceneDepth - 1)
    if (!game.sceneDepth) { game.sceneSkipping = false; game.sceneRate = 1 }
    if (resume || failed) {
      player.control = true
      player.cinematic = false
      lens.target = null
      player.nod = 0
      document.getElementById('prompt').textContent = ''
      document.getElementById('task-hint').textContent = ''
    }
  }
}
