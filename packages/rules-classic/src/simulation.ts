import { CARD_COLORS, createSeededRandom, type CardColor, type RandomSource } from '@project-havoc/game-core'

import { applyClassicAction, initializeClassicGame, validateClassicInvariants } from './engine.js'
import { projectClassicPlayerState } from './projections.js'
import type { ClassicAction, ClassicGameState, ClassicServices } from './types.js'

export interface ClassicSimulationOptions {
  readonly runs: number
  readonly seed: number
  readonly playerCount?: number
  readonly maxActionsPerGame?: number
}

export interface ClassicSimulationReport {
  readonly requestedSeed: number
  readonly completedGames: number
  readonly blockedOpeningDeals: number
  readonly totalActions: number
  readonly longestGameActions: number
  readonly lastGameSeed: number
}

function choose<T>(values: readonly T[], random: RandomSource): T {
  const selected = values[Math.floor(random.next() * values.length)]
  if (selected === undefined) throw new Error('Simulation cannot choose from an empty list')
  return selected
}

function colorFor(random: RandomSource): CardColor {
  return choose(CARD_COLORS, random)
}

function chooseAction(state: ClassicGameState, random: RandomSource): ClassicAction {
  const actor = state.players[state.activePlayerIndex]
  if (!actor) throw new Error('Simulation active-player invariant failed')
  const view = projectClassicPlayerState(state, actor.playerId)

  if (state.turn.kind === 'draw-four-decision') {
    return {
      type: 'resolve-draw-four',
      playerId: actor.playerId,
      decision: random.next() < 0.5 ? 'accept' : 'challenge',
    }
  }
  if (state.turn.kind === 'drawn-card-decision') {
    if (random.next() < 0.25) return { type: 'keep-drawn-card', playerId: actor.playerId }
    const drawnCardId = state.turn.cardId
    const card = actor.hand.find((candidate) => candidate.id === drawnCardId)
    if (!card) throw new Error('Simulation drawn-card invariant failed')
    return {
      type: 'play-card',
      playerId: actor.playerId,
      cardId: card.id,
      ...(!('color' in card) ? { chosenColor: colorFor(random) } : {}),
    }
  }

  const shouldPlay = view.playableCardIds.length > 0
    && (!view.allowedActions.includes('draw-card') || random.next() < 0.8)
  if (!shouldPlay) return { type: 'draw-card', playerId: actor.playerId }
  const cardId = choose(view.playableCardIds, random)
  const card = actor.hand.find((candidate) => candidate.id === cardId)
  if (!card) throw new Error('Simulation playable-card projection invariant failed')
  return {
    type: 'play-card',
    playerId: actor.playerId,
    cardId,
    ...(!('color' in card) ? { chosenColor: colorFor(random) } : {}),
  }
}

export function runClassicSimulations(options: ClassicSimulationOptions): ClassicSimulationReport {
  const playerCount = options.playerCount ?? 4
  const maxActions = options.maxActionsPerGame ?? 10_000
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('Simulation runs must be a positive integer')
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 8) throw new Error('Simulation player count must be 2..8')

  let completedGames = 0
  let blockedOpeningDeals = 0
  let totalActions = 0
  let longestGameActions = 0
  let candidateSeed = options.seed

  while (completedGames < options.runs) {
    const gameSeed = candidateSeed
    candidateSeed += 1
    const random = createSeededRandom(gameSeed)
    let tick = 0
    const services: ClassicServices = { random, clock: { now: () => tick++ } }
    const initialized = initializeClassicGame(
      Array.from({ length: playerCount }, (_, index) => ({ playerId: `p${index + 1}`, name: `Player ${index + 1}` })),
      services,
    )
    if (!initialized.ok) {
      if (initialized.error.code === 'OPENING_CARD_RULE_UNDECIDED') { blockedOpeningDeals += 1; continue }
      throw new Error(`Classic simulation seed ${gameSeed} initialization failed: ${initialized.error.code}`)
    }

    let state = initialized.state
    let actionCount = 0
    while (state.phase !== 'finished') {
      if (actionCount >= maxActions) throw new Error(`Classic simulation seed ${gameSeed} exceeded ${maxActions} actions`)
      const action = chooseAction(state, random)
      const result = applyClassicAction(state, action, services)
      if (!result.ok) {
        throw new Error(`Classic simulation seed ${gameSeed} rejected ${JSON.stringify(action)}: ${result.error.code}`)
      }
      state = result.state
      const invariantErrors = validateClassicInvariants(state)
      if (invariantErrors.length > 0) {
        throw new Error(`Classic simulation seed ${gameSeed} invariant failure: ${invariantErrors.join(', ')}`)
      }
      actionCount += 1
    }
    completedGames += 1
    totalActions += actionCount
    longestGameActions = Math.max(longestGameActions, actionCount)
  }

  return {
    requestedSeed: options.seed,
    completedGames,
    blockedOpeningDeals,
    totalActions,
    longestGameActions,
    lastGameSeed: candidateSeed - 1,
  }
}
