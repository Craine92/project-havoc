import { normalizePlayerName } from './name.js'
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type ActionId,
  type CommandResult,
  type ConnectionCommand,
  type CreateSessionResult,
  type DomainError,
  type DomainErrorCode,
  type HostActor,
  type IssuedReconnectCredentials,
  type LobbyCommand,
  type LobbyPlayer,
  type LobbyServices,
  type LobbySession,
  type PlayerActor,
  type ProcessedCommand,
} from './types.js'

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{8,128}$/
const ROOM_CODE_PATTERN = /^[A-Z2-9]{6}$/

const ERROR_MESSAGES: Record<DomainErrorCode, string> = {
  INVALID_INPUT: 'The command contains invalid input.',
  INVALID_NAME: 'The player name must contain 2 to 16 Unicode characters.',
  NAME_TAKEN: 'The player name is already in use in this room.',
  ROOM_FULL: 'The room already contains eight players.',
  WRONG_PHASE: 'The action is not allowed in the current session phase.',
  NOT_AUTHORIZED: 'The supplied identity is not authorized for this action.',
  PLAYER_NOT_FOUND: 'The player does not exist in this room.',
  MIN_PLAYERS: 'At least two connected players are required to start.',
  PLAYERS_NOT_READY: 'Every connected player must be ready to start.',
  STALE_REVISION: 'The action targets an outdated session revision.',
  ACTION_ID_CONFLICT: 'The action ID was already used for a different command.',
  INVALID_RECONNECT_TOKEN: 'The reconnect credential is invalid.',
}

function domainError(code: DomainErrorCode): DomainError {
  return { code, message: ERROR_MESSAGES[code] }
}

function validRevision(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

function validActionId(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value)
}

function validGeneratedIdentifier(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value)
}

function nextSeat(players: readonly LobbyPlayer[]): number {
  const occupied = new Set(players.map((player) => player.seat))
  for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
    if (!occupied.has(seat)) return seat
  }
  return MAX_PLAYERS
}

function hostCredentialSubject(roomId: string, hostId: string): string {
  return `host:${roomId}:${hostId}`
}

function playerCredentialSubject(roomId: string, playerId: string, actionId: string): string {
  return `player:${roomId}:${playerId}:${actionId}`
}

/** Creates a new lobby and a private credential for its sitzless display host. */
export function createLobbySession(services: LobbyServices): CreateSessionResult {
  const roomId = services.newRoomId()
  const roomCode = services.newRoomCode()
  const hostId = services.newHostId()

  if (!validGeneratedIdentifier(roomId) || !ROOM_CODE_PATTERN.test(roomCode) || !validGeneratedIdentifier(hostId)) {
    return { ok: false, error: domainError('INVALID_INPUT') }
  }

  const issued = services.reconnectTokens.mint(hostCredentialSubject(roomId, hostId))
  const session: LobbySession = {
    roomId,
    roomCode,
    phase: 'lobby',
    revision: 0,
    selectedMode: null,
    host: {
      hostId,
      reconnectTokenDigest: issued.digest,
      connected: true,
    },
    players: [],
    startedPlayerIds: [],
    processedCommands: {},
  }

  return {
    ok: true,
    session,
    credentials: {
      role: 'display-host',
      identityId: hostId,
      reconnectToken: issued.token,
    },
  }
}

