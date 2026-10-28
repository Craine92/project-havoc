import { CARD_COLORS, shuffle, type CardColor, type GameCard } from '@project-havoc/game-core'

import { CLASSIC_DECK_SIZE, createClassicDeck } from './deck.js'
import type {
  ClassicAction,
  ClassicDirection,
  ClassicErrorCode,
  ClassicGameState,
  ClassicInitializationResult,
  ClassicPlayerIdentity,
  ClassicPublicEvent,
  ClassicResult,
  ClassicServices,
  ClassicTurnState,
} from './types.js'

const CLASSIC_CARD_IDS = new Set(createClassicDeck().map((card) => card.id))

interface MutablePlayer {
  playerId: string
  name: string
  hand: GameCard[]
}

interface MutableState {
  phase: 'playing' | 'finished'
  revision: number
  players: MutablePlayer[]
  drawPile: GameCard[]
  discardPile: GameCard[]
  activeColor: CardColor
  direction: ClassicDirection
  activePlayerIndex: number
  turn: ClassicTurnState
  winnerPlayerId: string | null
  lastEvent: ClassicPublicEvent
  updatedAt: number
}

const ERROR_MESSAGES: Readonly<Record<ClassicErrorCode, string>> = {
  INVALID_PLAYER_COUNT: 'Classic requires between two and eight players.',
  DUPLICATE_PLAYER_ID: 'Player IDs must be unique.',
  OPENING_CARD_RULE_UNDECIDED: 'The opening action or wild card policy requires a Game Director decision.',
  GAME_FINISHED: 'The Classic round has already finished.',
  NOT_YOUR_TURN: 'Only the current decision player may act.',
  WRONG_TURN_STATE: 'This action is not allowed in the current turn state.',
  CARD_NOT_OWNED: 'The selected card is not in the acting player hand.',
  CARD_NOT_PLAYABLE: 'The selected card does not match the active color, value, or symbol.',
  DRAWN_CARD_ONLY: 'Only the freshly drawn card may be played now.',
  COLOR_REQUIRED: 'A wild card requires one of the four active colors.',
  UNEXPECTED_COLOR: 'A colored card must not provide a color choice.',
  DRAW_PILE_EXHAUSTED: 'No card can be drawn or recycled.',
  INVALID_DRAW_FOUR_ACTOR: 'Only the affected draw-four victim may decide.',
  CARD_INVARIANT_VIOLATION: 'The card zones do not form one valid Classic deck.',
}

function rejected(code: ClassicErrorCode): ClassicResult {
  return { ok: false, error: { code, message: ERROR_MESSAGES[code] } }
}

function playerAt(state: MutableState | ClassicGameState, index: number): MutablePlayer | ClassicGameState['players'][number] {
  const player = state.players[index]
  if (!player) throw new Error(`Player index invariant failed: ${index}`)
  return player
}

function mutablePlayerAt(state: MutableState, index: number): MutablePlayer {
  const player = state.players[index]
  if (!player) throw new Error(`Player index invariant failed: ${index}`)
  return player
}

function topCard(state: MutableState | ClassicGameState): GameCard {
  const card = state.discardPile[state.discardPile.length - 1]
  if (!card) throw new Error('Discard pile invariant failed')
  return card
}

