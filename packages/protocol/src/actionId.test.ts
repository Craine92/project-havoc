import { describe, expect, it } from 'vitest'

import { createActionId } from './actionId.js'
import { actionIdSchema } from './schema.js'

describe('browser-compatible action IDs', () => {
  it('uses random bytes without depending on crypto.randomUUID', () => {
    const id = createActionId('tv_create', (bytes) => { bytes.fill(0xab); return bytes })
    expect(id).toBe(`tv_create_${'ab'.repeat(16)}`)
    expect(actionIdSchema.safeParse(id).success).toBe(true)
  })

  it('rejects a prefix that would violate the protocol identifier alphabet', () => {
    expect(() => createActionId('tv create')).toThrow('prefix')
  })
})

