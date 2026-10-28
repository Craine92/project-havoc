import { decisionPlayerId, isPlayableOn } from './engine.js'
import type { ChaosGameState, ChaosPlayerView, ChaosPublicView, HavocCard } from './types.js'

function topCard(state: ChaosGameState): HavocCard {
  const card = state.discardPile[state.discardPile.length - 1]
  if (!card) throw new Error('Discard pile invariant failed')
  return card
}

export function projectChaosPublic(state: ChaosGameState, serverNow: number): ChaosPublicView {
  const turn = state.turn
  const event = state.event
  return {
    phase: state.phase,
    revision: state.revision,
    serverNow,
    players: state.players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      cardCount: player.hand.length,
      havocCalled: player.havocCalled,
    })),
    activePlayerId: state.phase === 'playing' ? (state.players[state.activeIndex]?.playerId ?? null) : null,
    decisionPlayerId: decisionPlayerId(state),
    activeColor: state.activeColor,
    direction: state.direction,
    topCard: topCard(state),
    drawPileCount: state.drawPile.length,
    turn: state.phase === 'finished' ? 'finished' : turn.kind,
    reaction: turn.kind === 'reaction'
      ? { targetId: turn.targetId, sourcePlayerId: turn.sourcePlayerId, amount: turn.amount, source: turn.source, deadline: turn.deadline }
      : null,
    havocCatch: state.havocCatch,
    event: event && serverNow < event.until
      ? {
          seq: event.seq,
          type: event.type,
          startedAt: event.startedAt,
          until: event.until,
          rolls: event.rolls,
          highlightPlayerIds: event.highlightPlayerIds,
          summary: event.summary,
        }
      : null,
    nextEventAt: state.nextEventAt,
    startedAt: state.startedAt,
    finalPhaseAt: state.finalPhaseAt,
    endsAt: state.endsAt,
    finalPhase: state.finalPhase,
    winner: state.winner,
    lastAction: state.lastAction,
    feed: state.feed,
  }
}

export function projectChaosPlayer(state: ChaosGameState, viewerId: string, serverNow: number): ChaosPlayerView | null {
  const viewer = state.players.find((player) => player.playerId === viewerId)
  if (!viewer) return null
  const publicView = projectChaosPublic(state, serverNow)
  const isActive = state.phase === 'playing' && state.players[state.activeIndex]?.playerId === viewerId
  const blocked = publicView.event !== null
  const turn = state.turn
  let playableCardIds: string[] = []
  if (isActive && !blocked && turn.kind === 'play') {
    const top = topCard(state)
    playableCardIds = viewer.hand
      .filter((card) => isPlayableOn(card, state.activeColor, top))
      .filter((card) => !(card.kind === 'chaos' && (card.chaos === 'mutiny' || card.chaos === 'maelstrom') && viewer.hand.length === 1))
      .map((card) => card.id)
  } else if (isActive && !blocked && turn.kind === 'drawn') {
    playableCardIds = [turn.cardId]
  }
  const catchTarget = state.havocCatch && state.havocCatch.playerId !== viewerId && serverNow < state.havocCatch.until
    ? state.havocCatch.playerId
    : null
  const reveal = state.event && serverNow < state.event.until
    ? state.event.reveals.find((candidate) => candidate.viewerId === viewerId) ?? null
    : null
  return {
    ...publicView,
    viewerId,
    hand: viewer.hand,
    playableCardIds,
    canDraw: isActive && !blocked && turn.kind === 'play',
    drawnCardId: isActive && turn.kind === 'drawn' ? turn.cardId : null,
    canCallHavoc: state.phase === 'playing' && !viewer.havocCalled && viewer.hand.length <= 2,
    canCatchPlayerId: catchTarget,
    reactionOptions: turn.kind === 'reaction' && turn.targetId === viewerId
      ? {
          shield: viewer.hand.some((card) => card.kind === 'chaos' && card.chaos === 'lifebuoy'),
          mirror: viewer.hand.some((card) => card.kind === 'chaos' && card.chaos === 'backfire'),
        }
      : null,
    reveal: reveal ? { ownerId: reveal.ownerId, card: reveal.card } : null,
  }
}
