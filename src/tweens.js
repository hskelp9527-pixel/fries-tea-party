// Tweens and waits driven by the game loop, so cutscenes run on game time.
const active = new Set()

// Calls fn(t) every frame with t going from 0 to 1 over `seconds`, then resolves.
export function tween(seconds, fn = () => {}) {
  return new Promise(resolve => active.add({ elapsed: 0, seconds, fn, resolve }))
}

export const wait = seconds => tween(seconds)

export function updateTweens(dt) {
  for (const t of active) {
    t.elapsed = Math.min(t.seconds, t.elapsed + dt)
    t.fn(t.seconds ? t.elapsed / t.seconds : 1)
    if (t.elapsed === t.seconds) {
      active.delete(t)
      t.resolve()
    }
  }
}
