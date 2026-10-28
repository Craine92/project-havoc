import type { GameCard } from '@project-havoc/game-core'

import { isCardPlayable } from './engine.js'
import type {
  ClassicAllowedAction,
  ClassicGameState,
  ClassicPlayerProjection,
  ClassicPublicProjection,
} from './types.js'

function topCard(state: ClassicGameState): GameCard {
  const card = state.discardPile[state.discardPile.length - 1]
  if (!card) throw new Error('Classic discard pile invariant failed')
  return card
}

export function projectClassicPublicState(state: ClassicGameState): ClassicPublicProjection {
  const activePlayer = state.players[state.activePlayerIndex]
  const decisionPlayerId = state.phase === 'finished'
    ? null
    : state.turn.kind === 'draw-four-decision'
      ? state.turn.victimPlayerId
      : (activePlayer?.playerId ?? null)

  return {
    phase: state.phase,
    revision: state.revision,
    players: state.players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      cardCount: player.hand.length,
    })),
    activePlayerId: state.phase === 'finished' ? null : (activePlayer?.playerId ?? null),
    activeColor: state.activeColor,
    direction: state.direction,
    topCard: topCard(state),
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    turn: state.phase === 'finished' ? 'finished' : state.turn.kind,
    decisionPlayerId,
    winnerPlayerId: state.winnerPlayerId,
    lastEvent: state.lastEvent,
  }
}

export function projectClassicPlayerState(state: ClassicGameState, viewerPlayerId: string): ClassicPlayerProjection {
  const publicState = projectClassicPublicState(state)
  const viewer = state.players.find((player) => player.playerId === viewerPlayerId)
  if (!viewer) throw new Error(`Unknown Classic player: ${viewerPlayerId}`)

  const isDecisionPlayer = publicState.decisionPlayerId === viewerPlayerId
  const allowedActions: ClassicAllowedAction[] = []
  let playableCardIds: string[] = []
  let requiredDecision: ClassicPlayerProjection['requiredDecision'] = 'none'

  if (state.phase === 'playing' && isDecisionPlayer) {
    if (state.turn.kind === 'awaiting-action') {
      if (state.drawPile.length > 0 || state.discardPile.length > 1) allowedActions.push('draw-card')
      playableCardIds = viewer.hand
        .filter((card) => isCardPlayable(card, state.activeColor, topCard(state)))
        .map((card) => card.id)
      if (playableCardIds.length > 0) allowedActions.unshift('play-card')
    } else if (state.turn.kind === 'drawn-card-decision') {
      requiredDecision = 'drawn-card'
      allowedActions.push('play-drawn-card', 'keep-drawn-card')
      playableCardIds = [state.turn.cardId]
    } else {
      requiredDecision = 'draw-four'
      allowedActions.push('accept-draw-four', 'challenge-draw-four')
    }
  }

  return {
    ...publicState,
    viewerPlayerId,
    hand: [...viewer.hand],
    allowedActions,
    playableCardIds,
    requiredDecision,
  }
}
