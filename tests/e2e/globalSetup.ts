import { fileURLToPath } from 'node:url'

import { createServer as createViteServer } from 'vite'

import { loadServerConfig } from '../../apps/server/src/config.js'
import type { Logger } from '../../apps/server/src/logging.js'
import { createHavocServer } from '../../apps/server/src/server.js'

const silentLogger: Logger = { log() {} }

export default async function globalSetup(): Promise<() => Promise<void>> {
  const backendConfig = {
    ...loadServerConfig({
      NODE_ENV: 'test',
      RECONNECT_TOKEN_SECRET: 'project-havoc-e2e-only-secret-with-32-bytes',
      CORS_ORIGINS: 'http://127.0.0.1:4311,http://127.0.0.1:4312',
    }),
    host: '127.0.0.1',
    port: 4310,
    connectionRateLimit: { limit: 500, windowMs: 60_000 },
    creationRateLimit: { limit: 100, windowMs: 60_000 },
    joinRateLimit: { limit: 500, windowMs: 60_000 },
    actionRateLimit: { limit: 500, windowMs: 10_000 },
    invalidMessageRateLimit: { limit: 100, windowMs: 10_000 },
  }
  const backend = createHavocServer({ config: backendConfig, logger: silentLogger })
  await backend.start()

  const tvRoot = fileURLToPath(new URL('../../apps/tv', import.meta.url))
  const frontend = await createViteServer({
    root: tvRoot,
    mode: 'e2e',
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 4311, strictPort: true },
  })
  const controllerRoot = fileURLToPath(new URL('../../apps/controller', import.meta.url))
  const controller = await createViteServer({
    root: controllerRoot,
    mode: 'e2e',
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 4312, strictPort: true },
  })
  try {
    await frontend.listen()
    await controller.listen()
  } catch (error: unknown) {
    await controller.close()
    await frontend.close()
    await backend.stop()
    throw error
  }

  return async () => {
    await controller.close()
    await frontend.close()
    await backend.stop()
  }
}