function cloneState(state: ClassicGameState): MutableState {
  return {
    phase: state.phase,
    revision: state.revision,
    players: state.players.map((player) => ({ playerId: player.playerId, name: player.name, hand: [...player.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    activeColor: state.activeColor,
    direction: state.direction,
    activePlayerIndex: state.activePlayerIndex,
    turn: { ...state.turn },
    winnerPlayerId: state.winnerPlayerId,
    lastEvent: state.lastEvent,
    updatedAt: state.updatedAt,
  }
}

function advanceIndex(state: MutableState | ClassicGameState, from: number, steps = 1): number {
  const count = state.players.length
  return ((from + state.direction * steps) % count + count) % count
}

export function isCardPlayable(card: GameCard, activeColor: CardColor, top: GameCard): boolean {
  if (!('color' in card)) return true
  if (card.color === activeColor) return true
  if (card.kind === 'number' && top.kind === 'number') return card.value === top.value
  return card.kind !== 'number' && top.kind === card.kind
}

function refillDrawPile(state: MutableState, services: ClassicServices): boolean {
  if (state.drawPile.length > 0) return true
  if (state.discardPile.length <= 1) return false
  const top = state.discardPile.pop()
  if (!top) return false
  state.drawPile = shuffle(state.discardPile, services.random)
  state.discardPile = [top]
  return state.drawPile.length > 0
}

function drawOne(state: MutableState, playerIndex: number, services: ClassicServices): GameCard | null {
  if (!refillDrawPile(state, services)) return null
  const card = state.drawPile.pop()
  if (!card) return null
  mutablePlayerAt(state, playerIndex).hand.push(card)
  return card
}

function drawMany(state: MutableState, playerIndex: number, count: number, services: ClassicServices): boolean {
  for (let drawn = 0; drawn < count; drawn += 1) if (!drawOne(state, playerIndex, services)) return false
  return true
}

function accepted(state: MutableState): ClassicResult {
  state.revision += 1
  state.updatedAt = state.lastEvent.at
  const errors = validateClassicInvariants(state)
  return errors.length === 0 ? { ok: true, state } : rejected('CARD_INVARIANT_VIOLATION')
}

function finish(state: MutableState, winnerPlayerId: string, at: number): ClassicResult {
  state.phase = 'finished'
  state.winnerPlayerId = winnerPlayerId
  state.turn = { kind: 'awaiting-action' }
  state.lastEvent = { type: 'game-finished', at, winnerPlayerId }
  return accepted(state)
}

export function initializeClassicGame(
  identities: readonly ClassicPlayerIdentity[],
  services: ClassicServices,
): ClassicInitializationResult {
  if (identities.length < 2 || identities.length > 8) return rejected('INVALID_PLAYER_COUNT')
  if (new Set(identities.map((player) => player.playerId)).size !== identities.length) return rejected('DUPLICATE_PLAYER_ID')

  const drawPile = shuffle(createClassicDeck(), services.random)
  const players: MutablePlayer[] = identities.map((identity) => ({ ...identity, hand: [] }))
  for (let round = 0; round < 7; round += 1) {
    for (const player of players) {
      const card = drawPile.pop()
      if (!card) throw new Error('Classic deal invariant failed')
      player.hand.push(card)
    }
  }
  const openingCard = drawPile.pop()
  if (!openingCard) throw new Error('Classic opening card invariant failed')
  if (openingCard.kind !== 'number') return rejected('OPENING_CARD_RULE_UNDECIDED')
  const now = services.clock.now()
  const state: MutableState = {
    phase: 'playing',
    revision: 0,
    players,
    drawPile,
    discardPile: [openingCard],
    activeColor: openingCard.color,
    direction: 1,
    activePlayerIndex: 0,
    turn: { kind: 'awaiting-action' },
    winnerPlayerId: null,
    lastEvent: { type: 'game-started', at: now },
    updatedAt: now,
  }
  return validateClassicInvariants(state).length === 0
    ? { ok: true, state }
    : rejected('CARD_INVARIANT_VIOLATION')
}

function validateActor(state: ClassicGameState, playerId: string): ClassicErrorCode | null {
  if (state.phase === 'finished') return 'GAME_FINISHED'
  return playerAt(state, state.activePlayerIndex).playerId === playerId ? null : 'NOT_YOUR_TURN'
}

function removeOwnedCard(player: MutablePlayer, cardId: string): GameCard | null {
  const index = player.hand.findIndex((card) => card.id === cardId)
  if (index < 0) return null
  const removed = player.hand.splice(index, 1)[0]
  return removed ?? null
}

function playCard(state: ClassicGameState, action: Extract<ClassicAction, { type: 'play-card' }>, services: ClassicServices): ClassicResult {
  const actorError = validateActor(state, action.playerId)
  if (actorError) return rejected(actorError)
  if (state.turn.kind === 'draw-four-decision') return rejected('WRONG_TURN_STATE')
  if (state.turn.kind === 'drawn-card-decision' && state.turn.cardId !== action.cardId) return rejected('DRAWN_CARD_ONLY')
  const actor = state.players[state.activePlayerIndex]
  if (!actor) throw new Error('Active player invariant failed')
  const selected = actor.hand.find((card) => card.id === action.cardId)
  if (!selected) return rejected('CARD_NOT_OWNED')
  if (!isCardPlayable(selected, state.activeColor, topCard(state))) return rejected('CARD_NOT_PLAYABLE')
  const wild = selected.kind === 'wild' || selected.kind === 'wild-draw-four'
  if (wild && !action.chosenColor) return rejected('COLOR_REQUIRED')
  if (!wild && action.chosenColor) return rejected('UNEXPECTED_COLOR')

  const next = cloneState(state)
  const mutableActor = mutablePlayerAt(next, next.activePlayerIndex)
  const drawFourWasLegal = selected.kind === 'wild-draw-four'
    ? !mutableActor.hand.some((card) => card.id !== selected.id && 'color' in card && card.color === state.activeColor)
    : true
  const card = removeOwnedCard(mutableActor, action.cardId)
  if (!card) return rejected('CARD_NOT_OWNED')
  const now = services.clock.now()
  next.discardPile.push(card)
  next.activeColor = 'color' in card ? card.color : (action.chosenColor ?? state.activeColor)
  next.lastEvent = { type: 'card-played', at: now, playerId: action.playerId, card }
  const emptiedHand = mutableActor.hand.length === 0

  if (card.kind === 'wild-draw-four') {
    const victimIndex = advanceIndex(next, next.activePlayerIndex)
    const victim = mutablePlayerAt(next, victimIndex)
    next.activePlayerIndex = victimIndex
    next.turn = {
      kind: 'draw-four-decision',
      offenderPlayerId: action.playerId,
      victimPlayerId: victim.playerId,
      wasLegal: drawFourWasLegal,
      pendingWinnerPlayerId: emptiedHand ? action.playerId : null,
    }
    return accepted(next)
  }

  if (card.kind === 'draw-two') {
    const victimIndex = advanceIndex(next, next.activePlayerIndex)
    if (!drawMany(next, victimIndex, 2, services)) return rejected('DRAW_PILE_EXHAUSTED')
    if (emptiedHand) return finish(next, action.playerId, now)
    next.activePlayerIndex = advanceIndex(next, victimIndex)
    next.turn = { kind: 'awaiting-action' }
    return accepted(next)
  }

  if (emptiedHand) return finish(next, action.playerId, now)
  if (card.kind === 'skip') next.activePlayerIndex = advanceIndex(next, next.activePlayerIndex, 2)
  else if (card.kind === 'reverse') {
    next.direction = next.direction === 1 ? -1 : 1
    next.activePlayerIndex = advanceIndex(next, next.activePlayerIndex, next.players.length === 2 ? 2 : 1)
  } else next.activePlayerIndex = advanceIndex(next, next.activePlayerIndex)
  next.turn = { kind: 'awaiting-action' }
  return accepted(next)
}

function drawCard(state: ClassicGameState, action: Extract<ClassicAction, { type: 'draw-card' }>, services: ClassicServices): ClassicResult {
  const actorError = validateActor(state, action.playerId)
  if (actorError) return rejected(actorError)
  if (state.turn.kind !== 'awaiting-action') return rejected('WRONG_TURN_STATE')
  const next = cloneState(state)
  const card = drawOne(next, next.activePlayerIndex, services)
  if (!card) return rejected('DRAW_PILE_EXHAUSTED')
  const now = services.clock.now()
  next.lastEvent = { type: 'card-drawn', at: now, playerId: action.playerId, count: 1 }
  if (isCardPlayable(card, next.activeColor, topCard(next))) next.turn = { kind: 'drawn-card-decision', cardId: card.id }
  else {
    next.turn = { kind: 'awaiting-action' }
    next.activePlayerIndex = advanceIndex(next, next.activePlayerIndex)
  }
  return accepted(next)
}

function keepDrawnCard(state: ClassicGameState, action: Extract<ClassicAction, { type: 'keep-drawn-card' }>, services: ClassicServices): ClassicResult {
  const actorError = validateActor(state, action.playerId)
  if (actorError) return rejected(actorError)
  if (state.turn.kind !== 'drawn-card-decision') return rejected('WRONG_TURN_STATE')
  const next = cloneState(state)
  next.turn = { kind: 'awaiting-action' }
  next.activePlayerIndex = advanceIndex(next, next.activePlayerIndex)
  next.lastEvent = { type: 'drawn-card-kept', at: services.clock.now(), playerId: action.playerId }
  return accepted(next)
}

function resolveDrawFour(
  state: ClassicGameState,
  action: Extract<ClassicAction, { type: 'resolve-draw-four' }>,
  services: ClassicServices,
): ClassicResult {
  if (state.phase === 'finished') return rejected('GAME_FINISHED')
  if (state.turn.kind !== 'draw-four-decision') return rejected('WRONG_TURN_STATE')
  if (state.turn.victimPlayerId !== action.playerId) return rejected('INVALID_DRAW_FOUR_ACTOR')
  const next = cloneState(state)
  const turn = next.turn
  if (turn.kind !== 'draw-four-decision') return rejected('WRONG_TURN_STATE')
  const victimIndex = next.activePlayerIndex
  const offenderIndex = next.players.findIndex((player) => player.playerId === turn.offenderPlayerId)
  if (offenderIndex < 0) throw new Error('Draw-four offender invariant failed')
  const challenged = action.decision === 'challenge'
  const successful = challenged && !turn.wasLegal
  const now = services.clock.now()

  if (!challenged) {
    if (!drawMany(next, victimIndex, 4, services)) return rejected('DRAW_PILE_EXHAUSTED')
    if (turn.pendingWinnerPlayerId) return finish(next, turn.pendingWinnerPlayerId, now)
    next.activePlayerIndex = advanceIndex(next, victimIndex)
  } else if (successful) {
    if (!drawMany(next, offenderIndex, 4, services)) return rejected('DRAW_PILE_EXHAUSTED')
    next.activePlayerIndex = victimIndex
  } else {
    if (!drawMany(next, victimIndex, 6, services)) return rejected('DRAW_PILE_EXHAUSTED')
    if (turn.pendingWinnerPlayerId) return finish(next, turn.pendingWinnerPlayerId, now)
    next.activePlayerIndex = advanceIndex(next, victimIndex)
  }
  next.turn = { kind: 'awaiting-action' }
  next.lastEvent = {
    type: 'draw-four-challenged',
    at: now,
    challengerPlayerId: action.playerId,
    successful,
  }
  return accepted(next)
}

export function applyClassicAction(state: ClassicGameState, action: ClassicAction, services: ClassicServices): ClassicResult {
  if (validateClassicInvariants(state).length > 0) return rejected('CARD_INVARIANT_VIOLATION')
  switch (action.type) {
    case 'play-card': return playCard(state, action, services)
    case 'draw-card': return drawCard(state, action, services)
    case 'keep-drawn-card': return keepDrawnCard(state, action, services)
    case 'resolve-draw-four': return resolveDrawFour(state, action, services)
  }
}

export function validateClassicInvariants(state: ClassicGameState): string[] {
  const errors: string[] = []
  if (state.players.length < 2 || state.players.length > 8) errors.push('player-count')
  if (new Set(state.players.map((player) => player.playerId)).size !== state.players.length) errors.push('duplicate-player-id')
  if (state.activePlayerIndex < 0 || state.activePlayerIndex >= state.players.length) errors.push('active-player')
  if (!CARD_COLORS.includes(state.activeColor)) errors.push('active-color')
  if (state.discardPile.length === 0) errors.push('discard-empty')
  const cards = [...state.drawPile, ...state.discardPile, ...state.players.flatMap((player) => player.hand)]
  if (cards.length !== CLASSIC_DECK_SIZE) errors.push(`card-count:${cards.length}`)
  if (new Set(cards.map((card) => card.id)).size !== cards.length) errors.push('duplicate-card-id')
  if (cards.some((card) => !CLASSIC_CARD_IDS.has(card.id))) errors.push('unknown-card-id')
  if (state.phase === 'finished') {
    const winner = state.players.find((player) => player.playerId === state.winnerPlayerId)
    if (!winner || winner.hand.length !== 0) errors.push('winner-hand')
  }
  if (state.turn.kind === 'draw-four-decision') {
    const victim = playerAt(state, state.activePlayerIndex)
    if (victim.playerId !== state.turn.victimPlayerId) errors.push('draw-four-victim')
    const offenderPlayerId = state.turn.offenderPlayerId
    if (!state.players.some((player) => player.playerId === offenderPlayerId)) errors.push('draw-four-offender')
  }
  if (state.turn.kind === 'drawn-card-decision') {
    const actor = playerAt(state, state.activePlayerIndex)
    const drawnCardId = state.turn.cardId
    if (!actor.hand.some((card) => card.id === drawnCardId)) errors.push('drawn-card-owner')
  }
  return errors
}
