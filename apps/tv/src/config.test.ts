// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { createJoinUrl, type TvRuntimeConfig } from './config.js'

describe('TV URL configuration', () => {
  it('adds an encoded room parameter to the configured public URL', () => {
    const config: TvRuntimeConfig = {
      serverUrl: 'http://havoc-box.local:3000',
      publicJoinBaseUrl: 'http://havoc-box.local:5174/join?source=tv',
    }

    const result = createJoinUrl(config, 'A B?C')

    expect(result.url).toBe('http://havoc-box.local:5174/join?source=tv&room=A+B%3FC')
    expect(result.warning).toBeNull()
  })

  it('marks the browser-origin fallback as not LAN-configured', () => {
    const config: TvRuntimeConfig = { serverUrl: 'http://127.0.0.1:3000', publicJoinBaseUrl: null }

    const result = createJoinUrl(config, 'HVC234')

    expect(result.url).toContain('/join?room=HVC234')
    expect(result.warning).toContain('VITE_PUBLIC_JOIN_URL')
  })
})
