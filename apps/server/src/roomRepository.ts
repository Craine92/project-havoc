import type { LobbySession } from '@project-havoc/game-core'

export interface StoredRoom {
  session: LobbySession
  lastActivityAt: number
  closedAt?: number
  connectionCount: number
}

export interface RoomRetention {
  readonly inactiveRoomTtlMs: number
  readonly orphanRoomTtlMs: number
  readonly closedRoomTtlMs: number
}

export class InMemoryRoomRepository {
  readonly #roomsById = new Map<string, StoredRoom>()
  readonly #roomIdByCode = new Map<string, string>()
  readonly #queues = new Map<string, Promise<void>>()

  insert(session: LobbySession, now: number): boolean {
    if (this.#roomsById.has(session.roomId) || this.#roomIdByCode.has(session.roomCode)) return false
    this.#roomsById.set(session.roomId, { session, lastActivityAt: now, connectionCount: 0 })
    this.#roomIdByCode.set(session.roomCode, session.roomId)
    return true
  }

  findById(roomId: string): StoredRoom | undefined {
    return this.#roomsById.get(roomId)
  }

  findByCode(roomCode: string): StoredRoom | undefined {
    const roomId = this.#roomIdByCode.get(roomCode)
    return roomId ? this.#roomsById.get(roomId) : undefined
  }

  save(room: StoredRoom, session: LobbySession, now: number): void {
    room.session = session
    room.lastActivityAt = now
    if (session.phase === 'closed') room.closedAt ??= now
  }

  changeConnections(roomId: string, delta: 1 | -1, now: number): void {
    const room = this.#roomsById.get(roomId)
    if (!room) return
    room.connectionCount = Math.max(0, room.connectionCount + delta)
    room.lastActivityAt = now
  }

  async serialize<T>(roomId: string, operation: () => Promise<T> | T): Promise<T> {
    const previous = this.#queues.get(roomId) ?? Promise.resolve()
    let release: (() => void) | undefined
    const current = new Promise<void>((resolve) => { release = resolve })
    const queued = previous.then(() => current)
    this.#queues.set(roomId, queued)
    await previous
    try {
      return await operation()
    } finally {
      release?.()
      if (this.#queues.get(roomId) === queued) this.#queues.delete(roomId)
    }
  }

  collectGarbage(now: number, retention: RoomRetention): readonly string[] {
    const removed: string[] = []
    for (const [roomId, room] of this.#roomsById) {
      if (room.connectionCount > 0 || this.#queues.has(roomId)) continue
      const closedExpired = room.closedAt !== undefined && now - room.closedAt >= retention.closedRoomTtlMs
      const orphanExpired = !room.session.host.connected
        && now - room.lastActivityAt >= retention.orphanRoomTtlMs
      const inactiveExpired = now - room.lastActivityAt >= retention.inactiveRoomTtlMs
      if (closedExpired || orphanExpired || inactiveExpired) {
        this.remove(roomId)
        removed.push(roomId)
      }
    }
    return removed
  }

  remove(roomId: string): boolean {
    const room = this.#roomsById.get(roomId)
    if (!room) return false
    this.#roomsById.delete(roomId)
    this.#roomIdByCode.delete(room.session.roomCode)
    this.#queues.delete(roomId)
    return true
  }

  clear(): void {
    this.#roomsById.clear()
    this.#roomIdByCode.clear()
    this.#queues.clear()
  }

  get size(): number {
    return this.#roomsById.size
  }
}
