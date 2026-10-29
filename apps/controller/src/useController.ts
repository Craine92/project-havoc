import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { normalizePlayerName } from '@project-havoc/game-core'
import { PROTOCOL_VERSION, createActionId, roomCodeSchema, validateClientMessage, validateServerMessage, type ClientMessage, type PrivateSessionView, type ServerMessage } from '@project-havoc/protocol'

import { loadControllerConfig } from './config.js'
import { clearPlayerCredentials, loadPlayerCredentials, savePlayerCredentials, type PlayerCredentials } from './credentials.js'
import type { ControllerAction, ControllerConnection, ControllerModel } from './types.js'

const actionId = (kind: string): string => createActionId(`phone_${kind}`)

function rejectionText(message: Extract<ServerMessage, { type: 'action.rejected' }>): string {
  switch (message.error.code) {
    case 'ROOM_NOT_FOUND': return 'Dieser Raum wurde nicht gefunden. Prüfe den Code am Fernseher.'
    case 'ROOM_FULL': return 'Der Raum ist bereits voll.'
    case 'NAME_TAKEN': return 'Dieser Name ist schon vergeben. Wähle einen anderen.'
    case 'INVALID_NAME': return 'Der Name muss 2 bis 16 Zeichen lang sein.'
    case 'WRONG_PHASE': return 'Dieser Raum wurde bereits gestartet oder geschlossen.'
    case 'RATE_LIMITED': return 'Zu viele Versuche. Warte kurz und versuche es erneut.'
    case 'STALE_REVISION': return 'Die Lobby hat sich geändert. Dein Zustand wird neu geladen.'
    case 'INVALID_RECONNECT_TOKEN':
    case 'NOT_AUTHORIZED': return 'Deine gespeicherte Spielerberechtigung ist nicht mehr gültig.'
    default: return 'Der Server hat die Aktion abgelehnt.'
  }
}

