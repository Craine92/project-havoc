import type { GameActionMessage, PrivateSessionView } from '@project-havoc/protocol'
import type { ChaosPlayerView } from '@project-havoc/rules-chaos'

export type ControllerConnection = 'connecting' | 'connected' | 'unavailable' | 'lost' | 'reconnecting' | 'protocol-error'
export type ControllerAction = 'join' | 'reconnect' | 'ready' | 'rename' | 'game'

export interface ControllerModel {
  readonly connection: ControllerConnection
  readonly session: PrivateSessionView | null
  readonly playerId: string | null
  readonly notice: string | null
  readonly pending: ControllerAction | null
  readonly serverUrl: string
  readonly game: ChaosPlayerView | null
  /** Differenz Serveruhr minus lokale Uhr, für Countdowns. */
  readonly clockOffset: number
  readonly gameNotice: string | null
  gameAction(action: GameActionMessage): void
  join(roomCode: string, name: string): string | null
  setReady(ready: boolean): void
  rename(name: string): string | null
  retry(): void
  forgetSession(): void
}
