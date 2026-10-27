import { describe, expect, it } from 'vitest'

import { createDeterministicLobbyServices } from '@project-havoc/test-support'

import {
  applyConnectionCommand,
  applyLobbyCommand,
  createLobbySession,
  projectHostLobby,
  projectPlayerLobby,
  projectPublicLobby,
  type HostActor,
  type LobbyServices,
  type LobbySession,
  type PlayerActor,
} from '../index.js'

interface Fixture {
  readonly services: ReturnType<typeof createDeterministicLobbyServices>
  readonly session: LobbySession
  readonly host: HostActor
}

function fixture(): Fixture {
  const services = createDeterministicLobbyServices()
  const created = createLobbySession(services)
  if (!created.ok) throw new Error(created.error.message)
  return {
    services,
    session: created.session,
    host: {
      role: 'display-host',
      hostId: created.session.host.hostId,
      reconnectToken: created.credentials.reconnectToken,
    },
  }
}

function join(
  session: LobbySession,
  services: LobbyServices,
  name: string,
  actionId: string,
): { readonly session: LobbySession; readonly actor: PlayerActor } {
  const result = applyLobbyCommand(session, {
    type: 'join-player',
    actionId,
    expectedRevision: session.revision,
    name,
  }, services)
  if (!result.ok || !result.credentials || result.credentials.role !== 'player') {
    throw new Error(result.ok ? 'Player credentials were not issued' : result.error.message)
  }
  return {
    session: result.session,
    actor: {
      role: 'player',
      playerId: result.credentials.identityId,
      reconnectToken: result.credentials.reconnectToken,
    },
  }
}

function ready(
  session: LobbySession,
  services: LobbyServices,
  actor: PlayerActor,
  actionId: string,
): LobbySession {
  const result = applyLobbyCommand(session, {
    type: 'set-ready',
    actionId,
    expectedRevision: session.revision,
    actor,
    ready: true,
  }, services)
  if (!result.ok) throw new Error(result.error.message)
  return result.session
}

describe('lobby session creation', () => {
  it('creates a lobby with a connected display host and no player seat', () => {
    const { session, host } = fixture()

    expect(session).toMatchObject({
      roomId: 'room_test_0001',
      roomCode: 'HVC234',
      phase: 'lobby',
      revision: 0,
      players: [],
      host: { hostId: host.hostId, connected: true },
    })
    expect(session.host.reconnectTokenDigest).not.toBe(host.reconnectToken)
  })

  it('rejects malformed IDs supplied by infrastructure', () => {
    const services = createDeterministicLobbyServices()
    const invalidServices: LobbyServices = { ...services, newRoomCode: () => 'BAD01' }

    expect(createLobbySession(invalidServices)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    })
  })
})

