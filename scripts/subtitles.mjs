// Reads the voice-line tables in docs/script.md and writes the English subtitles (src/lang/en.json)
// and who speaks each line (src/speakers.json). Run with `npm run subtitles` after editing the script.
import { readFileSync, writeFileSync } from 'node:fs'

const text = {}, speakers = {}
for (const row of readFileSync('docs/script.md', 'utf8').split('\n')) {
  // | ID | Speaker | Trigger | English | Delivery |
  const cells = row.split('|').slice(1, -1).map(cell => cell.trim())
  if (cells.length !== 5 || !/^[A-Z]{2}-\d\d$/.test(cells[0])) continue
  text[cells[0]] = cells[3]
  speakers[cells[0]] = cells[1].split(' ').pop().toLowerCase() // Hatter, March Hare, Dormouse, Fries
}
writeFileSync('src/lang/en.json', JSON.stringify(text, null, 2) + '\n')
writeFileSync('src/speakers.json', JSON.stringify(speakers, null, 2) + '\n')
console.log(`${Object.keys(text).length} lines`)
