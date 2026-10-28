import { createSeededRandom, type CardColor, type Clock, type GameCard } from '@project-havoc/game-core'
import { describe, expect, it } from 'vitest'

import { createClassicDeck } from './deck.js'
import { applyClassicAction, initializeClassicGame, validateClassicInvariants } from './engine.js'
import type { ClassicGameState, ClassicServices, ClassicTurnState } from './types.js'

class TestClock implements Clock {
  private value = 100
  now(): number { return this.value++ }
}

function services(seed = 1): ClassicServices {
  return { random: createSeededRandom(seed), clock: new TestClock() }
}

interface StateOptions {
  hands?: readonly (readonly string[])[]
  top?: string
  activeColor?: CardColor
  activePlayerIndex?: number
  direction?: 1 | -1
  turn?: ClassicTurnState
}

function stateWith(options: StateOptions = {}): ClassicGameState {
  const deck = createClassicDeck()
  const take = (id: string): GameCard => {
    const index = deck.findIndex((card) => card.id === id)
    if (index < 0) throw new Error(`Missing fixture card: ${id}`)
    const card = deck.splice(index, 1)[0]
    if (!card) throw new Error(`Missing fixture card: ${id}`)
    return card
  }
  const handIds = options.hands ?? [['red-number-1-1', 'blue-number-3-1'], ['yellow-number-2-1']]
  const players = handIds.map((ids, index) => ({
    playerId: `p${index + 1}`,
    name: `Player ${index + 1}`,
    hand: ids.map(take),
  }))
  const top = take(options.top ?? 'red-number-5-1')
  return {
    phase: 'playing',
    revision: 0,
    players,
    drawPile: deck,
    discardPile: [top],
    activeColor: options.activeColor ?? ('color' in top ? top.color : 'red'),
    direction: options.direction ?? 1,
    activePlayerIndex: options.activePlayerIndex ?? 0,
    turn: options.turn ?? { kind: 'awaiting-action' },
    winnerPlayerId: null,
    lastEvent: { type: 'game-started', at: 99 },
    updatedAt: 99,
  }
}

function expectAccepted(result: ReturnType<typeof applyClassicAction>): ClassicGameState {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.code)
  expect(validateClassicInvariants(result.state)).toEqual([])
  return result.state
}

describe('Classic initialization', () => {
  it.each([2, 3, 4, 5, 6, 7, 8])('deals seven cards to %i players', (count) => {
    let initialized: ReturnType<typeof initializeClassicGame> | undefined
    for (let seed = 1; seed < 100 && !initialized?.ok; seed += 1) {
      initialized = initializeClassicGame(
        Array.from({ length: count }, (_, index) => ({ playerId: `p${index}`, name: `P${index}` })),
        services(seed),
      )
    }
    expect(initialized?.ok).toBe(true)
    if (!initialized?.ok) return
    expect(initialized.state.players.every((player) => player.hand.length === 7)).toBe(true)
    expect(validateClassicInvariants(initialized.state)).toEqual([])
  })

  it('rejects invalid rosters and explicitly blocks an undecided opening-card policy', () => {
    expect(initializeClassicGame([{ playerId: 'p1', name: 'P1' }], services()).ok).toBe(false)
    expect(initializeClassicGame([
      { playerId: 'same', name: 'P1' }, { playerId: 'same', name: 'P2' },
    ], services()).ok).toBe(false)

    let blocked: ReturnType<typeof initializeClassicGame> | undefined
    for (let seed = 1; seed < 1000; seed += 1) {
      const result = initializeClassicGame([
        { playerId: 'p1', name: 'P1' }, { playerId: 'p2', name: 'P2' },
      ], services(seed))
      if (!result.ok && result.error.code === 'OPENING_CARD_RULE_UNDECIDED') { blocked = result; break }
    }
    expect(blocked).toMatchObject({ ok: false, error: { code: 'OPENING_CARD_RULE_UNDECIDED' } })
  })
})

