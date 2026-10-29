// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { createJoinUrl, type TvRuntimeConfig } from './config.js'

describe('TV URL configuration', () => {
  it('adds an encoded room parameter to the configured public URL', () => {
    const config: TvRuntimeConfig = {
      serverUrl: 'http://havoc-box.local:3000',
      publicJoinBaseUrl: 'http://havoc-box.local:5174/join?source=tv',
      publicJoinError: null,
      allowLoopbackJoinUrl: false,
    }

    const result = createJoinUrl(config, 'A B?C')

    expect(result.url).toBe('http://havoc-box.local:5174/join?source=tv&room=A+B%3FC')
    expect(result.warning).toBe('')
  })

  it('does not invent a TV-origin QR target without a controller URL', () => {
    const config: TvRuntimeConfig = { serverUrl: 'http://127.0.0.1:3000', publicJoinBaseUrl: null, publicJoinError: null, allowLoopbackJoinUrl: false }

    const result = createJoinUrl(config, 'HVC234')

    expect(result.url).toBeNull()
    expect(result.warning).toContain('npm run dev')
  })

  it('preserves an invalid-configuration diagnosis instead of producing a QR code', () => {
    const config: TvRuntimeConfig = { serverUrl: 'http://127.0.0.1:3000', publicJoinBaseUrl: null, publicJoinError: 'Controller-URL ungültig', allowLoopbackJoinUrl: false }
    expect(createJoinUrl(config, 'HVC234')).toEqual({ url: null, warning: 'Controller-URL ungültig' })
  })

  it('suppresses loopback QR codes outside explicitly enabled test environments', () => {
    const config: TvRuntimeConfig = {
      serverUrl: 'http://127.0.0.1:3000', publicJoinBaseUrl: 'http://localhost:5174/join',
      publicJoinError: null, allowLoopbackJoinUrl: false,
    }
    expect(createJoinUrl(config, 'HVC234')).toMatchObject({ url: null })
    expect(createJoinUrl(config, 'HVC234').warning).toContain('localhost')
  })
})
