import { createHavocServer } from './server.js'

const server = createHavocServer()

async function shutdown(signal: string): Promise<void> {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', event: 'shutdown.requested', signal }))
  await server.stop()
}

process.once('SIGINT', () => { void shutdown('SIGINT') })
process.once('SIGTERM', () => { void shutdown('SIGTERM') })

server.start().catch((error: unknown) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    event: 'server.start_failed',
    detail: error instanceof Error ? error.message : 'unknown error',
  }))
  process.exitCode = 1
})

export { createHavocServer } from './server.js'
export type { HavocServer, HavocServerOptions, StartedServer } from './server.js'
