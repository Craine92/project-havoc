import { createServer as createHttpServer, type Server as HttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import { Server as SocketServer } from 'socket.io'

import { loadServerConfig, type ServerConfig } from './config.js'
import { ProtocolDispatcher } from './dispatcher.js'
import { createConsoleLogger, type Logger } from './logging.js'
import { RateLimiter } from './rateLimiter.js'
import { InMemoryRoomRepository } from './roomRepository.js'
import { createProductionLobbyServices } from './services.js'

export interface HavocServerOptions {
  readonly config?: ServerConfig
  readonly logger?: Logger
  readonly now?: () => number
}

export interface StartedServer {
  readonly host: string
  readonly port: number
  readonly url: string
}

export interface HavocServer {
  readonly roomCount: number
  start(): Promise<StartedServer>
  stop(): Promise<void>
  runCleanup(): readonly string[]
}

/** Creates a controllable HTTP and Socket.IO process suitable for production and integration tests. */
export function createHavocServer(options: HavocServerOptions = {}): HavocServer {
  const config = options.config ?? loadServerConfig()
  const logger = options.logger ?? createConsoleLogger()
  const now = options.now ?? Date.now
  const repository = new InMemoryRoomRepository()
  const services = createProductionLobbyServices(config.reconnectSecret, now)
  const connectionLimiter = new RateLimiter(config.connectionRateLimit, now)
  const httpServer: HttpServer = createHttpServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ status: 'ok' }))
      return
    }
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ error: 'not-found' }))
  })
  const io = new SocketServer(httpServer, {
    maxHttpBufferSize: config.maxMessageBytes,
    cors: {
      credentials: false,
      origin(origin, callback) {
        callback(null, origin === undefined || config.corsOrigins.includes(origin))
      },
    },
    allowRequest(request, callback) {
      const key = request.socket.remoteAddress ?? 'unknown'
      callback(null, connectionLimiter.allow(key))
    },
  })
  const dispatcher = new ProtocolDispatcher(io, repository, services, config, logger, now)
  io.on('connection', (socket) => { dispatcher.attach(socket) })
  io.engine.on('connection_error', (error) => {
    logger.log('warn', { event: 'connection.rejected', code: error.code.toString(), detail: error.message })
  })

  let cleanupTimer: NodeJS.Timeout | undefined
  let stopping: Promise<void> | undefined

  function runCleanup(): readonly string[] {
    dispatcher.pruneRateLimits()
    connectionLimiter.prune()
    const removed = repository.collectGarbage(now(), config)
    for (const roomId of removed) logger.log('info', { event: 'room.collected', roomId })
    return removed
  }

  return {
    get roomCount() { return repository.size },
    async start() {
      if (httpServer.listening) throw new Error('Server is already running')
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
          httpServer.off('listening', onListening)
          reject(error)
        }
        const onListening = (): void => {
          httpServer.off('error', onError)
          resolve()
        }
        httpServer.once('error', onError)
        httpServer.once('listening', onListening)
        httpServer.listen(config.port, config.host)
      })
      cleanupTimer = setInterval(runCleanup, config.cleanupIntervalMs)
      cleanupTimer.unref()
      const address = httpServer.address()
      if (!address || typeof address === 'string') throw new Error('Server did not expose a TCP address')
      const { port } = address as AddressInfo
      const hostForUrl = config.host.includes(':') ? `[${config.host}]` : config.host
      const started = { host: config.host, port, url: `http://${hostForUrl}:${port}` }
      logger.log('info', { event: 'server.started', detail: `${started.host}:${started.port}` })
      return started
    },
    stop() {
      stopping ??= (async () => {
        if (cleanupTimer) clearInterval(cleanupTimer)
        cleanupTimer = undefined
        dispatcher.shutdown()
        await new Promise<void>((resolve) => { io.close(() => resolve()) })
        if (httpServer.listening) {
          await new Promise<void>((resolve, reject) => {
            httpServer.close((error) => { if (error) reject(error); else resolve() })
          })
        }
        repository.clear()
        connectionLimiter.clear()
        logger.log('info', { event: 'server.stopped' })
      })()
      return stopping
    },
    runCleanup,
  }
}
