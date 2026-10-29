import type { LobbyServices } from '@project-havoc/game-core'

export interface DeterministicLobbyServices extends LobbyServices {
  advanceTime(milliseconds: number): void
}

export function createDeterministicLobbyServices(): DeterministicLobbyServices {
  let now = 1_800_000_000_000
  let playerSequence = 0

  function tokenFor(subject: string): string {
    const safeSubject = subject.replace(/[^A-Za-z0-9_-]/g, '_')
    return `test_token_${safeSubject}`.padEnd(64, 'x')
  }

  return {
    now: () => now,
    newRoomId: () => 'room_test_0001',
    newRoomCode: () => 'HVC234',
    newHostId: () => 'host_test_0001',
    newPlayerId: () => {
      playerSequence += 1
      return `player_test_${playerSequence.toString().padStart(4, '0')}`
    },
    reconnectTokens: {
      mint(subject) {
        const token = tokenFor(subject)
        return { token, digest: `digest_${token}` }
      },
      digest(token) {
        return `digest_${token}`
      },
      matches(token, digest) {
        return `digest_${token}` === digest
      },
    },
    advanceTime(milliseconds) {
      now += milliseconds
    },
  }
}
