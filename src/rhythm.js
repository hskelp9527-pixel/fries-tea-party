// Scoring uses the audio clock, independent of rendering speed or key repeat.
export function createRhythm(notes, window = 0.09) {
  const judged = new Set()
  const stats = { hits: 0, misses: 0, stray: 0, combo: 0, best: 0, total: notes.length }
  let expired = 0
  return {
    stats,
    cue(time) {
      const index = notes.findIndex((at, i) => !judged.has(i) && at + window >= time)
      const remaining = index < 0 ? Infinity : notes[index] - time
      return { index, remaining, open: Math.abs(remaining) <= window }
    },
    tap(time) {
      if (time < notes[0] - window) return null
      const note = notes.findIndex((at, i) => !judged.has(i) && Math.abs(time - at) <= window)
      if (note < 0) { stats.misses++; stats.stray++; stats.combo = 0; return false }
      judged.add(note)
      stats.hits++
      stats.best = Math.max(stats.best, ++stats.combo)
      return true
    },
    update(time) {
      while (expired < notes.length && notes[expired] + window < time) {
        if (!judged.has(expired)) { judged.add(expired); stats.misses++; stats.combo = 0 }
        expired++
      }
    },
    strength: () => stats.total ? stats.hits / (stats.total + stats.stray) : 0,
  }
}
