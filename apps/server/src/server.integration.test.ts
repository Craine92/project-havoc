import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'

import { PROTOCOL_VERSION, validateClientMessage, type ClientMessage, type ServerMessage } from '@project-havoc/protocol'

import { loadServerConfig, type ServerConfig } from './config.js'
import type { Logger } from './logging.js'
import { createHavocServer, type HavocServer } from './server.js'

const silentLogger: Logger = { log() {} }
const sockets: ClientSocket[] = []
let server: HavocServer
let serverUrl: string
let now: number
let config: ServerConfig
let actionSequence: number

function actionId(label: string): string {
  actionSequence += 1
  return `action_${label}_${actionSequence.toString().padStart(4, '0')}`
}

type ClientMessageInput = ClientMessage extends infer Message
  ? Message extends ClientMessage ? Omit<Message, 'version'> : never
  : never

function message(value: ClientMessageInput): ClientMessage {
  const parsed = validateClientMessage({ version: PROTOCOL_VERSION, ...value })
  if (!parsed.success) throw new Error(parsed.issues.join('; '))
  return parsed.data
}

function waitForMessage(
  socket: ClientSocket,
  predicate: (message: ServerMessage) => boolean,
  timeoutMs = 3_000,
): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('server.message', handler)
      reject(new Error('Timed out waiting for server.message'))
    }, timeoutMs)
    function handler(received: ServerMessage): void {
      if (!predicate(received)) return
      clearTimeout(timer)
      socket.off('server.message', handler)
      resolve(received)
    }
    socket.on('server.message', handler)
  })
}

async function connect(): Promise<ClientSocket> {
  const socket = createClient(serverUrl, { transports: ['websocket'], forceNew: true, reconnection: false })
  sockets.push(socket)
  if (socket.connected) return socket
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out connecting client')), 3_000)
    socket.once('connect', () => { clearTimeout(timer); resolve() })
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error) })
  })
  return socket
}

interface Identity {
  readonly role: 'display-host' | 'player'
  readonly id: string
  readonly token: string
}

interface RoomClient {
  readonly socket: ClientSocket
  readonly roomId: string
  readonly roomCode: string
  readonly identity: Identity
  revision: number
}

async function createRoom(providedSocket?: ClientSocket): Promise<RoomClient> {
  const socket = providedSocket ?? await connect()
  const id = actionId('create')
  const credentialsPromise = waitForMessage(socket, (item) => item.type === 'credentials.issued' && item.actionId === id)
  const snapshotPromise = waitForMessage(socket, (item) => item.type === 'session.snapshot')
  socket.emit('client.message', message({ type: 'room.create', actionId: id, expectedRevision: 0 }))
  const credentials = await credentialsPromise
  const snapshot = await snapshotPromise
  if (credentials.type !== 'credentials.issued' || credentials.identity.role !== 'display-host') throw new Error('Host credentials missing')
  if (snapshot.type !== 'session.snapshot') throw new Error('Host snapshot missing')
  return {
    socket,
    roomId: credentials.roomId,
    roomCode: credentials.roomCode,
    identity: { role: 'display-host', id: credentials.identity.hostId, token: credentials.identity.reconnectToken },
    revision: snapshot.session.revision,
  }
}

async function joinRoom(room: RoomClient, name: string, providedSocket?: ClientSocket): Promise<RoomClient> {
  const socket = providedSocket ?? await connect()
  const id = actionId('join')
  const credentialsPromise = waitForMessage(socket, (item) => item.type === 'credentials.issued' && item.actionId === id)
  const snapshotPromise = waitForMessage(socket, (item) => item.type === 'session.snapshot' && item.session.roomId === room.roomId)
  socket.emit('client.message', message({
    type: 'room.join', actionId: id, expectedRevision: 0, roomCode: room.roomCode, name,
  }))
  const credentials = await credentialsPromise
  const snapshot = await snapshotPromise
  if (credentials.type !== 'credentials.issued' || credentials.identity.role !== 'player') throw new Error('Player credentials missing')
  if (snapshot.type !== 'session.snapshot') throw new Error('Player snapshot missing')
  room.revision = snapshot.session.revision
  return {
    socket,
    roomId: room.roomId,
    roomCode: room.roomCode,
    identity: { role: 'player', id: credentials.identity.playerId, token: credentials.identity.reconnectToken },
    revision: snapshot.session.revision,
  }
}

async function send(socket: ClientSocket, payload: ClientMessage): Promise<ServerMessage> {
  const response = waitForMessage(socket, (item) => (
    (item.type === 'action.accepted' || item.type === 'action.rejected') && item.actionId === payload.actionId
  ))
  socket.emit('client.message', payload)
  return response
}

