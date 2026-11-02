import { gears, wake } from './garden.js'
import { startExplore } from './explore.js'
import { game } from './state.js'
import { setFloatingLevel } from './floating.js'

// Starts the chapter. `from` (the ?start= parameter) skips ahead for testing: explore, song or ending.
export async function begin(from) {
  if (from === 'song' || from === 'ending') {
    for (const g of gears) {
      g.found = true
      g.object.visible = false
      wake(g.layer)
    }
    game.gears = 3
    setFloatingLevel(3)
  }
  startExplore(async () => {})
}
