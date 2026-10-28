import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import {
  PROTOCOL_VERSION,
  createActionId,
  validateClientMessage,
  validateServerMessage,
  type ClientMessage,
  type PrivateSessionView,
  type ServerMessage,
} from '@project-havoc/protocol'

import { createJoinUrl, loadTvConfig } from './config.js'
import {
  clearHostCredentials,
  loadHostCredentials,
  saveHostCredentials,
  type StoredHostCredentials,
} from './credentials.js'
import type { ConnectionState, HostAction, TvLobbyModel } from './types.js'

function newActionId(label: string): string {
  return createActionId(`tv_${label}`)
}

function friendlyError(message: Extract<ServerMessage, { type: 'action.rejected' }>): string {
  switch (message.error.code) {
    case 'MIN_PLAYERS': return 'Mindestens zwei verbundene Spieler werden zum Start benötigt.'
    case 'PLAYERS_NOT_READY': return 'Noch sind nicht alle verbundenen Spieler bereit.'
    case 'STALE_REVISION': return 'Die Lobby hat sich inzwischen geändert. Der aktuelle Zustand wird neu geladen.'
    case 'RATE_LIMITED': return 'Zu viele Anfragen. Bitte einen Moment warten.'
    case 'ROOM_NOT_FOUND': return 'Diese Sitzung existiert nicht mehr.'
    case 'INVALID_RECONNECT_TOKEN':
    case 'NOT_AUTHORIZED': return 'Die Hostberechtigung ist nicht mehr gültig.'
    default: return 'Die Aktion wurde vom Server abgelehnt.'
  }
}

interface PendingRequest {
  readonly kind: HostAction
  readonly timeoutId: number
}

export const ACTION_RESPONSE_TIMEOUT_MS = 8_000

