export const CARD_COLORS = ['red', 'yellow', 'green', 'blue'] as const
export type CardColor = (typeof CARD_COLORS)[number]

export type NumberCardValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type ColoredActionKind = 'skip' | 'reverse' | 'draw-two'
export type WildCardKind = 'wild' | 'wild-draw-four'

export interface NumberCard {
  readonly id: string
  readonly kind: 'number'
  readonly color: CardColor
  readonly value: NumberCardValue
}

export interface ColoredActionCard {
  readonly id: string
  readonly kind: ColoredActionKind
  readonly color: CardColor
}

export interface WildCard {
  readonly id: string
  readonly kind: WildCardKind
}

export type GameCard = NumberCard | ColoredActionCard | WildCard

export interface RandomSource {
  next(): number
}

export interface Clock {
  now(): number
}

