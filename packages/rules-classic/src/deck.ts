import { CARD_COLORS, type GameCard, type NumberCardValue } from '@project-havoc/game-core'

const NUMBER_VALUES: readonly NumberCardValue[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const ACTION_KINDS = ['skip', 'reverse', 'draw-two'] as const

export const CLASSIC_DECK_SIZE = 108

export function createClassicDeck(): GameCard[] {
  const cards: GameCard[] = []
  for (const color of CARD_COLORS) {
    for (const value of NUMBER_VALUES) {
      const copies = value === 0 ? 1 : 2
      for (let copy = 1; copy <= copies; copy += 1) {
        cards.push({ id: `${color}-number-${value}-${copy}`, kind: 'number', color, value })
      }
    }
    for (const kind of ACTION_KINDS) {
      for (let copy = 1; copy <= 2; copy += 1) cards.push({ id: `${color}-${kind}-${copy}`, kind, color })
    }
  }
  for (let copy = 1; copy <= 4; copy += 1) {
    cards.push({ id: `wild-${copy}`, kind: 'wild' })
    cards.push({ id: `wild-draw-four-${copy}`, kind: 'wild-draw-four' })
  }
  if (cards.length !== CLASSIC_DECK_SIZE) throw new Error(`Classic deck invariant failed: ${cards.length}`)
  return cards
}

