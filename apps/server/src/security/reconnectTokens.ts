import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import type { ReconnectTokenService } from '@project-havoc/game-core'

const MIN_SECRET_BYTES = 32

function digestToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('base64url')
}

/**
 * Creates opaque, deterministic reconnect credentials for idempotent issuance.
 * The secret must be supplied by server configuration and must never be logged.
 */
export function createReconnectTokenService(secret: string): ReconnectTokenService {
  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`Reconnect token secret must contain at least ${MIN_SECRET_BYTES} bytes`)
  }

  return {
    mint(subject) {
      const payload = createHmac('sha256', secret).update(subject, 'utf8').digest('base64url')
      const token = `v1_${payload}`
      return { token, digest: digestToken(token) }
    },
    digest: digestToken,
    matches(token, expectedDigest) {
      const actual = Buffer.from(digestToken(token), 'utf8')
      const expected = Buffer.from(expectedDigest, 'utf8')
      return actual.length === expected.length && timingSafeEqual(actual, expected)
    },
  }
}