export function useController(initialRoomCode: string): ControllerModel {
  const config = useMemo(() => loadControllerConfig(), [])
  const [connection, setConnection] = useState<ControllerConnection>('connecting')
  const [session, setSession] = useState<PrivateSessionView | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState<ControllerAction | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const credentialsRef = useRef<PlayerCredentials | null>(initialRoomCode ? loadPlayerCredentials(initialRoomCode) : null)
  const pendingKinds = useRef(new Map<string, ControllerAction>())
  const closedRef = useRef(false)

  const emit = useCallback((message: ClientMessage, kind: ControllerAction): void => {
    const socket = socketRef.current
    if (!socket?.connected) {
      setConnection(credentialsRef.current ? 'lost' : 'unavailable')
      setNotice('Backend nicht erreichbar. Prüfe, ob npm run dev läuft, beide Geräte im selben WLAN sind und Node.js im privaten Firewall-Netz erlaubt ist.')
      return
    }
    pendingKinds.current.set(message.actionId, kind)
    setPending(kind)
    setNotice(null)
    socket.emit('client.message', message)
  }, [])

  const reconnect = useCallback((): void => {
    const credentials = credentialsRef.current
    if (!credentials) return
    const parsed = validateClientMessage({
      version: PROTOCOL_VERSION,
      type: 'room.reconnect-player',
      actionId: actionId('reconnect'),
      expectedRevision: credentials.revision,
      roomCode: credentials.roomCode,
      playerId: credentials.playerId,
      reconnectToken: credentials.reconnectToken,
    })
    if (!parsed.success) {
      setConnection('protocol-error')
      setNotice('Die gespeicherten Verbindungsdaten sind ungültig.')
      return
    }
    setConnection('reconnecting')
    emit(parsed.data, 'reconnect')
  }, [emit])

  useEffect(() => {
    const socket = io(config.serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3_000,
      timeout: 3_000,
    })
    socketRef.current = socket

    const onConnect = (): void => { if (credentialsRef.current) reconnect(); else setConnection('connected') }
    const onConnectError = (): void => {
      setConnection(credentialsRef.current ? 'reconnecting' : 'unavailable')
      setNotice('Backend nicht erreichbar. Prüfe npm run dev, WLAN und die Windows-Firewall für private Netzwerke.')
    }
    const onDisconnect = (): void => {
      if (closedRef.current) return
      setConnection(credentialsRef.current ? 'lost' : 'unavailable')
      setNotice('Verbindung verloren. Wiederherstellung läuft …')
    }
    const onServerMessage = (value: unknown): void => {
      const parsed = validateServerMessage(value)
      if (!parsed.success) {
        setConnection('protocol-error')
        setNotice('Der Server hat eine ungültige Nachricht gesendet.')
        socket.disconnect()
        return
      }
      const message = parsed.data
      if (message.type === 'credentials.issued') {
        if (message.identity.role !== 'player') {
          setConnection('protocol-error'); setNotice('Der Server hat eine falsche Rolle ausgegeben.'); return
        }
        const credentials: PlayerCredentials = {
          roomId: message.roomId,
          roomCode: message.roomCode,
          playerId: message.identity.playerId,
          reconnectToken: message.identity.reconnectToken,
          revision: 0,
        }
        credentialsRef.current = credentials
        setPlayerId(credentials.playerId)
        savePlayerCredentials(credentials)
        window.history.replaceState(null, '', `?room=${encodeURIComponent(message.roomCode)}`)
        return
      }
      if (message.type === 'action.accepted') {
        pendingKinds.current.delete(message.actionId)
        setPending(null)
        return
      }
      if (message.type === 'action.rejected') {
        const kind = message.actionId ? pendingKinds.current.get(message.actionId) : undefined
        if (message.actionId) pendingKinds.current.delete(message.actionId)
        setPending(null)
        setNotice(rejectionText(message))
        const invalidCredential = kind === 'reconnect'
          && (message.error.code === 'INVALID_RECONNECT_TOKEN' || message.error.code === 'NOT_AUTHORIZED' || message.error.code === 'ROOM_NOT_FOUND')
        if (invalidCredential) {
          const roomCode = credentialsRef.current?.roomCode
          if (roomCode) clearPlayerCredentials(roomCode)
          credentialsRef.current = null
          setPlayerId(null)
          setSession(null)
          setConnection('connected')
        } else if (message.error.code === 'STALE_REVISION') {
          socket.disconnect().connect()
        }
        return
      }
      if (message.session.visibility !== 'private' || message.session.viewer.role !== 'player') {
        setConnection('protocol-error'); setNotice('Der Server hat keine private Spieleransicht geliefert.'); return
      }
      setSession(message.session)
      setPlayerId(message.session.viewer.playerId)
      setConnection('connected')
      setNotice(null)
      const credentials = credentialsRef.current
      if (credentials) {
        const updated = { ...credentials, revision: message.session.revision }
        credentialsRef.current = updated
        savePlayerCredentials(updated)
      }
      if (message.session.phase === 'closed') {
        closedRef.current = true
        if (credentials) clearPlayerCredentials(credentials.roomCode)
        credentialsRef.current = null
      }
    }

    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)
    socket.on('disconnect', onDisconnect)
    socket.io.on('reconnect_attempt', () => setConnection('reconnecting'))
    socket.io.on('reconnect_failed', () => setConnection('lost'))
    socket.on('server.message', onServerMessage)
    socket.connect()
    return () => { socket.removeAllListeners(); socket.io.removeAllListeners(); socket.disconnect(); socketRef.current = null }
  }, [config.serverUrl, reconnect])

  const send = useCallback((payload: object, kind: ControllerAction): void => {
    const parsed = validateClientMessage({
      version: PROTOCOL_VERSION,
      actionId: actionId(kind),
      expectedRevision: session?.revision ?? credentialsRef.current?.revision ?? 0,
      ...payload,
    })
    if (!parsed.success) { setNotice('Die Aktion enthält ungültige Eingaben.'); return }
    emit(parsed.data, kind)
  }, [emit, session?.revision])

  return {
    connection, session, playerId, notice, pending, serverUrl: config.serverUrl,
    join(roomCode, name) {
      const code = roomCode.trim().toUpperCase()
      if (!roomCodeSchema.safeParse(code).success) return 'Der Raumcode besteht aus sechs Zeichen.'
      const normalized = normalizePlayerName(name)
      if (!normalized.ok) return 'Der Name muss 2 bis 16 sichtbare Zeichen lang sein.'
      const existing = loadPlayerCredentials(code)
      if (existing) {
        credentialsRef.current = existing
        setPlayerId(existing.playerId)
        reconnect()
        return null
      }
      send({ type: 'room.join', roomCode: code, name: normalized.name }, 'join')
      return null
    },
    setReady(ready) { send({ type: 'player.set-ready', ready }, 'ready') },
    rename(name) {
      const normalized = normalizePlayerName(name)
      if (!normalized.ok) return 'Der Name muss 2 bis 16 sichtbare Zeichen lang sein.'
      send({ type: 'player.rename', name: normalized.name }, 'rename')
      return null
    },
    retry() { setNotice(null); socketRef.current?.connect() },
    forgetSession() {
      const roomCode = credentialsRef.current?.roomCode ?? session?.roomCode
      if (roomCode) clearPlayerCredentials(roomCode)
      credentialsRef.current = null
      closedRef.current = false
      setSession(null); setPlayerId(null); setNotice(null); setPending(null); setConnection(socketRef.current?.connected ? 'connected' : 'connecting')
    },
  }
}
