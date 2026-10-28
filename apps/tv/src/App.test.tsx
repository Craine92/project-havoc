// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PrivateSessionView } from '@project-havoc/protocol'

import { LobbyScreen, StartScreen, StartedScreen } from './App.js'
import type { TvLobbyModel } from './types.js'

function session(overrides: Partial<PrivateSessionView> = {}): PrivateSessionView {
  return {
    visibility: 'private',
    roomId: 'room_component_001',
    roomCode: 'HVC234',
    phase: 'lobby',
    revision: 3,
    selectedMode: null,
    hostConnected: true,
    minPlayers: 2,
    maxPlayers: 8,
    players: [],
    startedPlayerIds: [],
    viewer: { role: 'display-host', hostId: 'host_component_001' },
    allowedActions: ['room.set-mode', 'room.close'],
    ...overrides,
  }
}

function model(overrides: Partial<TvLobbyModel> = {}): TvLobbyModel {
  return {
    connection: 'connected',
    session: null,
    pendingAction: null,
    notice: null,
    serverUrl: 'http://127.0.0.1:3000',
    joinUrl: null,
    joinUrlWarning: null,
    createRoom: vi.fn(),
    selectMode: vi.fn(),
    startSession: vi.fn(),
    closeRoom: vi.fn(),
    retryConnection: vi.fn(),
    resetSession: vi.fn(),
    ...overrides,
  }
}

afterEach(cleanup)

describe('TV lobby components', () => {
  it('shows the real server state on the start screen and creates only on user intent', () => {
    const createRoom = vi.fn()
    render(<StartScreen model={model({ createRoom })} />)

    expect(screen.getByText('Server verbunden')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /neues spiel/i }))
    expect(createRoom).toHaveBeenCalledOnce()
  })

  it('shows creation progress, prevents duplicate clicks, and offers a retry after failure', () => {
    const createRoom = vi.fn()
    const { rerender } = render(<StartScreen model={model({ createRoom, pendingAction: 'create' })} />)

    const pendingButton = screen.getByRole('button', { name: /raum wird erschaffen/i })
    expect(pendingButton.hasAttribute('disabled')).toBe(true)
    fireEvent.click(pendingButton)
    expect(createRoom).not.toHaveBeenCalled()

    rerender(<StartScreen model={model({ createRoom, notice: 'Raumerstellung fehlgeschlagen' })} />)
    fireEvent.click(screen.getByRole('button', { name: /erneut versuchen/i }))
    expect(createRoom).toHaveBeenCalledOnce()
  })

  it('disables room creation while the server is unavailable', () => {
    render(<StartScreen model={model({ connection: 'unavailable', notice: 'Server offline' })} />)

    expect(screen.getByRole('button', { name: /neues spiel/i }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('Server offline')
    expect(screen.getByRole('button', { name: /erneut verbinden/i }).hasAttribute('disabled')).toBe(false)
  })

  it('renders an empty authoritative room with eight placeholders', () => {
    const current = session()
    render(<LobbyScreen model={model({ session: current, joinUrl: 'http://havoc.local/join?room=HVC234' })} />)

    expect(screen.getByTestId('room-code').textContent).toContain('HVC234')
    expect(screen.getAllByText('Freier Platz')).toHaveLength(8)
    expect(screen.getByRole('button', { name: /spiel starten/i }).hasAttribute('disabled')).toBe(true)
  })

  it('shows configuration guidance and no QR code when no reachable controller URL exists', () => {
    render(<LobbyScreen model={model({
      session: session(),
      joinUrl: null,
      joinUrlWarning: 'Keine erreichbare Controller-Adresse erkannt. Starte mit npm run dev.',
    })} />)

    expect(screen.getByText(/npm run dev/i)).toBeTruthy()
    expect(document.querySelector('.qr-code')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('uses server allowedActions and does not optimistically change the selected mode', () => {
    const selectMode = vi.fn()
    const current = session({ selectedMode: 'classic' })
    render(<LobbyScreen model={model({ session: current, selectMode })} />)

    fireEvent.click(screen.getByRole('button', { name: /chaos/i }))
    expect(selectMode).toHaveBeenCalledWith('chaos')
    expect(screen.getByRole('button', { name: /classic/i }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /chaos/i }).getAttribute('aria-pressed')).toBe('false')
  })

  it('enables start only when the server projection allows it', () => {
    const startSession = vi.fn()
    const current = session({
      players: [
        { playerId: 'player_component_01', name: 'Nova', seat: 0, ready: true, connected: true },
        { playerId: 'player_component_02', name: 'Rex', seat: 1, ready: true, connected: true },
      ],
      allowedActions: ['room.set-mode', 'room.remove-player', 'room.start', 'room.close'],
    })
    render(<LobbyScreen model={model({ session: current, startSession })} />)

    fireEvent.click(screen.getByRole('button', { name: /spiel starten/i }))
    expect(startSession).toHaveBeenCalledOnce()
  })

  it('requires confirmation before closing a room', () => {
    const closeRoom = vi.fn()
    render(<LobbyScreen model={model({ session: session(), closeRoom })} />)

    fireEvent.click(screen.getByRole('button', { name: /raum schließen/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(closeRoom).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: /raum schließen/i })[1]!)
    expect(closeRoom).toHaveBeenCalledOnce()
  })

  it('renders the neutral started screen without gameplay', () => {
    render(<StartedScreen model={model({
      session: session({
        phase: 'started',
        players: [
          { playerId: 'player_component_01', name: 'Nova', seat: 1, connected: true, ready: true },
          { playerId: 'player_component_02', name: 'Mira', seat: 2, connected: true, ready: true },
        ],
        startedPlayerIds: ['player_component_01', 'player_component_02'],
        allowedActions: ['room.close'],
      }),
    })} />)

    expect(screen.getByRole('heading', { name: /portal ist offen/i })).toBeTruthy()
    expect(screen.getByText(/2 spieler sind bereit/i)).toBeTruthy()
    expect(screen.getByText('Nova')).toBeTruthy()
    expect(screen.getByText('Mira')).toBeTruthy()
  })
})