describe('player membership and names', () => {
  it('joins a player, normalizes whitespace and issues private credentials', () => {
    const { session, services } = fixture()
    const result = applyLobbyCommand(session, {
      type: 'join-player',
      actionId: 'action_join_0001',
      expectedRevision: 0,
      name: '  Nova   Prime  ',
    }, services)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.players[0]).toMatchObject({
      name: 'Nova Prime',
      normalizedName: 'nova prime',
      seat: 0,
      ready: false,
      connected: true,
    })
    expect(result.credentials?.reconnectToken).toBeDefined()
  })

  it.each(['A', 'ABCDEFGHIJKLMNOPQ', '\u0000\u0001'])('rejects invalid player name %j', (name) => {
    const { session, services } = fixture()
    const result = applyLobbyCommand(session, {
      type: 'join-player',
      actionId: `invalid_${name.codePointAt(0)?.toString() ?? 'name'}_0000`,
      expectedRevision: 0,
      name,
    }, services)

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_NAME' } })
  })

  it('rejects duplicate names after Unicode normalization and case folding', () => {
    const { session, services } = fixture()
    const first = join(session, services, 'Ｎｏｖａ', 'action_join_0002')
    const duplicate = applyLobbyCommand(first.session, {
      type: 'join-player',
      actionId: 'action_join_0003',
      expectedRevision: first.session.revision,
      name: 'nova',
    }, services)

    expect(duplicate).toMatchObject({ ok: false, error: { code: 'NAME_TAKEN' } })
  })

  it('caps new seats at eight but lets an existing player reconnect', () => {
    const { session: initial, services } = fixture()
    let session = initial
    let firstActor: PlayerActor | undefined
    for (let index = 0; index < 8; index += 1) {
      const joined = join(session, services, `Player ${index}`, `action_fill_${index.toString().padStart(4, '0')}`)
      session = joined.session
      firstActor ??= joined.actor
    }

    const ninth = applyLobbyCommand(session, {
      type: 'join-player',
      actionId: 'action_join_ninth',
      expectedRevision: session.revision,
      name: 'Ninth Player',
    }, services)
    expect(ninth).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } })

    if (!firstActor) throw new Error('First actor missing')
    const disconnected = applyConnectionCommand(ninth.session, {
      type: 'disconnect-player',
      actionId: 'action_disconnect_first',
      expectedRevision: ninth.session.revision,
      playerId: firstActor.playerId,
    }, services)
    expect(disconnected.ok).toBe(true)
    const reconnect = applyLobbyCommand(disconnected.session, {
      type: 'reconnect-player',
      actionId: 'action_reconnect_first',
      expectedRevision: disconnected.session.revision,
      playerId: firstActor.playerId,
      reconnectToken: firstActor.reconnectToken,
    }, services)
    expect(reconnect).toMatchObject({ ok: true })
    expect(reconnect.session.players).toHaveLength(8)
  })

  it('allows only the authenticated player to change their ready state', () => {
    const { session, services } = fixture()
    const joined = join(session, services, 'Nova', 'action_join_0004')
    const readyResult = applyLobbyCommand(joined.session, {
      type: 'set-ready',
      actionId: 'action_ready_0001',
      expectedRevision: joined.session.revision,
      actor: joined.actor,
      ready: true,
    }, services)

    expect(readyResult.ok).toBe(true)
    expect(readyResult.session.players[0]?.ready).toBe(true)

    const unauthorized = applyLobbyCommand(readyResult.session, {
      type: 'set-ready',
      actionId: 'action_ready_0002',
      expectedRevision: readyResult.session.revision,
      actor: { ...joined.actor, reconnectToken: 'wrong-token' },
      ready: false,
    }, services)
    expect(unauthorized).toMatchObject({ ok: false, error: { code: 'NOT_AUTHORIZED' } })
  })

  it('lets the host remove a player in the lobby and compacts seats', () => {
    const { session, services, host } = fixture()
    const first = join(session, services, 'Nova', 'action_join_0005')
    const second = join(first.session, services, 'Rex', 'action_join_0006')
    const removed = applyLobbyCommand(second.session, {
      type: 'remove-player',
      actionId: 'action_remove_0001',
      expectedRevision: second.session.revision,
      actor: host,
      playerId: first.actor.playerId,
    }, services)

    expect(removed.ok).toBe(true)
    expect(removed.session.players).toMatchObject([{ name: 'Rex', seat: 0 }])
  })
})