describe('Classic turn rules', () => {
  it('plays by color, number, symbol, and wild color choice', () => {
    const cases = [
      stateWith({ hands: [['red-number-1-1', 'blue-number-3-1'], ['yellow-number-2-1']] }),
      stateWith({ hands: [['blue-number-5-1', 'blue-number-3-1'], ['yellow-number-2-1']] }),
      stateWith({ hands: [['blue-skip-1', 'blue-number-3-1'], ['yellow-number-2-1']], top: 'red-skip-1' }),
    ]
    for (const state of cases) {
      const cardId = state.players[0]?.hand[0]?.id ?? ''
      expect(applyClassicAction(state, { type: 'play-card', playerId: 'p1', cardId }, services()).ok).toBe(true)
    }
    const wildState = stateWith({ hands: [['wild-1', 'blue-number-3-1'], ['yellow-number-2-1']] })
    const played = expectAccepted(applyClassicAction(wildState, {
      type: 'play-card', playerId: 'p1', cardId: 'wild-1', chosenColor: 'green',
    }, services()))
    expect(played.activeColor).toBe('green')
  })

  it('rejects invalid, foreign, and malformed plays without mutating state', () => {
    const state = stateWith()
    const snapshot = structuredClone(state)
    expect(applyClassicAction(state, { type: 'play-card', playerId: 'p1', cardId: 'blue-number-3-1' }, services()))
      .toMatchObject({ ok: false, error: { code: 'CARD_NOT_PLAYABLE' } })
    expect(applyClassicAction(state, { type: 'play-card', playerId: 'p1', cardId: 'yellow-number-2-1' }, services()))
      .toMatchObject({ ok: false, error: { code: 'CARD_NOT_OWNED' } })
    expect(applyClassicAction(stateWith({ hands: [['wild-1'], ['yellow-number-2-1']] }), {
      type: 'play-card', playerId: 'p1', cardId: 'wild-1',
    }, services())).toMatchObject({ ok: false, error: { code: 'COLOR_REQUIRED' } })
    expect(state).toEqual(snapshot)
  })

  it('lets only the freshly drawn playable card be played or kept', () => {
    const initial = stateWith()
    const drawn = expectAccepted(applyClassicAction(initial, { type: 'draw-card', playerId: 'p1' }, services()))
    expect(drawn.turn.kind).toBe('drawn-card-decision')
    if (drawn.turn.kind !== 'drawn-card-decision') return
    expect(applyClassicAction(drawn, {
      type: 'play-card', playerId: 'p1', cardId: 'red-number-1-1',
    }, services())).toMatchObject({ ok: false, error: { code: 'DRAWN_CARD_ONLY' } })
    const kept = expectAccepted(applyClassicAction(drawn, { type: 'keep-drawn-card', playerId: 'p1' }, services()))
    expect(kept.activePlayerIndex).toBe(1)
  })

  it('automatically ends the turn after drawing an unplayable card', () => {
    const state = stateWith()
    const drawPile = [...state.drawPile]
    const unplayableIndex = drawPile.findIndex((card) => card.id === 'green-number-9-1')
    const unplayable = drawPile.splice(unplayableIndex, 1)[0]
    if (!unplayable) throw new Error('fixture')
    drawPile.push(unplayable)
    const result = expectAccepted(applyClassicAction({ ...state, drawPile }, { type: 'draw-card', playerId: 'p1' }, services()))
    expect(result.activePlayerIndex).toBe(1)
    expect(result.turn.kind).toBe('awaiting-action')
  })

  it('applies skip, reverse, two-player reverse-as-skip, and draw-two without stacking', () => {
    const skip = expectAccepted(applyClassicAction(stateWith({
      hands: [['red-skip-1', 'blue-number-3-1'], ['yellow-number-2-1'], ['green-number-4-1']],
    }), { type: 'play-card', playerId: 'p1', cardId: 'red-skip-1' }, services()))
    expect(skip.activePlayerIndex).toBe(2)

    const reverse = expectAccepted(applyClassicAction(stateWith({
      hands: [['red-reverse-1', 'blue-number-3-1'], ['yellow-number-2-1'], ['green-number-4-1']],
    }), { type: 'play-card', playerId: 'p1', cardId: 'red-reverse-1' }, services()))
    expect(reverse.direction).toBe(-1)
    expect(reverse.activePlayerIndex).toBe(2)

    const reverseTwo = expectAccepted(applyClassicAction(stateWith({
      hands: [['red-reverse-1', 'blue-number-3-1'], ['yellow-number-2-1']],
    }), { type: 'play-card', playerId: 'p1', cardId: 'red-reverse-1' }, services()))
    expect(reverseTwo.activePlayerIndex).toBe(0)

    const drawTwoStart = stateWith({ hands: [['red-draw-two-1', 'blue-number-3-1'], ['yellow-draw-two-1']] })
    const drawTwo = expectAccepted(applyClassicAction(drawTwoStart, {
      type: 'play-card', playerId: 'p1', cardId: 'red-draw-two-1',
    }, services()))
    expect(drawTwo.players[1]?.hand).toHaveLength(3)
    expect(drawTwo.activePlayerIndex).toBe(0)
  })
})