function fingerprint(command: LobbyCommand | ConnectionCommand, services: LobbyServices): string {
  switch (command.type) {
    case 'join-player':
      return JSON.stringify([command.type, command.expectedRevision, command.name])
    case 'reconnect-player':
      return JSON.stringify([
        command.type,
        command.expectedRevision,
        command.playerId,
        services.reconnectTokens.digest(command.reconnectToken),
      ])
    case 'reconnect-host':
      return JSON.stringify([
        command.type,
        command.expectedRevision,
        command.hostId,
        services.reconnectTokens.digest(command.reconnectToken),
      ])
    case 'rename-player':
      return JSON.stringify([
        command.type,
        command.expectedRevision,
        command.actor.playerId,
        services.reconnectTokens.digest(command.actor.reconnectToken),
        command.name,
      ])
    case 'set-ready':
      return JSON.stringify([
        command.type,
        command.expectedRevision,
        command.actor.playerId,
        services.reconnectTokens.digest(command.actor.reconnectToken),
        command.ready,
      ])
    case 'remove-player':
      return JSON.stringify([
        command.type,
        command.expectedRevision,
        command.actor.hostId,
        services.reconnectTokens.digest(command.actor.reconnectToken),
        command.playerId,
      ])
    case 'select-mode':
      return JSON.stringify([
        command.type,
        command.expectedRevision,
        command.actor.hostId,
        services.reconnectTokens.digest(command.actor.reconnectToken),
        command.mode,
      ])
    case 'start-session':
      return JSON.stringify([
        command.type,
        command.expectedRevision,
        command.actor.hostId,
        services.reconnectTokens.digest(command.actor.reconnectToken),
      ])
    case 'disconnect-player':
      return JSON.stringify([command.type, command.expectedRevision, command.playerId])
    case 'disconnect-host':
      return JSON.stringify([command.type, command.expectedRevision])
  }
}

function credentialsFromStored(
  stored: Extract<ProcessedCommand['outcome'], { ok: true }>,
  services: LobbyServices,
): IssuedReconnectCredentials | undefined {
  if (!stored.credentials) return undefined
  const issued = services.reconnectTokens.mint(stored.credentials.subject)
  return {
    role: stored.credentials.role,
    identityId: stored.credentials.identityId,
    reconnectToken: issued.token,
  }
}

function replay(
  session: LobbySession,
  stored: ProcessedCommand,
  services: LobbyServices,
): CommandResult {
  if (!stored.outcome.ok) {
    return {
      ok: false,
      session,
      revision: stored.outcome.revision,
      replayed: true,
      error: stored.outcome.error,
    }
  }

  const credentials = credentialsFromStored(stored.outcome, services)
  return {
    ok: true,
    session,
    revision: stored.outcome.revision,
    replayed: true,
    ...(credentials ? { credentials } : {}),
  }
}

function withProcessed(
  session: LobbySession,
  actionId: ActionId,
  commandFingerprint: string,
  outcome: ProcessedCommand['outcome'],
): LobbySession {
  return {
    ...session,
    processedCommands: {
      ...session.processedCommands,
      [actionId]: { fingerprint: commandFingerprint, outcome },
    },
  }
}

function rejectAndRemember(
  session: LobbySession,
  actionId: ActionId,
  commandFingerprint: string,
  code: DomainErrorCode,
): CommandResult {
  const error = domainError(code)
  const nextSession = withProcessed(session, actionId, commandFingerprint, {
    ok: false,
    revision: session.revision,
    error,
  })
  return { ok: false, session: nextSession, revision: session.revision, replayed: false, error }
}

function accept(
  session: LobbySession,
  actionId: ActionId,
  commandFingerprint: string,
  credentialDescriptor?: Extract<ProcessedCommand['outcome'], { ok: true }>['credentials'],
  services?: LobbyServices,
): CommandResult {
  const outcome: Extract<ProcessedCommand['outcome'], { ok: true }> = {
    ok: true,
    revision: session.revision,
    ...(credentialDescriptor ? { credentials: credentialDescriptor } : {}),
  }
  const nextSession = withProcessed(session, actionId, commandFingerprint, outcome)
  const credentials = credentialDescriptor && services
    ? credentialsFromStored(outcome, services)
    : undefined
  return {
    ok: true,
    session: nextSession,
    revision: session.revision,
    replayed: false,
    ...(credentials ? { credentials } : {}),
  }
}

function authenticatePlayer(session: LobbySession, actor: PlayerActor, services: LobbyServices): LobbyPlayer | null {
  const player = session.players.find((candidate) => candidate.playerId === actor.playerId)
  if (!player || !services.reconnectTokens.matches(actor.reconnectToken, player.reconnectTokenDigest)) {
    return null
  }
  return player
}

function authenticateHost(session: LobbySession, actor: HostActor, services: LobbyServices): boolean {
  return actor.hostId === session.host.hostId
    && services.reconnectTokens.matches(actor.reconnectToken, session.host.reconnectTokenDigest)
}

