import type { PrivateSessionView } from '@project-havoc/protocol'

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'lost'
  | 'reconnecting'
  | 'protocol-error'
  | 'session-invalid'
  | 'host-lost'

export type HostAction = 'create' | 'reconnect' | 'set-mode' | 'start' | 'close'

export interface TvLobbyModel {
  readonly connection: ConnectionState
  readonly session: PrivateSessionView | null
  readonly pendingAction: HostAction | null
  readonly notice: string | null
  readonly serverUrl: string
  readonly joinUrl: string | null
  readonly joinUrlWarning: string | null
  createRoom(): void
  selectMode(mode: 'classic' | 'chaos'): void
  startSession(): void
  closeRoom(): void
  retryConnection(): void
  resetSession(): void
}
