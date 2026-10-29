import type { CardColor, Clock, GameCard, RandomSource } from '@project-havoc/game-core'

export type ClassicDirection = 1 | -1
export type ClassicPhase = 'playing' | 'finished'

export interface ClassicPlayerIdentity {
  readonly playerId: string
  readonly name: string
}

export interface ClassicPlayerState extends ClassicPlayerIdentity {
  readonly hand: readonly GameCard[]
}

export type ClassicTurnState =
  | { readonly kind: 'awaiting-action' }
  | { readonly kind: 'drawn-card-decision'; readonly cardId: string }
  | {
    readonly kind: 'draw-four-decision'
    readonly offenderPlayerId: string
    readonly victimPlayerId: string
    readonly wasLegal: boolean
    readonly pendingWinnerPlayerId: string | null
  }

export type ClassicPublicEvent =
  | { readonly type: 'game-started'; readonly at: number }
  | { readonly type: 'card-played'; readonly at: number; readonly playerId: string; readonly card: GameCard }
  | { readonly type: 'card-drawn'; readonly at: number; readonly playerId: string; readonly count: number }
  | { readonly type: 'drawn-card-kept'; readonly at: number; readonly playerId: string }
  | { readonly type: 'draw-four-challenged'; readonly at: number; readonly challengerPlayerId: string; readonly successful: boolean }
  | { readonly type: 'game-finished'; readonly at: number; readonly winnerPlayerId: string }

export interface ClassicGameState {
  readonly phase: ClassicPhase
  readonly revision: number
  readonly players: readonly ClassicPlayerState[]
  readonly drawPile: readonly GameCard[]
  readonly discardPile: readonly GameCard[]
  readonly activeColor: CardColor
  readonly direction: ClassicDirection
  readonly activePlayerIndex: number
  readonly turn: ClassicTurnState
  readonly winnerPlayerId: string | null
  readonly lastEvent: ClassicPublicEvent
  readonly updatedAt: number
}

export interface ClassicServices {
  readonly random: RandomSource
  readonly clock: Clock
}

export type ClassicAction =
  | { readonly type: 'play-card'; readonly playerId: string; readonly cardId: string; readonly chosenColor?: CardColor }
  | { readonly type: 'draw-card'; readonly playerId: string }
  | { readonly type: 'keep-drawn-card'; readonly playerId: string }
  | { readonly type: 'resolve-draw-four'; readonly playerId: string; readonly decision: 'accept' | 'challenge' }

export type ClassicErrorCode =
  | 'INVALID_PLAYER_COUNT'
  | 'DUPLICATE_PLAYER_ID'
  | 'OPENING_CARD_RULE_UNDECIDED'
  | 'GAME_FINISHED'
  | 'NOT_YOUR_TURN'
  | 'WRONG_TURN_STATE'
  | 'CARD_NOT_OWNED'
  | 'CARD_NOT_PLAYABLE'
  | 'DRAWN_CARD_ONLY'
  | 'COLOR_REQUIRED'
  | 'UNEXPECTED_COLOR'
  | 'DRAW_PILE_EXHAUSTED'
  | 'INVALID_DRAW_FOUR_ACTOR'
  | 'CARD_INVARIANT_VIOLATION'

export interface ClassicError {
  readonly code: ClassicErrorCode
  readonly message: string
}

export type ClassicResult =
  | { readonly ok: true; readonly state: ClassicGameState }
  | { readonly ok: false; readonly error: ClassicError }

export type ClassicInitializationResult = ClassicResult

export type ClassicAllowedAction = 'play-card' | 'draw-card' | 'play-drawn-card' | 'keep-drawn-card' | 'accept-draw-four' | 'challenge-draw-four'

export interface ClassicPublicPlayerProjection {
  readonly playerId: string
  readonly name: string
  readonly cardCount: number
}

export interface ClassicPublicProjection {
  readonly phase: ClassicPhase
  readonly revision: number
  readonly players: readonly ClassicPublicPlayerProjection[]
  readonly activePlayerId: string | null
  readonly activeColor: CardColor
  readonly direction: ClassicDirection
  readonly topCard: GameCard
  readonly drawPileCount: number
  readonly discardPileCount: number
  readonly turn: 'awaiting-action' | 'drawn-card-decision' | 'draw-four-decision' | 'finished'
  readonly decisionPlayerId: string | null
  readonly winnerPlayerId: string | null
  readonly lastEvent: ClassicPublicEvent
}

export interface ClassicPlayerProjection extends ClassicPublicProjection {
  readonly viewerPlayerId: string
  readonly hand: readonly GameCard[]
  readonly allowedActions: readonly ClassicAllowedAction[]
  readonly playableCardIds: readonly string[]
  readonly requiredDecision: 'none' | 'drawn-card' | 'draw-four'
}
