import type { PrivateSessionView } from '@project-havoc/protocol'
import type { ChaosPublicView } from '@project-havoc/rules-chaos'

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'lost'
  | 'reconnecting'
  | 'protocol-error'
  | 'session-invalid'
  | 'host-lost'

export type HostAction = 'create' | 'reconnect' | 'set-mode' | 'start' | 'close' | 'rematch'

export interface TvLobbyModel {
  readonly connection: ConnectionState
  readonly session: PrivateSessionView | null
  readonly pendingAction: HostAction | null
  readonly notice: string | null
  readonly serverUrl: string
  readonly joinUrl: string | null
  readonly joinUrlWarning: string | null
  readonly game: ChaosPublicView | null
  readonly clockOffset: number
  rematch(): void
  createRoom(): void
  selectMode(mode: 'classic' | 'chaos'): void
  startSession(): void
  closeRoom(): void
  retryConnection(): void
  resetSession(): void
}
