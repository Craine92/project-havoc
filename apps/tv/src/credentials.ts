const STORAGE_KEY = 'project-havoc:tv-host:v1'

export interface StoredHostCredentials {
  readonly roomId: string
  readonly roomCode: string
  readonly hostId: string
  readonly reconnectToken: string
  readonly revision: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function loadHostCredentials(storage: Storage = window.sessionStorage): StoredHostCredentials | null {
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    if (!isRecord(value)) return null
    const record = value
    if (typeof record.roomId !== 'string'
      || typeof record.roomCode !== 'string'
      || typeof record.hostId !== 'string'
      || typeof record.reconnectToken !== 'string'
      || typeof record.revision !== 'number') return null
    return {
      roomId: record.roomId,
      roomCode: record.roomCode,
      hostId: record.hostId,
      reconnectToken: record.reconnectToken,
      revision: record.revision,
    }
  } catch {
    return null
  }
}

export function saveHostCredentials(credentials: StoredHostCredentials, storage: Storage = window.sessionStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(credentials))
  } catch {
    // A privacy-restricted browser can deny storage. The active tab still works.
  }
}

export function clearHostCredentials(storage: Storage = window.sessionStorage): void {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}
