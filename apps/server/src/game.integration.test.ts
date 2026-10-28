import { afterEach, describe, expect, it } from 'vitest'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'

import { PROTOCOL_VERSION, type ServerMessage } from '@project-havoc/protocol'
import { cardNeedsColor, cardNeedsTarget, type ChaosPlayerView, type ChaosPublicView } from '@project-havoc/rules-chaos'

import { loadServerConfig } from './config.js'
import { createHavocServer, type HavocServer } from './server.js'

let server: HavocServer | null = null
const sockets: ClientSocket[] = []
let sequence = 0
const id = (label: string): string => `action_${label}_${String(++sequence).padStart(5, '0')}`

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.disconnect()
  await server?.stop()
  server = null
})

interface Client {
  readonly socket: ClientSocket
  game: ChaosPlayerView | ChaosPublicView | null
  playerId: string | null
  readonly rejections: string[]
  revision: number
}

async function connect(url: string): Promise<Client> {
  const socket = createClient(url, { transports: ['websocket'], forceNew: true, reconnection: false })
  sockets.push(socket)
  const client: Client = { socket, game: null, playerId: null, rejections: [], revision: 0 }
  socket.on('server.message', (message: ServerMessage) => {
    if (message.type === 'game.snapshot') client.game = message.game as unknown as ChaosPlayerView
    if (message.type === 'credentials.issued' && message.identity.role === 'player') client.playerId = message.identity.playerId
    if (message.type === 'action.rejected') client.rejections.push(message.error.message)
    if (message.type === 'session.snapshot') client.revision = message.session.revision
  })
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', reject)
  })
  return client
}

function waitFor(socket: ClientSocket, predicate: (message: ServerMessage) => boolean): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 3_000)
    const handler = (message: ServerMessage): void => {
      if (!predicate(message)) return
      clearTimeout(timer)
      socket.off('server.message', handler)
      resolve(message)
    }
    socket.on('server.message', handler)
  })
}

function send(client: Client, payload: object): Promise<ServerMessage> {
  const actionId = id('msg')
  const reply = waitFor(client.socket, (message) => (message.type === 'action.accepted' || message.type === 'action.rejected') && message.actionId === actionId)
  client.socket.emit('client.message', { version: PROTOCOL_VERSION, actionId, expectedRevision: client.revision, ...payload })
  return reply
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 25))

describe('Chaos-Partie über den echten Server', () => {
  it('startet nach dem Lobby-Start ein Spiel, schützt Handkarten und spielt bis zum Sieger', async () => {
    const config = { ...loadServerConfig({ NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '0', ACTION_RATE_LIMIT: '10000' }) }
    server = createHavocServer({ config, logger: { log() {} } })
    const started = await server.start()
    const tv = await connect(started.url)
    const created = waitFor(tv.socket, (message) => message.type === 'credentials.issued')
    tv.socket.emit('client.message', { version: PROTOCOL_VERSION, type: 'room.create', actionId: id('create'), expectedRevision: 0 })
    const credentials = await created
    if (credentials.type !== 'credentials.issued') throw new Error('no credentials')

    const players: Client[] = []
    for (const name of ['Anne', 'Bonny', 'Calico']) {
      const player = await connect(started.url)
      await send(player, { type: 'room.join', roomCode: credentials.roomCode, name })
      await settle()
      await send(player, { type: 'player.set-ready', ready: true })
      players.push(player)
    }
    await settle()
    await send(tv, { type: 'room.set-mode', mode: 'chaos' })
    await settle()
    const accepted = await send(tv, { type: 'room.start' })
    expect(accepted.type).toBe('action.accepted')
    await settle()

    expect(tv.game?.phase).toBe('playing')
    expect(JSON.stringify(tv.game)).not.toContain('"hand"')
    for (const player of players) expect((player.game as ChaosPlayerView).hand).toHaveLength(7)

    // Nicht der aktive Spieler darf nicht ziehen.
    const idle = players.find((player) => player.playerId !== tv.game?.activePlayerId)
    if (!idle) throw new Error('no idle player')
    const rejected = await send(idle, { type: 'game.action', action: { type: 'draw' } })
    expect(rejected.type).toBe('action.rejected')

    for (let turn = 0; turn < 4_000 && tv.game?.phase === 'playing'; turn += 1) {
      const publicView = tv.game as ChaosPublicView
      const actor = players.find((player) => player.playerId === publicView.decisionPlayerId)
      if (!actor?.game) break
      const view = actor.game as ChaosPlayerView
      let action: object
      if (view.reactionOptions) action = { type: 'react', choice: view.reactionOptions.shield ? 'shield' : 'accept' }
      else if (view.canCallHavoc) action = { type: 'havoc' }
      else if (view.playableCardIds[0]) {
        const card = view.hand.find((candidate) => candidate.id === view.playableCardIds[0])
        const target = view.players.find((player) => player.playerId !== view.viewerId)
        action = {
          type: 'play',
          cardId: view.playableCardIds[0],
          ...(card && cardNeedsColor(card) ? { color: 'blue' } : {}),
          ...(card && cardNeedsTarget(card) && target ? { targetId: target.playerId } : {}),
        }
      } else if (view.drawnCardId) action = { type: 'keep' }
      else action = { type: 'draw' }
      await send(actor, { type: 'game.action', action })
      await settle()
    }

    expect(tv.game?.phase).toBe('finished')
    expect(tv.game?.winner).not.toBeNull()

    const rematch = await send(tv, { type: 'game.rematch' })
    expect(rematch.type).toBe('action.accepted')
    await settle()
    expect(tv.game?.phase).toBe('playing')
  }, 120_000)
})
