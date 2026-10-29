export const MIN_PLAYERS = 2 as const
export const MAX_PLAYERS = 8 as const

export type RoomId = string
export type RoomCode = string
export type HostId = string
export type PlayerId = string
export type ActionId = string
export type SessionRevision = number
export type SessionPhase = 'lobby' | 'started' | 'closed'
export type GameMode = 'classic' | 'chaos'

export interface ReconnectTokenService {
  /**
   * Returns the same credential for the same subject. A production adapter
   * should use a keyed cryptographic construction and keep its key server-side.
   */
  mint(subject: string): { token: string; digest: string }
  digest(token: string): string
  matches(token: string, digest: string): boolean
}

export interface LobbyServices {
  now(): number
  newRoomId(): RoomId
  newRoomCode(): RoomCode
  newHostId(): HostId
  newPlayerId(): PlayerId
  reconnectTokens: ReconnectTokenService
}

export interface LobbyHost {
  readonly hostId: HostId
  readonly reconnectTokenDigest: string
  readonly connected: boolean
}

export interface LobbyPlayer {
  readonly playerId: PlayerId
  readonly name: string
  readonly normalizedName: string
  readonly seat: number
  readonly ready: boolean
  readonly connected: boolean
  readonly reconnectTokenDigest: string
  readonly joinedAt: number
}

export type DomainErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_NAME'
  | 'NAME_TAKEN'
  | 'ROOM_FULL'
  | 'WRONG_PHASE'
  | 'NOT_AUTHORIZED'
  | 'PLAYER_NOT_FOUND'
  | 'MIN_PLAYERS'
  | 'PLAYERS_NOT_READY'
  | 'STALE_REVISION'
  | 'ACTION_ID_CONFLICT'
  | 'INVALID_RECONNECT_TOKEN'

export interface DomainError {
  readonly code: DomainErrorCode
  readonly message: string
}

export interface IssuedReconnectCredentials {
  readonly role: 'display-host' | 'player'
  readonly identityId: HostId | PlayerId
  readonly reconnectToken: string
}

interface StoredCredentialDescriptor {
  readonly role: 'display-host' | 'player'
  readonly identityId: HostId | PlayerId
  readonly subject: string
}

interface StoredCommandSuccess {
  readonly ok: true
  readonly revision: SessionRevision
  readonly credentials?: StoredCredentialDescriptor
}

interface StoredCommandFailure {
  readonly ok: false
  readonly revision: SessionRevision
  readonly error: DomainError
}

export interface ProcessedCommand {
  readonly fingerprint: string
  readonly outcome: StoredCommandSuccess | StoredCommandFailure
}

export interface LobbySession {
  readonly roomId: RoomId
  readonly roomCode: RoomCode
  readonly phase: SessionPhase
  readonly revision: SessionRevision
  readonly selectedMode: GameMode | null
  readonly host: LobbyHost
  readonly players: readonly LobbyPlayer[]
  readonly startedPlayerIds: readonly PlayerId[]
  /** Private idempotency state. Projection functions never expose it. */
  readonly processedCommands: Readonly<Record<ActionId, ProcessedCommand>>
}

export interface PlayerActor {
  readonly role: 'player'
  readonly playerId: PlayerId
  readonly reconnectToken: string
}

export interface HostActor {
  readonly role: 'display-host'
  readonly hostId: HostId
  readonly reconnectToken: string
}

interface CommandMetadata {
  readonly actionId: ActionId
  readonly expectedRevision: SessionRevision
}

export type LobbyCommand =
  | (CommandMetadata & { readonly type: 'join-player'; readonly name: string })
  | (CommandMetadata & {
      readonly type: 'reconnect-player'
      readonly playerId: PlayerId
      readonly reconnectToken: string
    })
  | (CommandMetadata & {
      readonly type: 'reconnect-host'
      readonly hostId: HostId
      readonly reconnectToken: string
    })
  | (CommandMetadata & { readonly type: 'rename-player'; readonly actor: PlayerActor; readonly name: string })
  | (CommandMetadata & { readonly type: 'set-ready'; readonly actor: PlayerActor; readonly ready: boolean })
  | (CommandMetadata & { readonly type: 'select-mode'; readonly actor: HostActor; readonly mode: GameMode })
  | (CommandMetadata & { readonly type: 'remove-player'; readonly actor: HostActor; readonly playerId: PlayerId })
  | (CommandMetadata & { readonly type: 'start-session'; readonly actor: HostActor })
  | (CommandMetadata & { readonly type: 'close-session'; readonly actor: HostActor })

export type ConnectionCommand =
  | (CommandMetadata & { readonly type: 'disconnect-player'; readonly playerId: PlayerId })
  | (CommandMetadata & { readonly type: 'disconnect-host' })

export type CommandResult =
  | {
      readonly ok: true
      readonly session: LobbySession
      readonly revision: SessionRevision
      readonly replayed: boolean
      readonly credentials?: IssuedReconnectCredentials
    }
  | {
      readonly ok: false
      readonly session: LobbySession
      readonly revision: SessionRevision
      readonly replayed: boolean
      readonly error: DomainError
    }

export type CreateSessionResult =
  | {
      readonly ok: true
      readonly session: LobbySession
      readonly credentials: IssuedReconnectCredentials
    }
  | { readonly ok: false; readonly error: DomainError }

export interface PublicLobbyPlayer {
  readonly playerId: PlayerId
  readonly name: string
  readonly seat: number
  readonly ready: boolean
  readonly connected: boolean
}

export interface PublicLobbyProjection {
  readonly visibility: 'public'
  readonly roomId: RoomId
  readonly roomCode: RoomCode
  readonly phase: SessionPhase
  readonly revision: SessionRevision
  readonly selectedMode: GameMode | null
  readonly hostConnected: boolean
  readonly minPlayers: typeof MIN_PLAYERS
  readonly maxPlayers: typeof MAX_PLAYERS
  readonly players: readonly PublicLobbyPlayer[]
  readonly startedPlayerIds: readonly PlayerId[]
}

export type PrivateLobbyProjection = Omit<PublicLobbyProjection, 'visibility'> & {
  readonly visibility: 'private'
  readonly allowedActions: readonly (
    | 'player.rename'
    | 'player.set-ready'
    | 'room.set-mode'
    | 'room.remove-player'
    | 'room.start'
    | 'room.close'
  )[]
  readonly viewer:
    | { readonly role: 'display-host'; readonly hostId: HostId }
    | { readonly role: 'player'; readonly playerId: PlayerId }
}