async function eventually(assertion: () => void, timeoutMs = 3_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (true) {
    try {
      assertion()
      return
    } catch (error: unknown) {
      if (Date.now() >= deadline) throw error
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}

beforeEach(async () => {
  now = 1_900_000_000_000
  actionSequence = 0
  config = {
    ...loadServerConfig({ NODE_ENV: 'test', RECONNECT_TOKEN_SECRET: 'integration-test-secret-which-is-long-enough' }),
    port: 0,
    cleanupIntervalMs: 60_000,
    inactiveRoomTtlMs: 5_000,
    orphanRoomTtlMs: 2_000,
    closedRoomTtlMs: 1_000,
    connectionRateLimit: { limit: 100, windowMs: 60_000 },
    creationRateLimit: { limit: 100, windowMs: 60_000 },
    joinRateLimit: { limit: 100, windowMs: 60_000 },
    actionRateLimit: { limit: 100, windowMs: 10_000 },
    invalidMessageRateLimit: { limit: 100, windowMs: 10_000 },
  }
  server = createHavocServer({ config, logger: silentLogger, now: () => now })
  serverUrl = (await server.start()).url
})

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.disconnect()
  await server.stop()
})

describe('Socket.IO multiplayer server', () => {
  it('1. starts successfully on a random free port', () => {
    expect(new URL(serverUrl).port).not.toBe('0')
  })

  it('2. serves the HTTP healthcheck', async () => {
    const response = await fetch(`${serverUrl}/health`)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('3. lets a display host create a room', async () => {
    const host = await createRoom()
    expect(host.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(host.identity.role).toBe('display-host')
    expect(server.roomCount).toBe(1)
  })

  it('4. lets two players join the same room', async () => {
    const host = await createRoom()
    await joinRoom(host, 'Nova')
    const snapshotPromise = waitForMessage(host.socket, (item) => item.type === 'session.snapshot' && item.session.players.length === 2)
    await joinRoom(host, 'Rex')
    const snapshot = await snapshotPromise
    expect(snapshot.type === 'session.snapshot' && snapshot.session.players.map((player) => player.name)).toEqual(['Nova', 'Rex'])
  })

  it('5. supports eight players', async () => {
    const host = await createRoom()
    let last: RoomClient | undefined
    for (let index = 0; index < 8; index += 1) last = await joinRoom(host, `Player ${index}`)
    expect(last?.revision).toBe(8)
  })

  it('6. rejects a ninth player', async () => {
    const host = await createRoom()
    for (let index = 0; index < 8; index += 1) await joinRoom(host, `Player ${index}`)
    const ninth = await connect()
    const id = actionId('ninth')
    const response = await send(ninth, message({ type: 'room.join', actionId: id, expectedRevision: 0, roomCode: host.roomCode, name: 'Ninth' }))
    expect(response).toMatchObject({ type: 'action.rejected', error: { code: 'ROOM_FULL' } })
  })

  it('7. rejects duplicate normalized names', async () => {
    const host = await createRoom()
    await joinRoom(host, 'Nova')
    const socket = await connect()
    const response = await send(socket, message({
      type: 'room.join', actionId: actionId('duplicate'), expectedRevision: 0, roomCode: host.roomCode, name: ' nova ',
    }))
    expect(response).toMatchObject({ type: 'action.rejected', error: { code: 'NAME_TAKEN' } })
  })

  it('8. synchronizes ready state to host and player', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    const hostSnapshot = waitForMessage(host.socket, (item) => item.type === 'session.snapshot' && item.session.players[0]?.ready === true)
    const response = await send(player.socket, message({
      type: 'player.set-ready', actionId: actionId('ready'), expectedRevision: player.revision, ready: true,
    }))
    expect(response.type).toBe('action.accepted')
    expect((await hostSnapshot).type).toBe('session.snapshot')
  })

  it('9. permits mode changes only for the host', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    const denied = await send(player.socket, message({
      type: 'room.set-mode', actionId: actionId('mode-denied'), expectedRevision: player.revision, mode: 'chaos',
    }))
    expect(denied).toMatchObject({ type: 'action.rejected', error: { code: 'NOT_AUTHORIZED' } })
    const accepted = await send(host.socket, message({
      type: 'room.set-mode', actionId: actionId('mode-host'), expectedRevision: host.revision, mode: 'chaos',
    }))
    expect(accepted.type).toBe('action.accepted')
  })

  it('10. permits session start only for the host', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    const response = await send(player.socket, message({
      type: 'room.start', actionId: actionId('start-denied'), expectedRevision: player.revision,
    }))
    expect(response).toMatchObject({ type: 'action.rejected', error: { code: 'NOT_AUTHORIZED' } })
  })

  it('11. rejects start with too few players', async () => {
    const host = await createRoom()
    const response = await send(host.socket, message({
      type: 'room.start', actionId: actionId('start-few'), expectedRevision: host.revision,
    }))
    expect(response).toMatchObject({ type: 'action.rejected', error: { code: 'MIN_PLAYERS' } })
  })

  it('12. synchronizes a successful neutral game start', async () => {
    const host = await createRoom()
    const first = await joinRoom(host, 'Nova')
    const second = await joinRoom(host, 'Rex')
    let response = await send(first.socket, message({ type: 'player.set-ready', actionId: actionId('ready-a'), expectedRevision: second.revision, ready: true }))
    if (response.type !== 'action.accepted') throw new Error('First ready failed')
    response = await send(second.socket, message({ type: 'player.set-ready', actionId: actionId('ready-b'), expectedRevision: response.revision, ready: true }))
    if (response.type !== 'action.accepted') throw new Error('Second ready failed')
    const startedSnapshot = waitForMessage(first.socket, (item) => item.type === 'session.snapshot' && item.session.phase === 'started')
    const started = await send(host.socket, message({ type: 'room.start', actionId: actionId('start'), expectedRevision: response.revision }))
    expect(started.type).toBe('action.accepted')
    expect((await startedSnapshot).type).toBe('session.snapshot')
  })

  it('13. serializes simultaneous room actions', async () => {
    const host = await createRoom()
    const first = await joinRoom(host, 'Nova')
    const second = await joinRoom(host, 'Rex')
    const revision = second.revision
    const [one, two] = await Promise.all([
      send(first.socket, message({ type: 'player.set-ready', actionId: actionId('race-a'), expectedRevision: revision, ready: true })),
      send(second.socket, message({ type: 'player.set-ready', actionId: actionId('race-b'), expectedRevision: revision, ready: true })),
    ])
    expect([one.type, two.type].sort()).toEqual(['action.accepted', 'action.rejected'])
    expect([one, two]).toContainEqual(expect.objectContaining({ type: 'action.rejected', error: expect.objectContaining({ code: 'STALE_REVISION' }) }))
  })

  it('14. replays a duplicate action without applying it twice', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    const payload = message({ type: 'player.set-ready', actionId: actionId('repeat'), expectedRevision: player.revision, ready: true })
    const first = await send(player.socket, payload)
    const repeated = await send(player.socket, payload)
    expect(first).toMatchObject({ type: 'action.accepted', replayed: false })
    expect(repeated).toMatchObject({ type: 'action.accepted', replayed: true, revision: first.type === 'action.accepted' ? first.revision : -1 })
  })

  it('15. reports stale revisions clearly', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    const response = await send(player.socket, message({
      type: 'player.set-ready', actionId: actionId('stale'), expectedRevision: 0, ready: true,
    }))
    expect(response).toMatchObject({ type: 'action.rejected', error: { code: 'STALE_REVISION' } })
  })

  it('16. distributes player disconnect state', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    const snapshot = waitForMessage(host.socket, (item) => item.type === 'session.snapshot' && item.session.players[0]?.connected === false)
    player.socket.disconnect()
    expect((await snapshot).type).toBe('session.snapshot')
  })

  it('17. reconnects a player without creating a new seat', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    player.socket.disconnect()
    const reconnecting = await connect()
    const id = actionId('reconnect-player')
    const snapshot = waitForMessage(reconnecting, (item) => item.type === 'session.snapshot')
    const response = await send(reconnecting, message({
      type: 'room.reconnect-player', actionId: id, expectedRevision: player.revision,
      roomCode: host.roomCode, playerId: player.identity.id, reconnectToken: player.identity.token,
    }))
    expect(response.type).toBe('action.accepted')
    const restored = await snapshot
    expect(restored.type === 'session.snapshot' && restored.session.players).toHaveLength(1)
  })

  it('18. reconnects the display host', async () => {
    const host = await createRoom()
    host.socket.disconnect()
    const reconnecting = await connect()
    const response = await send(reconnecting, message({
      type: 'room.reconnect-host', actionId: actionId('reconnect-host'), expectedRevision: host.revision,
      roomCode: host.roomCode, hostId: host.identity.id, reconnectToken: host.identity.token,
    }))
    expect(response.type).toBe('action.accepted')
  })

  it('19. rejects invalid reconnect credentials', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    player.socket.disconnect()
    const reconnecting = await connect()
    const response = await send(reconnecting, message({
      type: 'room.reconnect-player', actionId: actionId('bad-reconnect'), expectedRevision: player.revision,
      roomCode: host.roomCode, playerId: player.identity.id, reconnectToken: 'invalid_token_value_that_is_long_enough_1234',
    }))
    expect(response).toMatchObject({ type: 'action.rejected', error: { code: 'INVALID_RECONNECT_TOKEN' } })
  })

  it('20. never broadcasts private credentials to other clients', async () => {
    const host = await createRoom()
    const hostMessages: ServerMessage[] = []
    host.socket.on('server.message', (item: ServerMessage) => hostMessages.push(item))
    const player = await joinRoom(host, 'Nova')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(JSON.stringify(hostMessages)).not.toContain(player.identity.token)
    expect(JSON.stringify(hostMessages)).not.toContain('reconnectTokenDigest')
  })

  it('21. keeps different rooms isolated', async () => {
    const firstRoom = await createRoom()
    const secondRoom = await createRoom()
    await joinRoom(firstRoom, 'Nova')
    const secondSnapshot = waitForMessage(secondRoom.socket, (item) => item.type === 'session.snapshot' && item.session.roomId === secondRoom.roomId, 100)
    await expect(secondSnapshot).rejects.toThrow('Timed out')
  })

  it('22. garbage-collects orphaned rooms after retention', async () => {
    const host = await createRoom()
    host.socket.disconnect()
    await new Promise((resolve) => setTimeout(resolve, 20))
    now += config.orphanRoomTtlMs + 1
    await eventually(() => expect(server.runCleanup()).toContain(host.roomId))
    expect(server.roomCount).toBe(0)
  })

  it('23. enforces testable room-creation rate limits', async () => {
    await server.stop()
    config = { ...config, creationRateLimit: { limit: 1, windowMs: 60_000 } }
    server = createHavocServer({ config, logger: silentLogger, now: () => now })
    serverUrl = (await server.start()).url
    await createRoom()
    const socket = await connect()
    const response = await send(socket, message({ type: 'room.create', actionId: actionId('limited'), expectedRevision: 0 }))
    expect(response).toMatchObject({ type: 'action.rejected', error: { code: 'RATE_LIMITED' } })
  })

  it('24. safely rejects malformed protocol messages', async () => {
    const socket = await connect()
    const response = waitForMessage(socket, (item) => item.type === 'action.rejected')
    socket.emit('client.message', { version: 999, type: 'room.create', secret: 'ignored' })
    expect(await response).toMatchObject({ type: 'action.rejected', error: { code: 'INVALID_MESSAGE' } })
  })

  it('25. shutdown closes connections and releases rooms', async () => {
    const host = await createRoom()
    const disconnected = new Promise<void>((resolve) => host.socket.once('disconnect', () => resolve()))
    await server.stop()
    await disconnected
    expect(server.roomCount).toBe(0)
  })

  it('26. lets only the host close a room and later collects it', async () => {
    const host = await createRoom()
    const player = await joinRoom(host, 'Nova')
    const denied = await send(player.socket, message({
      type: 'room.close', actionId: actionId('close-denied'), expectedRevision: player.revision,
    }))
    expect(denied).toMatchObject({ type: 'action.rejected', error: { code: 'NOT_AUTHORIZED' } })
    const disconnected = new Promise<void>((resolve) => host.socket.once('disconnect', () => resolve()))
    const closed = await send(host.socket, message({
      type: 'room.close', actionId: actionId('close'), expectedRevision: host.revision,
    }))
    expect(closed.type).toBe('action.accepted')
    await disconnected
    now += config.closedRoomTtlMs + 1
    await eventually(() => expect(server.runCleanup()).toContain(host.roomId))
  })

  it('27. closes a connection that exceeds the transport payload limit', async () => {
    const socket = await connect()
    const disconnected = new Promise<void>((resolve) => socket.once('disconnect', () => resolve()))
    socket.emit('client.message', { version: PROTOCOL_VERSION, type: 'invalid', padding: 'x'.repeat(config.maxMessageBytes + 1) })
    await disconnected
    expect(socket.connected).toBe(false)
  })

  it('28. enforces connection-attempt rate limits', async () => {
    await server.stop()
    config = { ...config, connectionRateLimit: { limit: 1, windowMs: 60_000 } }
    server = createHavocServer({ config, logger: silentLogger, now: () => now })
    serverUrl = (await server.start()).url
    await connect()
    const rejected = createClient(serverUrl, { transports: ['websocket'], forceNew: true, reconnection: false })
    sockets.push(rejected)
    const error = await new Promise<Error>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Connection was not rate limited')), 3_000)
      rejected.once('connect_error', (received) => { clearTimeout(timer); resolve(received) })
    })
    expect(error).toBeInstanceOf(Error)
  })
})