export function useTvLobby(): TvLobbyModel {
  const runtime = useMemo(() => loadTvConfig(), [])
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [session, setSession] = useState<PrivateSessionView | null>(null)
  const [pendingAction, setPendingAction] = useState<HostAction | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const credentialsRef = useRef<StoredHostCredentials | null>(loadHostCredentials())
  const pendingRef = useRef(new Map<string, PendingRequest>())
  const closedRef = useRef(false)

  const finishPending = useCallback((actionId: string): PendingRequest | undefined => {
    const pending = pendingRef.current.get(actionId)
    if (!pending) return undefined
    window.clearTimeout(pending.timeoutId)
    pendingRef.current.delete(actionId)
    setPendingAction((current) => current === pending.kind ? null : current)
    return pending
  }, [])

  const clearPending = useCallback((): void => {
    for (const pending of pendingRef.current.values()) window.clearTimeout(pending.timeoutId)
    pendingRef.current.clear()
    setPendingAction(null)
  }, [])

  const emit = useCallback((message: ClientMessage, kind: HostAction): void => {
    const socket = socketRef.current
    if (!socket?.connected) {
      setConnection(credentialsRef.current ? 'lost' : 'unavailable')
      setNotice('Backend nicht gestartet oder nicht erreichbar. Starte mit npm run dev und prüfe die ausgegebene Backend-Adresse.')
      return
    }
    if ([...pendingRef.current.values()].some((pending) => pending.kind === kind)) return
    const timeoutId = window.setTimeout(() => {
      if (!finishPending(message.actionId)) return
      setNotice(kind === 'create'
        ? 'Der Server hat die Raumerstellung nicht rechtzeitig bestätigt. Bitte erneut versuchen.'
        : 'Der Server hat die Aktion nicht rechtzeitig bestätigt. Bitte erneut versuchen.')
    }, ACTION_RESPONSE_TIMEOUT_MS)
    pendingRef.current.set(message.actionId, { kind, timeoutId })
    setPendingAction(kind)
    setNotice(null)
    socket.emit('client.message', message)
  }, [finishPending])

  const reconnectHost = useCallback((): void => {
    const credentials = credentialsRef.current
    if (!credentials) return
    const parsed = validateClientMessage({
      version: PROTOCOL_VERSION,
      type: 'room.reconnect-host',
      actionId: newActionId('reconnect'),
      expectedRevision: credentials.revision,
      roomCode: credentials.roomCode,
      hostId: credentials.hostId,
      reconnectToken: credentials.reconnectToken,
    })
    if (!parsed.success) {
      setConnection('protocol-error')
      setNotice('Die lokal gespeicherten Sitzungsdaten sind ungültig.')
      return
    }
    setConnection('reconnecting')
    emit(parsed.data, 'reconnect')
  }, [emit])

  useEffect(() => {
    const socket = io(runtime.serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3_000,
      timeout: 3_000,
    })
    socketRef.current = socket

    function onConnect(): void {
      if (credentialsRef.current) reconnectHost()
      else setConnection('connected')
    }

    function onConnectError(): void {
      setConnection(credentialsRef.current ? 'reconnecting' : 'unavailable')
      setNotice(credentialsRef.current
        ? 'Die Verbindung ist unterbrochen. Wiederherstellung läuft …'
        : 'Backend nicht gestartet oder nicht erreichbar. Starte mit npm run dev.')
    }

    function onDisconnect(): void {
      if (closedRef.current) return
      clearPending()
      setConnection(credentialsRef.current ? 'lost' : 'unavailable')
      setNotice('Verbindung verloren. Der Client versucht, die Sitzung wiederherzustellen.')
    }

    function onReconnectAttempt(): void {
      setConnection('reconnecting')
    }

    function onReconnectFailed(): void {
      setConnection(credentialsRef.current ? 'lost' : 'unavailable')
      setNotice('Die automatische Wiederverbindung ist fehlgeschlagen.')
    }

    function onServerMessage(value: unknown): void {
      const parsed = validateServerMessage(value)
      if (!parsed.success) {
        setConnection('protocol-error')
        setNotice('Der Server hat eine nicht unterstützte Nachricht gesendet.')
        socket.disconnect()
        return
      }
      const message = parsed.data
      if (message.type === 'credentials.issued') {
        if (message.identity.role !== 'display-host') {
          setConnection('protocol-error')
          setNotice('Der Server hat eine unpassende Identität ausgegeben.')
          return
        }
        const stored: StoredHostCredentials = {
          roomId: message.roomId,
          roomCode: message.roomCode,
          hostId: message.identity.hostId,
          reconnectToken: message.identity.reconnectToken,
          revision: 0,
        }
        credentialsRef.current = stored
        saveHostCredentials(stored)
        return
      }
      if (message.type === 'action.accepted') {
        finishPending(message.actionId)
        return
      }
      if (message.type === 'action.rejected') {
        const pending = message.actionId ? finishPending(message.actionId) : undefined
        setNotice(friendlyError(message))
        if (pending?.kind === 'reconnect') {
          const invalidSession = message.error.code === 'ROOM_NOT_FOUND'
          const hostLost = message.error.code === 'INVALID_RECONNECT_TOKEN' || message.error.code === 'NOT_AUTHORIZED'
          if (invalidSession) setConnection('session-invalid')
          else if (hostLost) {
            setConnection('host-lost')
          }
          if (invalidSession || hostLost) {
            setSession(null)
            clearHostCredentials()
            credentialsRef.current = null
          }
        } else if (message.error.code === 'STALE_REVISION') {
          socket.disconnect().connect()
        }
        return
      }
      if (message.session.visibility !== 'private' || message.session.viewer.role !== 'display-host') {
        setConnection('host-lost')
        setNotice('Für diese Verbindung liegt keine gültige Hostansicht vor.')
        return
      }
      const snapshot = message.session
      setSession(snapshot)
      setConnection('connected')
      setNotice(null)
      const credentials = credentialsRef.current
      if (credentials) {
        const updated = { ...credentials, revision: snapshot.revision }
        credentialsRef.current = updated
        saveHostCredentials(updated)
      }
      if (snapshot.phase === 'closed') {
        closedRef.current = true
        clearHostCredentials()
        credentialsRef.current = null
      }
    }

    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)
    socket.on('disconnect', onDisconnect)
    socket.io.on('reconnect_attempt', onReconnectAttempt)
    socket.io.on('reconnect_failed', onReconnectFailed)
    socket.on('server.message', onServerMessage)
    socket.connect()
    const pendingRequests = pendingRef.current

    return () => {
      socket.off('connect', onConnect)
      socket.off('connect_error', onConnectError)
      socket.off('disconnect', onDisconnect)
      socket.off('server.message', onServerMessage)
      socket.io.off('reconnect_attempt', onReconnectAttempt)
      socket.io.off('reconnect_failed', onReconnectFailed)
      for (const pending of pendingRequests.values()) window.clearTimeout(pending.timeoutId)
      pendingRequests.clear()
      socket.disconnect()
      socketRef.current = null
    }
  }, [clearPending, finishPending, reconnectHost, runtime.serverUrl])

  const sendHostAction = useCallback((value: object, kind: HostAction): void => {
    const revision = session?.revision ?? credentialsRef.current?.revision ?? 0
    const parsed = validateClientMessage({
      version: PROTOCOL_VERSION,
      actionId: newActionId(kind),
      expectedRevision: revision,
      ...value,
    })
    if (!parsed.success) {
      setConnection('protocol-error')
      setNotice('Die Aktion konnte nicht protokollkonform erstellt werden.')
      return
    }
    emit(parsed.data, kind)
  }, [emit, session?.revision])

  const joinDetails = session ? createJoinUrl(runtime, session.roomCode) : null

  return {
    connection,
    session,
    pendingAction,
    notice,
    serverUrl: runtime.serverUrl,
    joinUrl: joinDetails?.url ?? null,
    joinUrlWarning: joinDetails?.warning ?? null,
    createRoom: () => sendHostAction({ type: 'room.create' }, 'create'),
    selectMode: (mode) => sendHostAction({ type: 'room.set-mode', mode }, 'set-mode'),
    startSession: () => sendHostAction({ type: 'room.start' }, 'start'),
    closeRoom: () => sendHostAction({ type: 'room.close' }, 'close'),
    retryConnection: () => {
      setConnection(credentialsRef.current ? 'reconnecting' : 'connecting')
      setNotice(null)
      socketRef.current?.connect()
    },
    resetSession: () => {
      clearHostCredentials()
      credentialsRef.current = null
      closedRef.current = false
      clearPending()
      setSession(null)
      setPendingAction(null)
      setNotice(null)
      if (socketRef.current?.connected) setConnection('connected')
      else {
        setConnection('connecting')
        socketRef.current?.connect()
      }
    },
  }
}
