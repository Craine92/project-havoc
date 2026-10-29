import { describe, expect, it } from 'vitest'

import { createClassicDeck } from './deck.js'
import { projectClassicPlayerState, projectClassicPublicState } from './projections.js'
import type { ClassicGameState } from './types.js'

function privateState(): ClassicGameState {
  const cards = createClassicDeck()
  const take = (id: string) => {
    const index = cards.findIndex((card) => card.id === id)
    const card = cards.splice(index, 1)[0]
    if (!card) throw new Error(id)
    return card
  }
  return {
    phase: 'playing', revision: 4,
    players: [
      { playerId: 'p1', name: 'One', hand: [take('red-number-1-1'), take('wild-1')] },
      { playerId: 'p2', name: 'Two', hand: [take('blue-number-2-1')] },
    ],
    drawPile: cards,
    discardPile: [take('red-number-5-1')],
    activeColor: 'red', direction: 1, activePlayerIndex: 1,
    turn: {
      kind: 'draw-four-decision', offenderPlayerId: 'p1', victimPlayerId: 'p2',
      wasLegal: false, pendingWinnerPlayerId: null,
    },
    winnerPlayerId: null, lastEvent: { type: 'game-started', at: 1 }, updatedAt: 2,
  }
}

describe('Classic projections', () => {
  it('does not expose hands, draw order, or private draw-four legality publicly', () => {
    const projected = projectClassicPublicState(privateState())
    const serialized = JSON.stringify(projected)
    expect(serialized).not.toContain('wasLegal')
    expect(serialized).not.toContain('red-number-1-1')
    expect(serialized).not.toContain('blue-number-2-1')
    expect(projected.players.map((player) => player.cardCount)).toEqual([2, 1])
    expect(projected.decisionPlayerId).toBe('p2')
  })

  it('shows only the viewer hand and only their currently valid decision class', () => {
    const state = privateState()
    const victim = projectClassicPlayerState(state, 'p2')
    expect(victim.hand.map((card) => card.id)).toEqual(['blue-number-2-1'])
    expect(victim.allowedActions).toEqual(['accept-draw-four', 'challenge-draw-four'])
    expect(victim.requiredDecision).toBe('draw-four')
    expect(JSON.stringify(victim)).not.toContain('wasLegal')

    const offender = projectClassicPlayerState(state, 'p1')
    expect(offender.allowedActions).toEqual([])
    expect(JSON.stringify(offender)).not.toContain('blue-number-2-1')
  })
})
