import { randomUUID } from 'node:crypto'

import {
  applyConnectionCommand,
  applyLobbyCommand,
  createLobbySession,
  projectHostLobby,
  projectPlayerLobby,
  type HostActor,
  type LobbyCommand,
  type LobbyServices,
  type PlayerActor,
} from '@project-havoc/game-core'
import {
  PROTOCOL_VERSION,
  validateClientMessage,
  type ClientMessage,
  type ProtocolErrorCode,
  type ServerMessage,
} from '@project-havoc/protocol'
import {
  DEFAULT_CHAOS_TIMING,
  applyChaosAction,
  autoActForPlayer,
  decisionPlayerId,
  initializeChaosGame,
  projectChaosPlayer,
  projectChaosPublic,
  tickChaosGame,
  type ChaosAction,
  type ChaosServices,
} from '@project-havoc/rules-chaos'
import type { Server, Socket } from 'socket.io'

import type { ServerConfig } from './config.js'
import type { Logger } from './logging.js'
import { RateLimiter } from './rateLimiter.js'
import type { InMemoryRoomRepository, StoredRoom } from './roomRepository.js'

const CLIENT_EVENT = 'client.message'
const SERVER_EVENT = 'server.message'
const ROOM_PREFIX = 'havoc:'
const GAME_TICK_MS = 400
/** Nach so langer Abwesenheit zieht der Server automatisch für den Spieler, damit die Partie weiterläuft. */
const AWAY_AUTO_ACT_MS = 30_000

type GameMessage = Extract<ClientMessage, { type: 'game.action' | 'game.rematch' }>
type LobbyMessage = Exclude<ClientMessage, { type: 'room.create' | 'room.join' | 'room.reconnect-player' | 'room.reconnect-host' | 'game.action' | 'game.rematch' }>

interface SocketBinding {
  readonly roomId: string
  readonly role: 'display-host' | 'player'
  readonly identityId: string
  readonly reconnectToken: string
}

function identityKey(binding: Pick<SocketBinding, 'roomId' | 'role' | 'identityId'>): string {
  return `${binding.roomId}:${binding.role}:${binding.identityId}`
}

function roomChannel(roomId: string): string {
  return `${ROOM_PREFIX}${roomId}`
}

