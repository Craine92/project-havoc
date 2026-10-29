import { describe, expect, it } from 'vitest'

import { loadServerConfig } from './config.js'

describe('server configuration', () => {
  it('rejects wildcard CORS configuration', () => {
    expect(() => loadServerConfig({
      NODE_ENV: 'test',
      CORS_ORIGINS: '*',
      RECONNECT_TOKEN_SECRET: 'a-secure-test-secret-with-at-least-32-bytes',
    })).toThrow('wildcard')
  })

  it('requires an explicit production reconnect secret', () => {
    expect(() => loadServerConfig({ NODE_ENV: 'production' })).toThrow('required in production')
  })

  it('normalizes exact HTTP origins and accepts port zero for tests', () => {
    const config = loadServerConfig({
      NODE_ENV: 'test',
      PORT: '0',
      CORS_ORIGINS: 'http://localhost:5173/,https://havoc.example/game',
      RECONNECT_TOKEN_SECRET: 'a-secure-test-secret-with-at-least-32-bytes',
    })

    expect(config.port).toBe(0)
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'https://havoc.example'])
  })
})
