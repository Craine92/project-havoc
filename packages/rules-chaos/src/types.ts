import type { CardColor, Clock, GameCard, RandomSource } from '@project-havoc/game-core'

/** Die fünf Chaos-Karten im Karibik-Stil. */
export type ChaosKind = 'mutiny' | 'maelstrom' | 'cursed-dice' | 'lifebuoy' | 'backfire'

export interface ChaosCard {
  readonly id: string
  readonly kind: 'chaos'
  readonly chaos: ChaosKind
}

export type HavocCard = GameCard | ChaosCard

export type ChaosDirection = 1 | -1
export type ChaosEventType = 'kraken' | 'storm' | 'plunder' | 'bottle'
export type PenaltySource = 'draw-two' | 'draw-four' | 'cursed-dice'

export interface ChaosTiming {
  readonly firstEventMs: number
  readonly eventIntervalMs: number
  readonly eventShowMs: number
  readonly reactionMs: number
  readonly havocCatchMs: number
  readonly finalPhaseMs: number
  readonly timeLimitMs: number
}

export interface ChaosPlayer {
  readonly playerId: string
  readonly name: string
  readonly hand: readonly HavocCard[]
  readonly havocCalled: boolean
}

export type ChaosTurn =
  | { readonly kind: 'play' }
  | { readonly kind: 'drawn'; readonly cardId: string }
  | {
    readonly kind: 'reaction'
    readonly targetId: string
    readonly sourcePlayerId: string
    readonly amount: number
    readonly source: PenaltySource
    readonly deadline: number
    readonly resumeIndex: number
  }

export interface ChaosRoll {
  readonly playerId: string
  readonly value: number
}

export interface ChaosReveal {
  readonly viewerId: string
  readonly ownerId: string
  readonly card: HavocCard
}

export interface ChaosEventState {
  readonly seq: number
  readonly type: ChaosEventType
  readonly startedAt: number
  readonly until: number
  readonly rolls: readonly ChaosRoll[]
  readonly highlightPlayerIds: readonly string[]
  readonly summary: string
  readonly reveals: readonly ChaosReveal[]
}

export type ChaosActionKind =
  | 'start' | 'play' | 'draw' | 'keep' | 'penalty' | 'shield' | 'mirror' | 'havoc' | 'caught'
  | 'swap' | 'rotate' | 'dice' | 'event' | 'final' | 'win'

export interface ChaosLastAction {
  readonly seq: number
  readonly at: number
  readonly kind: ChaosActionKind
  readonly playerId?: string
  readonly targetId?: string
  readonly card?: HavocCard
  readonly amount?: number
  readonly dice?: number
}

export interface ChaosFeedEntry {
  readonly seq: number
  readonly at: number
  readonly text: string
}

export interface ChaosWinner {
  readonly playerId: string
  readonly reason: 'empty' | 'time'
}

export interface ChaosGameState {
  readonly phase: 'playing' | 'finished'
  readonly revision: number
  readonly seq: number
  readonly timing: ChaosTiming
  readonly players: readonly ChaosPlayer[]
  readonly drawPile: readonly HavocCard[]
  readonly discardPile: readonly HavocCard[]
  readonly activeColor: CardColor
  readonly direction: ChaosDirection
  readonly activeIndex: number
  readonly turn: ChaosTurn
  readonly havocCatch: { readonly playerId: string; readonly until: number } | null
  readonly event: ChaosEventState | null
  readonly lastEventType: ChaosEventType | null
  readonly nextEventAt: number
  readonly startedAt: number
  readonly finalPhaseAt: number
  readonly endsAt: number
  readonly finalPhase: boolean
  readonly winner: ChaosWinner | null
  readonly lastAction: ChaosLastAction
  readonly feed: readonly ChaosFeedEntry[]
}

export interface ChaosServices {
  readonly random: RandomSource
  readonly clock: Clock
}

export type ChaosAction =
  | { readonly type: 'play'; readonly playerId: string; readonly cardId: string; readonly color?: CardColor; readonly targetId?: string }
  | { readonly type: 'draw'; readonly playerId: string }
  | { readonly type: 'keep'; readonly playerId: string }
  | { readonly type: 'havoc'; readonly playerId: string }
  | { readonly type: 'catch'; readonly playerId: string; readonly targetId: string }
  | { readonly type: 'react'; readonly playerId: string; readonly choice: 'shield' | 'mirror' | 'accept'; readonly targetId?: string }

export type ChaosResult =
  | { readonly ok: true; readonly state: ChaosGameState }
  | { readonly ok: false; readonly message: string }

export interface ChaosPublicPlayer {
  readonly playerId: string
  readonly name: string
  readonly cardCount: number
  readonly havocCalled: boolean
}

export interface ChaosPublicEvent {
  readonly seq: number
  readonly type: ChaosEventType
  readonly startedAt: number
  readonly until: number
  readonly rolls: readonly ChaosRoll[]
  readonly highlightPlayerIds: readonly string[]
  readonly summary: string
}

export interface ChaosPublicView {
  readonly phase: 'playing' | 'finished'
  readonly revision: number
  readonly serverNow: number
  readonly players: readonly ChaosPublicPlayer[]
  readonly activePlayerId: string | null
  readonly decisionPlayerId: string | null
  readonly activeColor: CardColor
  readonly direction: ChaosDirection
  readonly topCard: HavocCard
  readonly drawPileCount: number
  readonly turn: 'play' | 'drawn' | 'reaction' | 'finished'
  readonly reaction: {
    readonly targetId: string
    readonly sourcePlayerId: string
    readonly amount: number
    readonly source: PenaltySource
    readonly deadline: number
  } | null
  readonly havocCatch: { readonly playerId: string; readonly until: number } | null
  readonly event: ChaosPublicEvent | null
  readonly nextEventAt: number
  readonly startedAt: number
  readonly finalPhaseAt: number
  readonly endsAt: number
  readonly finalPhase: boolean
  readonly winner: ChaosWinner | null
  readonly lastAction: ChaosLastAction
  readonly feed: readonly ChaosFeedEntry[]
}

export interface ChaosPlayerView extends ChaosPublicView {
  readonly viewerId: string
  readonly hand: readonly HavocCard[]
  readonly playableCardIds: readonly string[]
  readonly canDraw: boolean
  readonly drawnCardId: string | null
  readonly canCallHavoc: boolean
  readonly canCatchPlayerId: string | null
  readonly reactionOptions: { readonly shield: boolean; readonly mirror: boolean } | null
  readonly reveal: { readonly ownerId: string; readonly card: HavocCard } | null
}
