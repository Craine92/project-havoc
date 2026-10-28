import { CARD_COLORS, type GameCard, type NumberCardValue } from '@project-havoc/game-core'

import type { ChaosKind, HavocCard } from './types.js'

const NUMBER_VALUES: readonly NumberCardValue[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const ACTION_KINDS = ['skip', 'reverse', 'draw-two'] as const

export const CHAOS_KINDS: readonly ChaosKind[] = ['mutiny', 'maelstrom', 'cursed-dice', 'lifebuoy', 'backfire']
/** Jede Chaos-Karte liegt dreimal im Deck, damit in jeder Runde wirklich Chaos passiert. */
export const CHAOS_COPIES = 3
export const CHAOS_DECK_SIZE = 108 + CHAOS_KINDS.length * CHAOS_COPIES

export function createChaosDeck(): HavocCard[] {
  const cards: HavocCard[] = []
  for (const color of CARD_COLORS) {
    for (const value of NUMBER_VALUES) {
      const copies = value === 0 ? 1 : 2
      for (let copy = 1; copy <= copies; copy += 1) cards.push({ id: `${color}-number-${value}-${copy}`, kind: 'number', color, value })
    }
    for (const kind of ACTION_KINDS) {
      for (let copy = 1; copy <= 2; copy += 1) cards.push({ id: `${color}-${kind}-${copy}`, kind, color })
    }
  }
  for (let copy = 1; copy <= 4; copy += 1) {
    cards.push({ id: `wild-${copy}`, kind: 'wild' })
    cards.push({ id: `wild-draw-four-${copy}`, kind: 'wild-draw-four' })
  }
  for (const chaos of CHAOS_KINDS) {
    for (let copy = 1; copy <= CHAOS_COPIES; copy += 1) cards.push({ id: `chaos-${chaos}-${copy}`, kind: 'chaos', chaos })
  }
  if (cards.length !== CHAOS_DECK_SIZE) throw new Error(`Chaos deck invariant failed: ${cards.length}`)
  return cards
}

/** Kartenwert für die Zeitentscheidung bei Minute 25. */
export function cardScore(card: HavocCard): number {
  if (card.kind === 'number') return card.value
  if (card.kind === 'skip' || card.kind === 'reverse' || card.kind === 'draw-two') return 20
  return 50
}

export function isColoredCard(card: HavocCard): card is Extract<GameCard, { color: unknown }> {
  return 'color' in card
}
