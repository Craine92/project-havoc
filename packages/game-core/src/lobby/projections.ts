import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type HostId,
  type LobbySession,
  type PlayerId,
  type PrivateLobbyProjection,
  type PublicLobbyProjection,
} from './types.js'

/** Builds the projection safe for TV displays and every participant. */
export function projectPublicLobby(session: LobbySession): PublicLobbyProjection {
  return {
    visibility: 'public',
    roomId: session.roomId,
    roomCode: session.roomCode,
    phase: session.phase,
    revision: session.revision,
    selectedMode: session.selectedMode,
    hostConnected: session.host.connected,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    players: session.players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      seat: player.seat,
      ready: player.ready,
      connected: player.connected,
    })),
    startedPlayerIds: [...session.startedPlayerIds],
  }
}

export function projectHostLobby(session: LobbySession, hostId: HostId): PrivateLobbyProjection | null {
  if (hostId !== session.host.hostId) return null
  return {
    ...projectPublicLobby(session),
    visibility: 'private',
    viewer: { role: 'display-host', hostId },
  }
}

export function projectPlayerLobby(session: LobbySession, playerId: PlayerId): PrivateLobbyProjection | null {
  if (!session.players.some((player) => player.playerId === playerId)) return null
  return {
    ...projectPublicLobby(session),
    visibility: 'private',
    viewer: { role: 'player', playerId },
  }
}
