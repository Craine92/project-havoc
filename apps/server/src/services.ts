import { randomInt, randomUUID } from 'node:crypto'

import type { LobbyServices } from '@project-havoc/game-core'

import { createReconnectTokenService } from './security/reconnectTokens.js'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function roomCode(): string {
  let result = ''
  for (let index = 0; index < 6; index += 1) {
    result += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
  }
  return result
}

export function createProductionLobbyServices(secret: string, now: () => number): LobbyServices {
  return {
    now,
    newRoomId: () => `room_${randomUUID().replaceAll('-', '')}`,
    newRoomCode: roomCode,
    newHostId: () => `host_${randomUUID().replaceAll('-', '')}`,
    newPlayerId: () => `player_${randomUUID().replaceAll('-', '')}`,
    reconnectTokens: createReconnectTokenService(secret),
  }
}
