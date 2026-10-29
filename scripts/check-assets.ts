// Zeigt, welche Bilder, Sounds und Stimmen schon da sind und welche noch fehlen.
// Aufruf: npm run assets:check
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../apps/tv/public/assets')

const groups: Record<string, readonly string[]> = {
  'Bilder – allgemein': ['img/logo.png', 'img/table.jpg'],
  'Bilder – Karten': [
    'img/cards/back.png', 'img/cards/compass.png', 'img/cards/broadside.png',
    'img/cards/mutiny.png', 'img/cards/maelstrom.png', 'img/cards/cursed-dice.png', 'img/cards/lifebuoy.png', 'img/cards/backfire.png',
  ],
  'Bilder – Ereignisse': ['img/events/kraken.png', 'img/events/storm.png', 'img/events/plunder.png', 'img/events/bottle.png'],
  Soundeffekte: [
    'sfx/shuffle.mp3', 'sfx/card-play.mp3', 'sfx/card-draw.mp3', 'sfx/penalty.mp3', 'sfx/shield.mp3', 'sfx/cannon.mp3', 'sfx/swords.mp3',
    'sfx/whirlpool.mp3', 'sfx/dice.mp3', 'sfx/ship-bell.mp3', 'sfx/kraken.mp3', 'sfx/thunder.mp3', 'sfx/coins.mp3', 'sfx/bottle.mp3',
  ],
  Stimmen: ['voice/havoc.mp3', 'voice/caught.mp3', 'voice/win.mp3', 'voice/final.mp3', 'voice/event.mp3', 'voice/mutiny.mp3', 'voice/dice.mp3'],
  Musik: ['music/theme.mp3'],
}

let done = 0
let total = 0
for (const [group, files] of Object.entries(groups)) {
  console.log(`\n${group}`)
  for (const file of files) {
    total += 1
    const present = existsSync(resolve(root, file))
    if (present) done += 1
    console.log(`  ${present ? '✅' : '⬜'} ${file}`)
  }
}
console.log(`\n${done} von ${total} Dateien vorhanden. Fehlende Dateien sind kein Problem – das Spiel läuft trotzdem.\n`)