describe('start authorization and prerequisites', () => {
  it('lets only the display host select a lobby mode', () => {
    const { session, services, host } = fixture()
    const selected = applyLobbyCommand(session, {
      type: 'select-mode',
      actionId: 'action_mode_0001',
      expectedRevision: session.revision,
      actor: host,
      mode: 'chaos',
    }, services)

    expect(selected).toMatchObject({ ok: true, session: { selectedMode: 'chaos' } })
  })

  it('rejects start below the minimum player count', () => {
    const { session, services, host } = fixture()
    const one = join(session, services, 'Nova', 'action_join_0010')
    const result = applyLobbyCommand(one.session, {
      type: 'start-session',
      actionId: 'action_start_0001',
      expectedRevision: one.session.revision,
      actor: host,
    }, services)

    expect(result).toMatchObject({ ok: false, error: { code: 'MIN_PLAYERS' } })
  })

  it('rejects start while a connected player is not ready', () => {
    const { session, services, host } = fixture()
    const first = join(session, services, 'Nova', 'action_join_0011')
    const second = join(first.session, services, 'Rex', 'action_join_0012')
    const onlyFirstReady = ready(second.session, services, first.actor, 'action_ready_0011')
    const result = applyLobbyCommand(onlyFirstReady, {
      type: 'start-session',
      actionId: 'action_start_0002',
      expectedRevision: onlyFirstReady.revision,
      actor: host,
    }, services)

    expect(result).toMatchObject({ ok: false, error: { code: 'PLAYERS_NOT_READY' } })
  })

  it('rejects a player impersonating the display host', () => {
    const { session, services } = fixture()
    const first = join(session, services, 'Nova', 'action_join_0013')
    const result = applyLobbyCommand(first.session, {
      type: 'start-session',
      actionId: 'action_start_0003',
      expectedRevision: first.session.revision,
      actor: {
        role: 'display-host',
        hostId: first.actor.playerId,
        reconnectToken: first.actor.reconnectToken,
      },
    }, services)

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_AUTHORIZED' } })
  })

  it('starts a neutral session with connected ready players only', () => {
    const { session, services, host } = fixture()
    const first = join(session, services, 'Nova', 'action_join_0014')
    const second = join(first.session, services, 'Rex', 'action_join_0015')
    const third = join(second.session, services, 'Mira', 'action_join_0016')
    let current = ready(third.session, services, first.actor, 'action_ready_0014')
    current = ready(current, services, second.actor, 'action_ready_0015')
    const disconnected = applyConnectionCommand(current, {
      type: 'disconnect-player',
      actionId: 'action_disconnect_third',
      expectedRevision: current.revision,
      playerId: third.actor.playerId,
    }, services)
    const started = applyLobbyCommand(disconnected.session, {
      type: 'start-session',
      actionId: 'action_start_0004',
      expectedRevision: disconnected.session.revision,
      actor: host,
    }, services)

    expect(started.ok).toBe(true)
    expect(started.session.phase).toBe('started')
    expect(started.session.startedPlayerIds).toEqual([first.actor.playerId, second.actor.playerId])
    expect(started.session.startedPlayerIds).not.toContain(host.hostId)
  })

  it('does not allow a new player to join after start', () => {
    const { session, services, host } = fixture()
    const first = join(session, services, 'Nova', 'action_join_0017')
    const second = join(first.session, services, 'Rex', 'action_join_0018')
    let current = ready(second.session, services, first.actor, 'action_ready_0017')
    current = ready(current, services, second.actor, 'action_ready_0018')
    const started = applyLobbyCommand(current, {
      type: 'start-session',
      actionId: 'action_start_0005',
      expectedRevision: current.revision,
      actor: host,
    }, services)
    const lateJoin = applyLobbyCommand(started.session, {
      type: 'join-player',
      actionId: 'action_join_late',
      expectedRevision: started.session.revision,
      name: 'Late Player',
    }, services)

    expect(lateJoin).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } })
  })
})

describe('revision and idempotency guarantees', () => {
  it('replays a duplicate join without adding a second player or changing credentials', () => {
    const { session, services } = fixture()
    const command = {
      type: 'join-player' as const,
      actionId: 'action_idempotent_join',
      expectedRevision: 0,
      name: 'Nova',
    }
    const first = applyLobbyCommand(session, command, services)
    const duplicate = applyLobbyCommand(first.session, command, services)

    expect(first.ok).toBe(true)
    expect(duplicate).toMatchObject({ ok: true, replayed: true, revision: 1 })
    expect(duplicate.session.players).toHaveLength(1)
    if (first.ok && duplicate.ok) {
      expect(duplicate.credentials).toEqual(first.credentials)
    }
  })

  it('rejects reusing an action ID for different content', () => {
    const { session, services } = fixture()
    const first = applyLobbyCommand(session, {
      type: 'join-player',
      actionId: 'action_conflict_0001',
      expectedRevision: 0,
      name: 'Nova',
    }, services)
    const conflict = applyLobbyCommand(first.session, {
      type: 'join-player',
      actionId: 'action_conflict_0001',
      expectedRevision: 0,
      name: 'Rex',
    }, services)

    expect(conflict).toMatchObject({ ok: false, replayed: true, error: { code: 'ACTION_ID_CONFLICT' } })
    expect(conflict.session.players).toHaveLength(1)
  })

  it('rejects and deterministically replays a stale revision', () => {
    const { session, services } = fixture()
    const first = join(session, services, 'Nova', 'action_join_0020')
    const staleCommand = {
      type: 'join-player' as const,
      actionId: 'action_stale_0001',
      expectedRevision: 0,
      name: 'Rex',
    }
    const stale = applyLobbyCommand(first.session, staleCommand, services)
    const replayed = applyLobbyCommand(stale.session, staleCommand, services)

    expect(stale).toMatchObject({ ok: false, replayed: false, error: { code: 'STALE_REVISION' } })
    expect(replayed).toMatchObject({ ok: false, replayed: true, error: { code: 'STALE_REVISION' } })
    expect(replayed.session.players).toHaveLength(1)
  })
})

