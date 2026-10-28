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

export const CHAOS_DESCRIPTIONS: Readonly<Record<ChaosKind, string>> = {
  mutiny: 'Tausche deine komplette Hand mit einem Gegner.',
  maelstrom: 'Alle Hände wandern eine Position weiter.',
  'cursed-dice': 'Ein Gegner zieht 1–6 Karten, der Würfel entscheidet.',
  lifebuoy: 'Wehrt eine Ziehstrafe komplett ab.',
  backfire: 'Lenkt eine Ziehstrafe auf einen anderen Spieler um.',
}

export const EVENT_LABELS: Readonly<Record<ChaosEventType, string>> = {
  kraken: 'Kraken-Angriff',
  storm: 'Sturm zieht auf',
  plunder: 'Plünderung',
  bottle: 'Flaschenpost',
}

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
