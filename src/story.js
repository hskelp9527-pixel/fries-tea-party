import { gears, wake } from './garden.js'
import { startExplore } from './explore.js'
import { setFloatingLevel } from './floating.js'
import { playSong } from './song.js'
import { game } from './state.js'

// Starts the chapter. `from` (the ?start= parameter) skips ahead for testing: explore or song.
export async function begin(from) {
  if (from === 'song') {
    for (const g of gears) {
      g.found = true
      g.object.visible = false
      wake(g.layer)
    }
    game.gears = 3
    setFloatingLevel(3)
    return finale()
  }
  startExplore(finale)
}

async function finale() {
  await playSong()
}
