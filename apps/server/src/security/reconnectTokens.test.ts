import { describe, expect, it } from 'vitest'

import { createReconnectTokenService } from './reconnectTokens.js'

const secret = 'a-server-only-secret-with-at-least-32-bytes'

describe('reconnect token service', () => {
  it('deterministically reissues a token for idempotent responses', () => {
    const service = createReconnectTokenService(secret)

    expect(service.mint('player:room:one')).toEqual(service.mint('player:room:one'))
    expect(service.mint('player:room:one').token).not.toBe(service.mint('player:room:two').token)
  })

  it('stores and compares only a digest', () => {
    const service = createReconnectTokenService(secret)
    const issued = service.mint('player:room:one')

    expect(issued.digest).not.toBe(issued.token)
    expect(service.matches(issued.token, issued.digest)).toBe(true)
    expect(service.matches('wrong-token', issued.digest)).toBe(false)
  })

  it('rejects weak server secrets', () => {
    expect(() => createReconnectTokenService('too-short')).toThrow(/at least 32 bytes/)
  })
})
