import { CARD_COLORS, createSeededRandom } from '@project-havoc/game-core'
import { describe, expect, it } from 'vitest'

import { CHAOS_DECK_SIZE, createChaosDeck } from './deck.js'
import { applyChaosAction, cardNeedsColor, cardNeedsTarget, initializeChaosGame, tickChaosGame } from './engine.js'
import { projectChaosPlayer, projectChaosPublic } from './projections.js'
import type { ChaosAction, ChaosGameState, ChaosServices } from './types.js'

function setup(seed: number, players = 4): { state: ChaosGameState; services: ChaosServices; clock: { t: number } } {
  const clock = { t: 1_000_000 }
  const services: ChaosServices = { random: createSeededRandom(seed), clock: { now: () => clock.t } }
  const ids = Array.from({ length: players }, (_, index) => ({ playerId: `player_${index}`, name: `Pirat ${index}` }))
  const result = initializeChaosGame(ids, services)
  if (!result.ok) throw new Error(result.message)
  return { state: result.state, services, clock }
}

function cardTotal(state: ChaosGameState): number {
  return state.drawPile.length + state.discardPile.length + state.players.reduce((sum, player) => sum + player.hand.length, 0)
}

/** Ein simpler Bot, der für jede Situation eine gültige Aktion wählt. */
function botAction(state: ChaosGameState, random: () => number, now: number): ChaosAction | null {
  if (state.turn.kind === 'reaction') {
    const view = projectChaosPlayer(state, state.turn.targetId, now)
    const other = state.players.find((player) => player.playerId !== view?.viewerId)
    if (view?.reactionOptions?.mirror && other && random() < 0.5) return { type: 'react', playerId: view.viewerId, choice: 'mirror', targetId: other.playerId }
    if (view?.reactionOptions?.shield && random() < 0.7) return { type: 'react', playerId: view.viewerId, choice: 'shield' }
    return view ? { type: 'react', playerId: view.viewerId, choice: 'accept' } : null
  }
  const active = state.players[state.activeIndex]
  if (!active) return null
  const view = projectChaosPlayer(state, active.playerId, now)
  if (!view) return null
  if (view.canCallHavoc && random() < 0.6) return { type: 'havoc', playerId: active.playerId }
  const cardId = view.playableCardIds[Math.floor(random() * view.playableCardIds.length)]
  if (cardId) {
    const card = view.hand.find((candidate) => candidate.id === cardId)
    if (!card) return null
    const target = state.players.find((player) => player.playerId !== active.playerId)
    return {
      type: 'play',
      playerId: active.playerId,
      cardId,
      ...(cardNeedsColor(card) ? { color: CARD_COLORS[Math.floor(random() * 4)] ?? 'red' } : {}),
      ...(cardNeedsTarget(card) && target ? { targetId: target.playerId } : {}),
    }
  }
  if (view.drawnCardId) return { type: 'keep', playerId: active.playerId }
  if (view.canDraw) return { type: 'draw', playerId: active.playerId }
  return null
}

describe('Chaos-Engine', () => {
  it('baut ein Deck mit 123 eindeutigen Karten', () => {
    const deck = createChaosDeck()
    expect(deck).toHaveLength(CHAOS_DECK_SIZE)
    expect(new Set(deck.map((card) => card.id)).size).toBe(CHAOS_DECK_SIZE)
  })

  it('startet immer mit einer Zahlenkarte und sieben Handkarten', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const { state } = setup(seed, 8)
      expect(state.discardPile.at(-1)?.kind).toBe('number')
      expect(state.players.every((player) => player.hand.length === 7)).toBe(true)
    }
  })

  it('verrät fremde Handkarten nicht in der öffentlichen oder fremden Ansicht', () => {
    const { state } = setup(7)
    const publicView = projectChaosPublic(state, 0)
    expect(JSON.stringify(publicView)).not.toContain('"hand"')
    const view = projectChaosPlayer(state, 'player_0', 0)
    expect(view?.hand).toEqual(state.players[0]?.hand)
  })

  it('erlaubt nur dem aktiven Spieler zu ziehen', () => {
    const { state, services } = setup(3)
    const other = state.players[(state.activeIndex + 1) % state.players.length]
    const result = applyChaosAction(state, { type: 'draw', playerId: other?.playerId ?? '' }, services)
    expect(result.ok).toBe(false)
  })

  it('spielt 300 komplette Bot-Partien ohne Kartenverlust bis zu einem Sieger', () => {
    const results = { empty: 0, time: 0, events: 0 }
    for (let seed = 1; seed <= 300; seed += 1) {
      const game = setup(seed, 2 + (seed % 7))
      const { services, clock } = game
      let state = game.state
      const botRandom = createSeededRandom(seed * 31)
      let guard = 0
      while (state.phase === 'playing' && guard < 5_000) {
        guard += 1
        clock.t += 4_000
        const ticked = tickChaosGame(state, services)
        if (ticked) {
          if (ticked.lastAction.kind === 'event') results.events += 1
          state = ticked
        }
        if (state.phase !== 'playing') break
        if (state.havocCatch && botRandom.next() < 0.3) {
          const catcher = state.players.find((player) => player.playerId !== state.havocCatch?.playerId)
          const caught = applyChaosAction(state, { type: 'catch', playerId: catcher?.playerId ?? '', targetId: state.havocCatch.playerId }, services)
          if (caught.ok) state = caught.state
        }
        const action = botAction(state, () => botRandom.next(), clock.t)
        if (!action) continue
        const result = applyChaosAction(state, action, services)
        if (result.ok) state = result.state
        expect(cardTotal(state)).toBe(CHAOS_DECK_SIZE)
      }
      expect(state.phase).toBe('finished')
      expect(state.winner).not.toBeNull()
      if (state.winner?.reason === 'empty') {
        results.empty += 1
        expect(state.players.find((player) => player.playerId === state.winner?.playerId)?.hand).toHaveLength(0)
      } else results.time += 1
    }
    expect(results.empty).toBeGreaterThan(0)
    expect(results.events).toBeGreaterThan(0)
  })
})
