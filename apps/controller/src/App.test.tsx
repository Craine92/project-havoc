// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PrivateSessionView } from '@project-havoc/protocol'

import { JoinScreen, LobbyScreen } from './App.js'
import type { ControllerModel } from './types.js'

function snapshot(overrides: Partial<PrivateSessionView> = {}): PrivateSessionView {
  return {
    visibility: 'private', roomId: 'room_controller_001', roomCode: 'HVC234', phase: 'lobby', revision: 2,
    selectedMode: 'classic', hostConnected: true, minPlayers: 2, maxPlayers: 8,
    players: [{ playerId: 'player_controller_001', name: 'Nova', seat: 0, ready: false, connected: true }],
    startedPlayerIds: [], viewer: { role: 'player', playerId: 'player_controller_001' },
    allowedActions: ['player.rename', 'player.set-ready'], ...overrides,
  }
}

function model(overrides: Partial<ControllerModel> = {}): ControllerModel {
  return {
    connection: 'connected', session: null, playerId: null, notice: null, pending: null,
    serverUrl: 'http://127.0.0.1:3000', join: vi.fn(() => null), setReady: vi.fn(), rename: vi.fn(() => null), retry: vi.fn(), forgetSession: vi.fn(), ...overrides,
  }
}

afterEach(cleanup)

describe('smartphone controller components', () => {
  it('prefills a room code supplied by the join URL', () => {
    render(<JoinScreen model={model()} initialCode="HVC234" />)
    expect(screen.getByTestId('room-input').getAttribute('value')).toBe('HVC234')
  })

  it('submits manual room code and name', () => {
    const join = vi.fn(() => null)
    render(<JoinScreen model={model({ join })} initialCode="" />)
    fireEvent.change(screen.getByTestId('room-input'), { target: { value: 'HVC234' } })
    fireEvent.change(screen.getByPlaceholderText(/wie sollen/i), { target: { value: 'Nova' } })
    fireEvent.click(screen.getByRole('button', { name: /raum beitreten/i }))
    expect(join).toHaveBeenCalledWith('HVC234', 'Nova')
  })

  it('shows local validation without a fake session', () => {
    render(<JoinScreen model={model({ join: () => 'Der Raumcode besteht aus sechs Zeichen.' })} initialCode="" />)
    fireEvent.click(screen.getByRole('button', { name: /raum beitreten/i }))
    expect(screen.getByRole('alert').textContent).toContain('sechs Zeichen')
  })

  it('uses player allowedActions for the ready control', () => {
    const setReady = vi.fn()
    render(<LobbyScreen model={model({ session: snapshot(), playerId: 'player_controller_001', setReady })} />)
    fireEvent.click(screen.getByRole('button', { name: /bereit machen/i }))
    expect(setReady).toHaveBeenCalledWith(true)
  })

  it('disables player actions when the server projection removes permission', () => {
    render(<LobbyScreen model={model({ session: snapshot({ allowedActions: [] }), playerId: 'player_controller_001' })} />)
    expect(screen.getByRole('button', { name: /bereit machen/i }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /namen ändern/i }).hasAttribute('disabled')).toBe(true)
  })
})
