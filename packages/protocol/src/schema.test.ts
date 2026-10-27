import { describe, expect, it } from 'vitest'

import {
  PROTOCOL_VERSION,
  publicSessionViewSchema,
  validateClientMessage,
  validateServerMessage,
} from './index.js'

const actionId = 'action_1234567890'

describe('client protocol validation', () => {
  it('accepts a valid room join message', () => {
    const result = validateClientMessage({
      version: PROTOCOL_VERSION,
      type: 'room.join',
      actionId,
      expectedRevision: 0,
      roomCode: 'HVC234',
      name: 'Nova',
    })

    expect(result.success).toBe(true)
  })

  it('rejects an unsupported protocol version', () => {
    const result = validateClientMessage({
      version: 2,
      type: 'room.start',
      actionId,
      expectedRevision: 4,
    })

    expect(result.success).toBe(false)
  })

  it('rejects malformed room codes and extra fields', () => {
    const result = validateClientMessage({
      version: PROTOCOL_VERSION,
      type: 'room.join',
      actionId,
      expectedRevision: 0,
      roomCode: 'O0I1',
      name: 'Nova',
      admin: true,
    })

    expect(result.success).toBe(false)
  })

  it('rejects short reconnect tokens', () => {
    const result = validateClientMessage({
      version: PROTOCOL_VERSION,
      type: 'room.reconnect-player',
      actionId,
      expectedRevision: 3,
      roomCode: 'HVC234',
      playerId: 'player_12345678',
      reconnectToken: 'too-short',
    })

    expect(result.success).toBe(false)
  })
})

describe('server protocol validation', () => {
  const publicSession = {
    visibility: 'public',
    roomId: 'room_12345678',
    roomCode: 'HVC234',
    phase: 'lobby',
    revision: 2,
    selectedMode: null,
    hostConnected: true,
    minPlayers: 2,
    maxPlayers: 8,
    players: [],
    startedPlayerIds: [],
  } as const

  it('accepts a public snapshot response', () => {
    const result = validateServerMessage({
      version: PROTOCOL_VERSION,
      type: 'session.snapshot',
      session: publicSession,
    })

    expect(result.success).toBe(true)
  })

  it('forbids reconnect tokens in a public projection', () => {
    const result = publicSessionViewSchema.safeParse({
      ...publicSession,
      reconnectToken: 'secret_token_12345678901234567890',
    })

    expect(result.success).toBe(false)
  })
})
