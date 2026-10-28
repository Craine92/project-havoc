import { describe, expect, it } from 'vitest'

import { CLASSIC_DECK_SIZE, createClassicDeck } from './deck.js'

describe('Classic deck', () => {
  it('contains the exact 108-card distribution with stable unique IDs', () => {
    const cards = createClassicDeck()

    expect(cards).toHaveLength(CLASSIC_DECK_SIZE)
    expect(new Set(cards.map((card) => card.id)).size).toBe(CLASSIC_DECK_SIZE)
    for (const color of ['red', 'yellow', 'green', 'blue'] as const) {
      const colored = cards.filter((card) => 'color' in card && card.color === color)
      expect(colored).toHaveLength(25)
      expect(colored.filter((card) => card.kind === 'number' && card.value === 0)).toHaveLength(1)
      for (let value = 1; value <= 9; value += 1) {
        expect(colored.filter((card) => card.kind === 'number' && card.value === value)).toHaveLength(2)
      }
      for (const kind of ['skip', 'reverse', 'draw-two'] as const) {
        expect(colored.filter((card) => card.kind === kind)).toHaveLength(2)
      }
    }
    expect(cards.filter((card) => card.kind === 'wild')).toHaveLength(4)
    expect(cards.filter((card) => card.kind === 'wild-draw-four')).toHaveLength(4)
  })
})