describe('draw-four challenge and round completion', () => {
  it('handles accept, successful challenge, and failed challenge authoritatively', () => {
    const illegal = stateWith({ hands: [['wild-draw-four-1', 'red-number-1-1'], ['yellow-number-2-1']] })
    const pending = expectAccepted(applyClassicAction(illegal, {
      type: 'play-card', playerId: 'p1', cardId: 'wild-draw-four-1', chosenColor: 'blue',
    }, services()))
    expect(pending.turn).toMatchObject({ kind: 'draw-four-decision', wasLegal: false })

    const acceptedPenalty = expectAccepted(applyClassicAction(pending, {
      type: 'resolve-draw-four', playerId: 'p2', decision: 'accept',
    }, services()))
    expect(acceptedPenalty.players[1]?.hand).toHaveLength(5)
    expect(acceptedPenalty.activePlayerIndex).toBe(0)

    const challenged = expectAccepted(applyClassicAction(pending, {
      type: 'resolve-draw-four', playerId: 'p2', decision: 'challenge',
    }, services()))
    expect(challenged.players[0]?.hand).toHaveLength(5)
    expect(challenged.activePlayerIndex).toBe(1)

    const legal = stateWith({ hands: [['wild-draw-four-1', 'blue-number-3-1'], ['yellow-number-2-1']] })
    const legalPending = expectAccepted(applyClassicAction(legal, {
      type: 'play-card', playerId: 'p1', cardId: 'wild-draw-four-1', chosenColor: 'green',
    }, services()))
    const failed = expectAccepted(applyClassicAction(legalPending, {
      type: 'resolve-draw-four', playerId: 'p2', decision: 'challenge',
    }, services()))
    expect(failed.players[1]?.hand).toHaveLength(7)
    expect(failed.activePlayerIndex).toBe(0)
  })

  it('resolves a final penalty before declaring the winner and then rejects actions', () => {
    const initial = stateWith({ hands: [['red-draw-two-1'], ['yellow-number-2-1']] })
    const finished = expectAccepted(applyClassicAction(initial, {
      type: 'play-card', playerId: 'p1', cardId: 'red-draw-two-1',
    }, services()))
    expect(finished.phase).toBe('finished')
    expect(finished.winnerPlayerId).toBe('p1')
    expect(finished.players[1]?.hand).toHaveLength(3)
    expect(applyClassicAction(finished, { type: 'draw-card', playerId: 'p1' }, services()))
      .toMatchObject({ ok: false, error: { code: 'GAME_FINISHED' } })
  })

  it('waits for a final draw-four decision before declaring its winner', () => {
    const initial = stateWith({ hands: [['wild-draw-four-1'], ['yellow-number-2-1']] })
    const pending = expectAccepted(applyClassicAction(initial, {
      type: 'play-card', playerId: 'p1', cardId: 'wild-draw-four-1', chosenColor: 'blue',
    }, services()))
    expect(pending.phase).toBe('playing')
    expect(pending.turn).toMatchObject({ kind: 'draw-four-decision', pendingWinnerPlayerId: 'p1' })
    const finished = expectAccepted(applyClassicAction(pending, {
      type: 'resolve-draw-four', playerId: 'p2', decision: 'accept',
    }, services()))
    expect(finished.phase).toBe('finished')
    expect(finished.winnerPlayerId).toBe('p1')
    expect(finished.players[1]?.hand).toHaveLength(5)
  })

  it('keeps revisions deterministic and inputs immutable', () => {
    const initial = stateWith()
    const snapshot = structuredClone(initial)
    const result = expectAccepted(applyClassicAction(initial, {
      type: 'play-card', playerId: 'p1', cardId: 'red-number-1-1',
    }, services()))
    expect(result.revision).toBe(1)
    expect(result.updatedAt).toBe(result.lastEvent.at)
    expect(initial).toEqual(snapshot)
  })
})
