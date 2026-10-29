// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const socketState = vi.hoisted(() => ({
  handlers: new Map<string, (value?: unknown) => void>(),
  managerHandlers: new Map<string, () => void>(),
  emit: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: () => ({
    connected: true,
    on(event: string, handler: (value?: unknown) => void) { socketState.handlers.set(event, handler) },
    off(event: string) { socketState.handlers.delete(event) },
    emit: socketState.emit,
    connect() { socketState.handlers.get('connect')?.() },
    disconnect() {},
    io: {
      on(event: string, handler: () => void) { socketState.managerHandlers.set(event, handler) },
      off(event: string) { socketState.managerHandlers.delete(event) },
    },
  }),
}))

import { ACTION_RESPONSE_TIMEOUT_MS, useTvLobby } from './useTvLobby.js'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  socketState.handlers.clear()
  socketState.managerHandlers.clear()
  socketState.emit.mockClear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('TV lobby request lifecycle', () => {
  it('emits one valid create command and recovers visibly when the server never responds', async () => {
    const { result } = renderHook(() => useTvLobby())
    expect(result.current.connection).toBe('connected')

    act(() => {
      result.current.createRoom()
      result.current.createRoom()
    })

    expect(socketState.emit).toHaveBeenCalledOnce()
    expect(socketState.emit).toHaveBeenCalledWith('client.message', expect.objectContaining({
      version: 1,
      type: 'room.create',
      expectedRevision: 0,
      actionId: expect.stringMatching(/^tv_create_/),
    }))
    expect(result.current.pendingAction).toBe('create')

    act(() => { vi.advanceTimersByTime(ACTION_RESPONSE_TIMEOUT_MS) })

    expect(result.current.pendingAction).toBeNull()
    expect(result.current.notice).toContain('nicht rechtzeitig bestätigt')
  })
})
