export interface PlayerCredentials {
  readonly roomId: string
  readonly roomCode: string
  readonly playerId: string
  readonly reconnectToken: string
  readonly revision: number
}

const prefix = 'project-havoc:player:v1:'
const key = (roomCode: string): string => `${prefix}${roomCode}`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function loadPlayerCredentials(roomCode: string, storage: Storage = window.localStorage): PlayerCredentials | null {
  try {
    const value: unknown = JSON.parse(storage.getItem(key(roomCode)) ?? 'null')
    if (!isRecord(value)
      || typeof value.roomId !== 'string'
      || typeof value.roomCode !== 'string'
      || typeof value.playerId !== 'string'
      || typeof value.reconnectToken !== 'string'
      || typeof value.revision !== 'number') return null
    return {
      roomId: value.roomId,
      roomCode: value.roomCode,
      playerId: value.playerId,
      reconnectToken: value.reconnectToken,
      revision: value.revision,
    }
  } catch { return null }
}

export function savePlayerCredentials(value: PlayerCredentials, storage: Storage = window.localStorage): void {
  try { storage.setItem(key(value.roomCode), JSON.stringify(value)) } catch { /* Active connection remains usable. */ }
}

export function clearPlayerCredentials(roomCode: string, storage: Storage = window.localStorage): void {
  try { storage.removeItem(key(roomCode)) } catch { /* Storage can be unavailable in privacy modes. */ }
}