function withRevision(session: LobbySession, changes: Partial<Omit<LobbySession, 'revision'>>): LobbySession {
  return { ...session, ...changes, revision: session.revision + 1 }
}

function executeLobbyCommand(
  session: LobbySession,
  command: LobbyCommand,
  commandFingerprint: string,
  services: LobbyServices,
): CommandResult {
  switch (command.type) {
    case 'join-player': {
      if (session.phase !== 'lobby') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      if (session.players.length >= MAX_PLAYERS) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'ROOM_FULL')
      }
      const normalized = normalizePlayerName(command.name)
      if (!normalized.ok) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'INVALID_NAME')
      }
      if (session.players.some((player) => player.normalizedName === normalized.normalizedName)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'NAME_TAKEN')
      }
      const playerId = services.newPlayerId()
      if (!validGeneratedIdentifier(playerId)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'INVALID_INPUT')
      }
      const subject = playerCredentialSubject(session.roomId, playerId, command.actionId)
      const issued = services.reconnectTokens.mint(subject)
      const player: LobbyPlayer = {
        playerId,
        name: normalized.name,
        normalizedName: normalized.normalizedName,
        seat: nextSeat(session.players),
        ready: false,
        connected: true,
        reconnectTokenDigest: issued.digest,
        joinedAt: services.now(),
      }
      const nextSession = withRevision(session, { players: [...session.players, player] })
      return accept(
        nextSession,
        command.actionId,
        commandFingerprint,
        { role: 'player', identityId: playerId, subject },
        services,
      )
    }

    case 'reconnect-player': {
      if (session.phase === 'closed') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      const player = session.players.find((candidate) => candidate.playerId === command.playerId)
      if (!player) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'PLAYER_NOT_FOUND')
      }
      if (!services.reconnectTokens.matches(command.reconnectToken, player.reconnectTokenDigest)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'INVALID_RECONNECT_TOKEN')
      }
      const nextSession = player.connected
        ? session
        : withRevision(session, {
            players: session.players.map((candidate) => candidate.playerId === player.playerId
              ? { ...candidate, connected: true }
              : candidate),
          })
      return accept(nextSession, command.actionId, commandFingerprint)
    }

    case 'reconnect-host': {
      if (session.phase === 'closed') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      if (command.hostId !== session.host.hostId
        || !services.reconnectTokens.matches(command.reconnectToken, session.host.reconnectTokenDigest)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'INVALID_RECONNECT_TOKEN')
      }
      const nextSession = session.host.connected
        ? session
        : withRevision(session, { host: { ...session.host, connected: true } })
      return accept(nextSession, command.actionId, commandFingerprint)
    }

    case 'rename-player': {
      if (session.phase !== 'lobby') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      const player = authenticatePlayer(session, command.actor, services)
      if (!player) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'NOT_AUTHORIZED')
      }
      const normalized = normalizePlayerName(command.name)
      if (!normalized.ok) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'INVALID_NAME')
      }
      if (session.players.some((candidate) => candidate.playerId !== player.playerId
        && candidate.normalizedName === normalized.normalizedName)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'NAME_TAKEN')
      }
      const nextSession = withRevision(session, {
        players: session.players.map((candidate) => candidate.playerId === player.playerId
          ? { ...candidate, name: normalized.name, normalizedName: normalized.normalizedName }
          : candidate),
      })
      return accept(nextSession, command.actionId, commandFingerprint)
    }

    case 'set-ready': {
      if (session.phase !== 'lobby') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      const player = authenticatePlayer(session, command.actor, services)
      if (!player) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'NOT_AUTHORIZED')
      }
      const nextSession = player.ready === command.ready
        ? session
        : withRevision(session, {
            players: session.players.map((candidate) => candidate.playerId === player.playerId
              ? { ...candidate, ready: command.ready }
              : candidate),
          })
      return accept(nextSession, command.actionId, commandFingerprint)
    }

    case 'select-mode': {
      if (session.phase !== 'lobby') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      if (!authenticateHost(session, command.actor, services)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'NOT_AUTHORIZED')
      }
      const nextSession = session.selectedMode === command.mode
        ? session
        : withRevision(session, { selectedMode: command.mode })
      return accept(nextSession, command.actionId, commandFingerprint)
    }

    case 'remove-player': {
      if (session.phase !== 'lobby') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      if (!authenticateHost(session, command.actor, services)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'NOT_AUTHORIZED')
      }
      if (!session.players.some((player) => player.playerId === command.playerId)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'PLAYER_NOT_FOUND')
      }
      const remaining = session.players
        .filter((player) => player.playerId !== command.playerId)
        .map((player, seat) => ({ ...player, seat }))
      const nextSession = withRevision(session, { players: remaining })
      return accept(nextSession, command.actionId, commandFingerprint)
    }

    case 'start-session': {
      if (session.phase !== 'lobby') {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'WRONG_PHASE')
      }
      if (!authenticateHost(session, command.actor, services)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'NOT_AUTHORIZED')
      }
      const connectedPlayers = session.players.filter((player) => player.connected)
      if (connectedPlayers.length < MIN_PLAYERS) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'MIN_PLAYERS')
      }
      if (connectedPlayers.some((player) => !player.ready)) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'PLAYERS_NOT_READY')
      }
      const nextSession = withRevision(session, {
        phase: 'started',
        startedPlayerIds: connectedPlayers.map((player) => player.playerId),
      })
      return accept(nextSession, command.actionId, commandFingerprint)
    }
  }
}

