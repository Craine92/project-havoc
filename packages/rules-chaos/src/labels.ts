import type { CardColor } from '@project-havoc/game-core'

import type { ChaosEventType, ChaosKind, HavocCard } from './types.js'

/** Die vier Farben als Edelsteine einer Schatztruhe. */
export const COLOR_LABELS: Readonly<Record<CardColor, string>> = {
  red: 'Rubin',
  yellow: 'Gold',
  green: 'Smaragd',
  blue: 'Saphir',
}

export const CHAOS_LABELS: Readonly<Record<ChaosKind, string>> = {
  mutiny: 'Meuterei',
  maelstrom: 'Strudel',
  'cursed-dice': "Davy Jones' Würfel",
  lifebuoy: 'Rettungsring',
  backfire: 'Kanonenrückschlag',
}

export const CHAOS_ICONS: Readonly<Record<ChaosKind, string>> = {
  mutiny: '⚔',
  maelstrom: '🌀',
  'cursed-dice': '🎲',
  lifebuoy: '🛟',
  backfire: '💥',
}

/** Kurze Erklärung, was eine Chaos-Karte macht. Wird auf TV und Handy angezeigt. */
export const CHAOS_DESCRIPTIONS: Readonly<Record<ChaosKind, string>> = {
  mutiny: 'Tausche deine komplette Hand mit einem Gegner deiner Wahl. Perfekt, wenn jemand fast gewonnen hat!',
  maelstrom: 'Alle Spieler geben ihre ganze Hand an den Nachbarn in Spielrichtung weiter.',
  'cursed-dice': 'Wähle einen Gegner. Ein Würfel entscheidet, ob er 1 oder bis zu 6 Karten ziehen muss.',
  lifebuoy: 'Nicht ausspielen, sondern aufheben! Trifft dich +2, +4 oder der Würfel, wehrst du damit alles ab.',
  backfire: 'Nicht ausspielen, sondern aufheben! Trifft dich eine Strafe, schießt du sie auf einen anderen Spieler zurück.',
}

export const EVENT_ICONS: Readonly<Record<ChaosEventType, string>> = {
  kraken: '🐙',
  storm: '⛈',
  plunder: '💰',
  bottle: '📜',
}

export const EVENT_LABELS: Readonly<Record<ChaosEventType, string>> = {
  kraken: 'Kraken-Angriff',
  storm: 'Sturm zieht auf',
  plunder: 'Plünderung',
  bottle: 'Flaschenpost',
}

/** Kurze Erklärung, was bei einem Ereignis passiert. Ereignisse kommen automatisch alle 3 Minuten. */
export const EVENT_DESCRIPTIONS: Readonly<Record<ChaosEventType, string>> = {
  kraken: 'Alle würfeln. Der Höchste wirft eine Karte ab, der Niedrigste wird gepackt und zieht eine Karte.',
  storm: 'Die Farbe auf dem Tisch wechselt zufällig. Plötzlich passt deine Hand vielleicht nicht mehr!',
  plunder: 'Jeder gibt eine zufällige Karte an seinen Nachbarn in Spielrichtung weiter.',
  bottle: 'Jeder sieht auf seinem Handy heimlich eine Karte eines Gegners.',
}

/** Die normalen Sonderkarten mit ihren Piratennamen. */
export const SPECIAL_CARD_GUIDE: readonly { readonly icon: string; readonly name: string; readonly text: string }[] = [
  { icon: '⊘', name: 'Aussetzen', text: 'Der nächste Spieler setzt aus.' },
  { icon: '⇄', name: 'Kurswechsel', text: 'Die Spielrichtung dreht sich um.' },
  { icon: '+2', name: 'Enterhaken', text: 'Der nächste Spieler zieht 2 Karten.' },
  { icon: '🧭', name: 'Kompass', text: 'Passt immer. Du wählst die neue Farbe.' },
  { icon: '+4', name: 'Breitseite', text: 'Passt immer. Du wählst die Farbe, der Nächste zieht 4.' },
]

export const HAVOC_RULE = 'Hast du nur noch 2 Karten, drück HAVOC! Vergisst du es, können dich die anderen 5 Sekunden lang erwischen: +2 Karten.'

export function colorLabel(color: CardColor): string {
  return COLOR_LABELS[color]
}

export function cardLabel(card: HavocCard): string {
  switch (card.kind) {
    case 'number': return `${COLOR_LABELS[card.color]} ${card.value}`
    case 'skip': return `${COLOR_LABELS[card.color]} Aussetzen`
    case 'reverse': return `${COLOR_LABELS[card.color]} Kurswechsel`
    case 'draw-two': return `${COLOR_LABELS[card.color]} +2`
    case 'wild': return 'Kompass'
    case 'wild-draw-four': return 'Breitseite +4'
    case 'chaos': return CHAOS_LABELS[card.chaos]
  }
}