function serializedSize(value: unknown): number {
  try {
    const serialized = JSON.stringify(value)
    return serialized === undefined ? 0 : Buffer.byteLength(serialized, 'utf8')
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export class ProtocolDispatcher {
  readonly #bindings = new Map<string, SocketBinding>()
  readonly #identitySockets = new Map<string, string>()
  readonly #creationLimiter: RateLimiter
  readonly #joinLimiter: RateLimiter
  readonly #actionLimiter: RateLimiter
  readonly #invalidLimiter: RateLimiter
  #closing = false
  readonly #gameServices: ChaosServices
  readonly #ticker: ReturnType<typeof setInterval>

  constructor(
    private readonly io: Server,
    private readonly repository: InMemoryRoomRepository,
    private readonly services: LobbyServices,
    private readonly config: ServerConfig,
    private readonly logger: Logger,
    private readonly now: () => number,
  ) {
    this.#creationLimiter = new RateLimiter(config.creationRateLimit, now)
    this.#joinLimiter = new RateLimiter(config.joinRateLimit, now)
    this.#actionLimiter = new RateLimiter(config.actionRateLimit, now)
    this.#invalidLimiter = new RateLimiter(config.invalidMessageRateLimit, now)
    this.#gameServices = { random: { next: () => Math.random() }, clock: { now } }
    this.#ticker = setInterval(() => { void this.#tickGames() }, GAME_TICK_MS)
    this.#ticker.unref()
  }

  attach(socket: Socket): void {
    this.logger.log('info', { event: 'socket.connected', socketId: socket.id })
    socket.on(CLIENT_EVENT, (value: unknown) => {
      void this.#handle(socket, value).catch((error: unknown) => {
        this.logger.log('error', {
          event: 'message.failed',
          socketId: socket.id,
          detail: error instanceof Error ? error.message : 'unknown error',
        })
        this.#reject(socket, 'INTERNAL_ERROR', 'The server could not process the message.')
      })
    })
    socket.on('disconnect', () => { void this.#disconnect(socket) })
  }

  pruneRateLimits(): void {
    this.#creationLimiter.prune()
    this.#joinLimiter.prune()
    this.#actionLimiter.prune()
    this.#invalidLimiter.prune()
  }

  shutdown(): void {
    this.#closing = true
    clearInterval(this.#ticker)
    this.#bindings.clear()
    this.#identitySockets.clear()
    this.#creationLimiter.clear()
    this.#joinLimiter.clear()
    this.#actionLimiter.clear()
    this.#invalidLimiter.clear()
  }

  async #handle(socket: Socket, value: unknown): Promise<void> {
    if (this.#closing) return
    if (serializedSize(value) > this.config.maxMessageBytes) {
      this.#reject(socket, 'PAYLOAD_TOO_LARGE', 'The message exceeds the configured size limit.')
      return
    }
    if (!this.#actionLimiter.allow(socket.id)) {
      this.#reject(socket, 'RATE_LIMITED', 'Too many actions were sent.')
      return
    }
    const parsed = validateClientMessage(value)
    if (!parsed.success) {
      const key = socket.handshake.address
      const allowed = this.#invalidLimiter.allow(key)
      this.#reject(socket, allowed ? 'INVALID_MESSAGE' : 'RATE_LIMITED', 'The message is invalid.')
      return
    }

    const message = parsed.data
    if (message.type === 'room.create') {
      await this.#createRoom(socket, message)
      return
    }
    if (message.type === 'room.join') {
      await this.#joinRoom(socket, message)
      return
    }
    if (message.type === 'room.reconnect-player' || message.type === 'room.reconnect-host') {
      await this.#reconnect(socket, message)
      return
    }
    await this.#authenticatedAction(socket, message)
  }

  async #createRoom(socket: Socket, message: Extract<ClientMessage, { type: 'room.create' }>): Promise<void> {
    if (this.#bindings.has(socket.id)) {
      this.#reject(socket, 'NOT_AUTHORIZED', 'This connection already has an identity.', message.actionId)
      return
    }
    if (!this.#creationLimiter.allow(socket.handshake.address)) {
      this.#reject(socket, 'RATE_LIMITED', 'Too many rooms were created.', message.actionId)
      return
    }

    for (let attempt = 0; attempt < 32; attempt += 1) {
      const created = createLobbySession(this.services)
      if (!created.ok) {
        this.#reject(socket, created.error.code, created.error.message, message.actionId)
        return
      }
      if (!this.repository.insert(created.session, this.now())) continue
      const binding: SocketBinding = {
        roomId: created.session.roomId,
        role: 'display-host',
        identityId: created.credentials.identityId,
        reconnectToken: created.credentials.reconnectToken,
      }
      await this.#bind(socket, binding)
      this.#credentials(socket, message.actionId, created.session.roomId, created.session.roomCode, binding)
      this.#accept(socket, message.actionId, created.session.revision, false)
      await this.#broadcast(created.session.roomId)
      this.logger.log('info', { event: 'room.created', roomId: created.session.roomId })
      return
    }
    this.#reject(socket, 'INTERNAL_ERROR', 'A unique room code could not be allocated.', message.actionId)
  }

  async #joinRoom(socket: Socket, message: Extract<ClientMessage, { type: 'room.join' }>): Promise<void> {
    if (this.#bindings.has(socket.id)) {
      this.#reject(socket, 'NOT_AUTHORIZED', 'This connection already has an identity.', message.actionId)
      return
    }
    if (!this.#joinLimiter.allow(socket.handshake.address)) {
      this.#reject(socket, 'RATE_LIMITED', 'Too many room joins were attempted.', message.actionId)
      return
    }
    const room = this.repository.findByCode(message.roomCode)
    if (!room || room.session.phase === 'closed') {
      this.#reject(socket, 'ROOM_NOT_FOUND', 'The room does not exist.', message.actionId)
      return
    }
    await this.repository.serialize(room.session.roomId, async () => {
      const result = applyLobbyCommand(room.session, {
        type: 'join-player',
        actionId: message.actionId,
        expectedRevision: room.session.revision,
        name: message.name,
      }, this.services)
      this.repository.save(room, result.session, this.now())
      if (!result.ok) {
        this.#reject(socket, result.error.code, result.error.message, message.actionId, result.revision)
        return
      }
      if (!result.credentials || result.credentials.role !== 'player') {
        throw new Error('Accepted join did not provide player credentials')
      }
      const binding: SocketBinding = {
        roomId: room.session.roomId,
        role: 'player',
        identityId: result.credentials.identityId,
        reconnectToken: result.credentials.reconnectToken,
      }
      await this.#bind(socket, binding)
      this.#credentials(socket, message.actionId, room.session.roomId, room.session.roomCode, binding)
      this.#accept(socket, message.actionId, result.revision, result.replayed)
      await this.#broadcast(room.session.roomId)
    })
  }

  async #reconnect(
    socket: Socket,
    message: Extract<ClientMessage, { type: 'room.reconnect-player' | 'room.reconnect-host' }>,
  ): Promise<void> {
    if (this.#bindings.has(socket.id)) {
      this.#reject(socket, 'NOT_AUTHORIZED', 'This connection already has an identity.', message.actionId)
      return
    }
    if (!this.#joinLimiter.allow(socket.handshake.address)) {
      this.#reject(socket, 'RATE_LIMITED', 'Too many reconnects were attempted.', message.actionId)
      return
    }
    const room = this.repository.findByCode(message.roomCode)
    if (!room) {
      this.#reject(socket, 'ROOM_NOT_FOUND', 'The room does not exist.', message.actionId)
      return
    }
    await this.repository.serialize(room.session.roomId, async () => {
      const command: LobbyCommand = message.type === 'room.reconnect-player'
        ? {
            type: 'reconnect-player',
            actionId: message.actionId,
            expectedRevision: room.session.revision,
            playerId: message.playerId,
            reconnectToken: message.reconnectToken,
          }
        : {
            type: 'reconnect-host',
            actionId: message.actionId,
            expectedRevision: room.session.revision,
            hostId: message.hostId,
            reconnectToken: message.reconnectToken,
          }
      const result = applyLobbyCommand(room.session, command, this.services)
      this.repository.save(room, result.session, this.now())
      if (!result.ok) {
        this.#reject(socket, result.error.code, result.error.message, message.actionId, result.revision)
        return
      }
      const binding: SocketBinding = message.type === 'room.reconnect-player'
        ? { roomId: room.session.roomId, role: 'player', identityId: message.playerId, reconnectToken: message.reconnectToken }
        : { roomId: room.session.roomId, role: 'display-host', identityId: message.hostId, reconnectToken: message.reconnectToken }
      await this.#bind(socket, binding)
      this.#accept(socket, message.actionId, result.revision, result.replayed)
      await this.#broadcast(room.session.roomId)
    })
  }

  async #authenticatedAction(
    socket: Socket,
    message: Exclude<ClientMessage, { type: 'room.create' | 'room.join' | 'room.reconnect-player' | 'room.reconnect-host' }>,
  ): Promise<void> {
    if (message.type === 'game.action' || message.type === 'game.rematch') {
      await this.#gameAction(socket, message)
      return
    }
    const binding = this.#bindings.get(socket.id)
    if (!binding) {
      this.#reject(socket, 'NOT_AUTHORIZED', 'The connection has no authenticated identity.', message.actionId)
      return
    }
    const room = this.repository.findById(binding.roomId)
    if (!room) {
      this.#reject(socket, 'ROOM_NOT_FOUND', 'The room does not exist.', message.actionId)
      return
    }
    await this.repository.serialize(binding.roomId, async () => {
      const command = this.#toCommand(message, binding)
      if (!command) {
        this.#reject(socket, 'NOT_AUTHORIZED', 'The identity cannot perform this action.', message.actionId, room.session.revision)
        return
      }
      const result = applyLobbyCommand(room.session, command, this.services)
      this.repository.save(room, result.session, this.now())
      if (!result.ok) {
        this.#reject(socket, result.error.code, result.error.message, message.actionId, result.revision)
        return
      }
      if (result.session.phase === 'started' && !room.game) this.#startGame(room)
      this.#accept(socket, message.actionId, result.revision, result.replayed)
      await this.#broadcast(binding.roomId)
      if (result.session.phase === 'closed') {
        this.logger.log('info', { event: 'room.closed', roomId: binding.roomId })
        const sockets = await this.io.in(roomChannel(binding.roomId)).fetchSockets()
        for (const roomSocket of sockets) roomSocket.disconnect(true)
      }
    })
  }

  #startGame(room: StoredRoom): boolean {
    const identities = room.session.startedPlayerIds.flatMap((playerId) => {
      const player = room.session.players.find((candidate) => candidate.playerId === playerId)
      return player ? [{ playerId, name: player.name }] : []
    })
    // Zum Ausprobieren: HAVOC_EVENT_SECONDS=30 lässt Ereignisse alle 30 Sekunden statt alle 3 Minuten kommen.
    const eventSeconds = Number(process.env.HAVOC_EVENT_SECONDS)
    const timing = Number.isFinite(eventSeconds) && eventSeconds >= 10
      ? { ...DEFAULT_CHAOS_TIMING, firstEventMs: eventSeconds * 1000, eventIntervalMs: eventSeconds * 1000 }
      : DEFAULT_CHAOS_TIMING
    const result = initializeChaosGame(identities, this.#gameServices, timing)
    if (!result.ok) {
      this.logger.log('error', { event: 'game.start-failed', roomId: room.session.roomId, detail: result.message })
      return false
    }
    room.game = result.state
    room.awaySince = new Map()
    this.logger.log('info', { event: 'game.started', roomId: room.session.roomId })
    return true
  }

  async #gameAction(socket: Socket, message: GameMessage): Promise<void> {
    const binding = this.#bindings.get(socket.id)
    const room = binding ? this.repository.findById(binding.roomId) : undefined
    if (!binding || !room) {
      this.#reject(socket, 'NOT_AUTHORIZED', 'The connection has no authenticated identity.', message.actionId)
      return
    }
    await this.repository.serialize(binding.roomId, async () => {
      if (message.type === 'game.rematch') {
        if (binding.role !== 'display-host' || room.session.phase !== 'started') {
          this.#reject(socket, 'NOT_AUTHORIZED', 'Only the host can start a rematch.', message.actionId)
          return
        }
        if (!this.#startGame(room) || !room.game) {
          this.#reject(socket, 'GAME_RULE', 'Die neue Runde konnte nicht gestartet werden.', message.actionId)
          return
        }
        this.#accept(socket, message.actionId, room.game.revision, false)
        await this.#broadcast(binding.roomId)
        return
      }
      if (binding.role !== 'player' || !room.game) {
        this.#reject(socket, 'WRONG_PHASE', 'Es läuft gerade kein Spiel.', message.actionId)
        return
      }
      const result = applyChaosAction(room.game, this.#toChaosAction(message.action, binding.identityId), this.#gameServices)
      if (!result.ok) {
        this.#reject(socket, 'GAME_RULE', result.message, message.actionId, room.game.revision)
        return
      }
      room.game = result.state
      room.lastActivityAt = this.now()
      this.#accept(socket, message.actionId, result.state.revision, false)
      await this.#broadcast(binding.roomId)
    })
  }

  #toChaosAction(action: GameMessage extends infer M ? M extends { action: infer A } ? A : never : never, playerId: string): ChaosAction {
    switch (action.type) {
      case 'play': return {
        type: 'play', playerId, cardId: action.cardId,
        ...(action.color ? { color: action.color } : {}),
        ...(action.targetId ? { targetId: action.targetId } : {}),
      }
      case 'draw': return { type: 'draw', playerId }
      case 'keep': return { type: 'keep', playerId }
      case 'havoc': return { type: 'havoc', playerId }
      case 'catch': return { type: 'catch', playerId, targetId: action.targetId }
      case 'react': return { type: 'react', playerId, choice: action.choice, ...(action.targetId ? { targetId: action.targetId } : {}) }
    }
  }

  async #tickGames(): Promise<void> {
    if (this.#closing) return
    for (const [roomId, room] of this.repository.entries()) {
      if (!room.game || room.game.phase !== 'playing' || room.session.phase !== 'started') continue
      await this.repository.serialize(roomId, async () => {
        const game = room.game
        if (!game || game.phase !== 'playing') return
        const now = this.now()
        let next = tickChaosGame(game, this.#gameServices) ?? game
        const away = room.awaySince ?? new Map<string, number>()
        room.awaySince = away
        for (const player of room.session.players) {
          if (player.connected) away.delete(player.playerId)
          else if (!away.has(player.playerId)) away.set(player.playerId, now)
        }
        const decider = decisionPlayerId(next)
        const awayAt = decider ? away.get(decider) : undefined
        if (decider && awayAt !== undefined && now - awayAt >= AWAY_AUTO_ACT_MS && !(next.event && now < next.event.until)) {
          next = autoActForPlayer(next, decider, this.#gameServices) ?? next
        }
        if (next === game) return
        room.game = next
        await this.#broadcast(roomId)
      }).catch((error: unknown) => {
        this.logger.log('error', { event: 'game.tick-failed', roomId, detail: error instanceof Error ? error.message : 'unknown error' })
      })
    }
  }

  #toCommand(
    message: LobbyMessage,
    binding: SocketBinding,
  ): LobbyCommand | null {
    const metadata = { actionId: message.actionId, expectedRevision: message.expectedRevision }
    if (message.type === 'player.rename' || message.type === 'player.set-ready') {
      if (binding.role !== 'player') return null
      const actor: PlayerActor = { role: 'player', playerId: binding.identityId, reconnectToken: binding.reconnectToken }
      return message.type === 'player.rename'
        ? { ...metadata, type: 'rename-player', actor, name: message.name }
        : { ...metadata, type: 'set-ready', actor, ready: message.ready }
    }
    if (binding.role !== 'display-host') return null
    const actor: HostActor = { role: 'display-host', hostId: binding.identityId, reconnectToken: binding.reconnectToken }
    switch (message.type) {
      case 'room.set-mode': return { ...metadata, type: 'select-mode', actor, mode: message.mode }
      case 'room.remove-player': return { ...metadata, type: 'remove-player', actor, playerId: message.playerId }
      case 'room.start': return { ...metadata, type: 'start-session', actor }
      case 'room.close': return { ...metadata, type: 'close-session', actor }
    }
  }

  async #bind(socket: Socket, binding: SocketBinding): Promise<void> {
    const key = identityKey(binding)
    const previousSocketId = this.#identitySockets.get(key)
    this.#bindings.set(socket.id, binding)
    this.#identitySockets.set(key, socket.id)
    this.repository.changeConnections(binding.roomId, 1, this.now())
    await socket.join(roomChannel(binding.roomId))
    if (previousSocketId && previousSocketId !== socket.id) {
      this.io.sockets.sockets.get(previousSocketId)?.disconnect(true)
    }
  }

  async #disconnect(socket: Socket): Promise<void> {
    const binding = this.#bindings.get(socket.id)
    if (!binding) return
    this.#bindings.delete(socket.id)
    this.repository.changeConnections(binding.roomId, -1, this.now())
    const key = identityKey(binding)
    if (this.#identitySockets.get(key) !== socket.id || this.#closing) return
    this.#identitySockets.delete(key)
    const room = this.repository.findById(binding.roomId)
    if (!room) return
    await this.repository.serialize(binding.roomId, async () => {
      const actionId = `system_disconnect_${randomUUID().replaceAll('-', '')}`
      const result = applyConnectionCommand(room.session, binding.role === 'player'
        ? {
            type: 'disconnect-player',
            actionId,
            expectedRevision: room.session.revision,
            playerId: binding.identityId,
          }
        : { type: 'disconnect-host', actionId, expectedRevision: room.session.revision }, this.services)
      this.repository.save(room, result.session, this.now())
      await this.#broadcast(binding.roomId)
    })
    this.logger.log('info', { event: 'socket.disconnected', roomId: binding.roomId, socketId: socket.id })
  }

  async #broadcast(roomId: string): Promise<void> {
    const room = this.repository.findById(roomId)
    if (!room) return
    const sockets = await this.io.in(roomChannel(roomId)).fetchSockets()
    for (const socket of sockets) {
      const binding = this.#bindings.get(socket.id)
      if (!binding) continue
      const session = binding.role === 'display-host'
        ? projectHostLobby(room.session, binding.identityId)
        : projectPlayerLobby(room.session, binding.identityId)
      if (session) {
        socket.emit(SERVER_EVENT, {
          version: PROTOCOL_VERSION,
          type: 'session.snapshot',
          session: {
            ...session,
            players: session.players.map((player) => ({ ...player })),
            startedPlayerIds: [...session.startedPlayerIds],
            allowedActions: [...session.allowedActions],
          },
        } satisfies ServerMessage)
      }
      if (room.game && room.session.phase === 'started') {
        const now = this.now()
        const game = binding.role === 'display-host'
          ? projectChaosPublic(room.game, now)
          : projectChaosPlayer(room.game, binding.identityId, now)
        if (game) {
          socket.emit(SERVER_EVENT, {
            version: PROTOCOL_VERSION,
            type: 'game.snapshot',
            game: game as unknown as Extract<ServerMessage, { type: 'game.snapshot' }>['game'],
          } satisfies ServerMessage)
        }
      }
    }
  }

  #credentials(
    socket: Socket,
    actionId: string,
    roomId: string,
    roomCode: string,
    binding: SocketBinding,
  ): void {
    const identity = binding.role === 'display-host'
      ? { role: 'display-host' as const, hostId: binding.identityId, reconnectToken: binding.reconnectToken }
      : { role: 'player' as const, playerId: binding.identityId, reconnectToken: binding.reconnectToken }
    socket.emit(SERVER_EVENT, {
      version: PROTOCOL_VERSION,
      type: 'credentials.issued',
      actionId,
      roomId,
      roomCode,
      identity,
    } satisfies ServerMessage)
  }

  #accept(socket: Socket, actionId: string, revision: number, replayed: boolean): void {
    socket.emit(SERVER_EVENT, {
      version: PROTOCOL_VERSION,
      type: 'action.accepted',
      actionId,
      revision,
      replayed,
    } satisfies ServerMessage)
  }

  #reject(
    socket: Socket,
    code: ProtocolErrorCode,
    message: string,
    actionId?: string,
    revision?: number,
  ): void {
    socket.emit(SERVER_EVENT, {
      version: PROTOCOL_VERSION,
      type: 'action.rejected',
      ...(actionId ? { actionId } : {}),
      ...(revision === undefined ? {} : { revision }),
      error: { code, message },
    } satisfies ServerMessage)
    this.logger.log('warn', { event: 'action.rejected', socketId: socket.id, code })
  }
}