function executeConnectionCommand(
  session: LobbySession,
  command: ConnectionCommand,
  commandFingerprint: string,
): CommandResult {
  switch (command.type) {
    case 'disconnect-player': {
      const player = session.players.find((candidate) => candidate.playerId === command.playerId)
      if (!player) {
        return rejectAndRemember(session, command.actionId, commandFingerprint, 'PLAYER_NOT_FOUND')
      }
      const nextSession = player.connected
        ? withRevision(session, {
            players: session.players.map((candidate) => candidate.playerId === player.playerId
              ? { ...candidate, connected: false }
              : candidate),
          })
        : session
      return accept(nextSession, command.actionId, commandFingerprint)
    }
    case 'disconnect-host': {
      const nextSession = session.host.connected
        ? withRevision(session, { host: { ...session.host, connected: false } })
        : session
      return accept(nextSession, command.actionId, commandFingerprint)
    }
  }
}

function preflight(
  session: LobbySession,
  command: LobbyCommand | ConnectionCommand,
  services: LobbyServices,
): { readonly fingerprint: string; readonly result?: CommandResult } {
  if (!validActionId(command.actionId) || !validRevision(command.expectedRevision)) {
    const error = domainError('INVALID_INPUT')
    return {
      fingerprint: '',
      result: { ok: false, session, revision: session.revision, replayed: false, error },
    }
  }

  const commandFingerprint = fingerprint(command, services)
  const stored = session.processedCommands[command.actionId]
  if (stored) {
    if (stored.fingerprint !== commandFingerprint) {
      const error = domainError('ACTION_ID_CONFLICT')
      return {
        fingerprint: commandFingerprint,
        result: { ok: false, session, revision: session.revision, replayed: true, error },
      }
    }
    return { fingerprint: commandFingerprint, result: replay(session, stored, services) }
  }

  if (command.expectedRevision !== session.revision) {
    return {
      fingerprint: commandFingerprint,
      result: rejectAndRemember(session, command.actionId, commandFingerprint, 'STALE_REVISION'),
    }
  }

  return { fingerprint: commandFingerprint }
}

/**
 * Applies an untrusted client intent after identity and revision checks.
 * Callers must persist the returned session for both accepted and rejected
 * results because the private idempotency record is updated in either case.
 */
export function applyLobbyCommand(
  session: LobbySession,
  command: LobbyCommand,
  services: LobbyServices,
): CommandResult {
  const checked = preflight(session, command, services)
  return checked.result ?? executeLobbyCommand(session, command, checked.fingerprint, services)
}

/** Applies a trusted transport lifecycle event; this is not a client action. */
export function applyConnectionCommand(
  session: LobbySession,
  command: ConnectionCommand,
  services: LobbyServices,
): CommandResult {
  const checked = preflight(session, command, services)
  return checked.result ?? executeConnectionCommand(session, command, checked.fingerprint)
}
