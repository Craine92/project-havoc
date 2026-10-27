import { randomBytes } from 'node:crypto'

export interface RateLimitConfig {
  readonly limit: number
  readonly windowMs: number
}

export interface ServerConfig {
  readonly host: string
  readonly port: number
  readonly corsOrigins: readonly string[]
  readonly reconnectSecret: string
  readonly maxMessageBytes: number
  readonly cleanupIntervalMs: number
  readonly inactiveRoomTtlMs: number
  readonly orphanRoomTtlMs: number
  readonly closedRoomTtlMs: number
  readonly connectionRateLimit: RateLimitConfig
  readonly creationRateLimit: RateLimitConfig
  readonly joinRateLimit: RateLimitConfig
  readonly actionRateLimit: RateLimitConfig
  readonly invalidMessageRateLimit: RateLimitConfig
}

const MIN_SECRET_BYTES = 32

function integer(value: string | undefined, fallback: number, minimum: number): number {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`Expected an integer of at least ${minimum}, received ${value}`)
  }
  return parsed
}

function origins(value: string | undefined): readonly string[] {
  const configured = value?.split(',').map((origin) => origin.trim()).filter(Boolean)
    ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ]
  if (configured.includes('*')) throw new Error('CORS_ORIGINS must not contain a wildcard')
  return configured.map((origin) => {
    const parsed = new URL(origin)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported CORS origin protocol: ${parsed.protocol}`)
    }
    return parsed.origin
  })
}

/** Loads and validates all process-level server configuration. */
export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = environment.NODE_ENV === 'production'
  const configuredSecret = environment.RECONNECT_TOKEN_SECRET
  if (production && !configuredSecret) {
    throw new Error('RECONNECT_TOKEN_SECRET is required in production')
  }
  const reconnectSecret = configuredSecret ?? randomBytes(MIN_SECRET_BYTES).toString('base64url')
  if (Buffer.byteLength(reconnectSecret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`RECONNECT_TOKEN_SECRET must contain at least ${MIN_SECRET_BYTES} bytes`)
  }

  return {
    host: environment.HOST?.trim() || '127.0.0.1',
    port: integer(environment.PORT, 3000, 0),
    corsOrigins: origins(environment.CORS_ORIGINS),
    reconnectSecret,
    maxMessageBytes: integer(environment.MAX_MESSAGE_BYTES, 16_384, 1_024),
    cleanupIntervalMs: integer(environment.ROOM_CLEANUP_INTERVAL_MS, 60_000, 100),
    inactiveRoomTtlMs: integer(environment.INACTIVE_ROOM_TTL_MS, 6 * 60 * 60_000, 1_000),
    orphanRoomTtlMs: integer(environment.ORPHAN_ROOM_TTL_MS, 30 * 60_000, 1_000),
    closedRoomTtlMs: integer(environment.CLOSED_ROOM_TTL_MS, 5 * 60_000, 0),
    connectionRateLimit: { limit: integer(environment.CONNECTION_RATE_LIMIT, 30, 1), windowMs: 60_000 },
    creationRateLimit: { limit: integer(environment.CREATION_RATE_LIMIT, 5, 1), windowMs: 60_000 },
    joinRateLimit: { limit: integer(environment.JOIN_RATE_LIMIT, 20, 1), windowMs: 60_000 },
    actionRateLimit: { limit: integer(environment.ACTION_RATE_LIMIT, 40, 1), windowMs: 10_000 },
    invalidMessageRateLimit: { limit: integer(environment.INVALID_MESSAGE_RATE_LIMIT, 10, 1), windowMs: 10_000 },
  }
}
