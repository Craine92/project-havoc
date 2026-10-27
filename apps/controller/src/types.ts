import type { PrivateSessionView } from '@project-havoc/protocol'

export type ControllerConnection = 'connecting' | 'connected' | 'unavailable' | 'lost' | 'reconnecting' | 'protocol-error'
export type ControllerAction = 'join' | 'reconnect' | 'ready' | 'rename'

export interface ControllerModel {
  readonly connection: ControllerConnection
  readonly session: PrivateSessionView | null
  readonly playerId: string | null
  readonly notice: string | null
  readonly pending: ControllerAction | null
  readonly serverUrl: string
  join(roomCode: string, name: string): string | null
  setReady(ready: boolean): void
  rename(name: string): string | null
  retry(): void
  forgetSession(): void
}