describe('disconnect and reconnect', () => {
  it('disconnects and reconnects the same player with a valid token', () => {
    const { session, services } = fixture()
    const joined = join(session, services, 'Nova', 'action_join_0030')
    const disconnected = applyConnectionCommand(joined.session, {
      type: 'disconnect-player',
      actionId: 'action_disconnect_0030',
      expectedRevision: joined.session.revision,
      playerId: joined.actor.playerId,
    }, services)
    const reconnected = applyLobbyCommand(disconnected.session, {
      type: 'reconnect-player',
      actionId: 'action_reconnect_0030',
      expectedRevision: disconnected.session.revision,
      playerId: joined.actor.playerId,
      reconnectToken: joined.actor.reconnectToken,
    }, services)

    expect(disconnected.session.players[0]?.connected).toBe(false)
    expect(reconnected.ok).toBe(true)
    expect(reconnected.session.players[0]).toMatchObject({
      playerId: joined.actor.playerId,
      connected: true,
    })
  })

  it('rejects an invalid reconnect token without changing connection state', () => {
    const { session, services } = fixture()
    const joined = join(session, services, 'Nova', 'action_join_0031')
    const disconnected = applyConnectionCommand(joined.session, {
      type: 'disconnect-player',
      actionId: 'action_disconnect_0031',
      expectedRevision: joined.session.revision,
      playerId: joined.actor.playerId,
    }, services)
    const rejected = applyLobbyCommand(disconnected.session, {
      type: 'reconnect-player',
      actionId: 'action_reconnect_0031',
      expectedRevision: disconnected.session.revision,
      playerId: joined.actor.playerId,
      reconnectToken: 'invalid-token',
    }, services)

    expect(rejected).toMatchObject({ ok: false, error: { code: 'INVALID_RECONNECT_TOKEN' } })
    expect(rejected.session.players[0]?.connected).toBe(false)
  })

  it('restores the display host without creating a player seat', () => {
    const { session, services, host } = fixture()
    const disconnected = applyConnectionCommand(session, {
      type: 'disconnect-host',
      actionId: 'action_host_disconnect',
      expectedRevision: session.revision,
    }, services)
    const reconnected = applyLobbyCommand(disconnected.session, {
      type: 'reconnect-host',
      actionId: 'action_host_reconnect',
      expectedRevision: disconnected.session.revision,
      hostId: host.hostId,
      reconnectToken: host.reconnectToken,
    }, services)

    expect(reconnected.ok).toBe(true)
    expect(reconnected.session.host.connected).toBe(true)
    expect(reconnected.session.players).toHaveLength(0)
  })
})

describe('public and private projections', () => {
  it('never exposes reconnect digests, raw tokens or idempotency state', () => {
    const { session, services, host } = fixture()
    const joined = join(session, services, 'Nova', 'action_join_0040')
    const publicView = projectPublicLobby(joined.session)
    const hostView = projectHostLobby(joined.session, host.hostId)
    const playerView = projectPlayerLobby(joined.session, joined.actor.playerId)
    const serialized = JSON.stringify({ publicView, hostView, playerView })

    expect(publicView.visibility).toBe('public')
    expect(hostView?.viewer).toEqual({ role: 'display-host', hostId: host.hostId })
    expect(playerView?.viewer).toEqual({ role: 'player', playerId: joined.actor.playerId })
    expect(serialized).not.toContain('reconnectToken')
    expect(serialized).not.toContain('processedCommands')
    expect(serialized).not.toContain(joined.actor.reconnectToken)
  })

  it('refuses private projections for unknown viewers', () => {
    const { session } = fixture()

    expect(projectHostLobby(session, 'unknown_host')).toBeNull()
    expect(projectPlayerLobby(session, 'unknown_player')).toBeNull()
  })
})
