import { describe, expect, it } from 'vitest'

import { createLanRuntime, isUsableLanIpv4, selectLanAddress, type LanCandidate } from './lan-config.js'

const candidate = (overrides: Partial<LanCandidate> = {}): LanCandidate => ({
  name: 'WLAN', description: 'Intel Wi-Fi', address: '192.168.10.25', hasDefaultGateway: true, ...overrides,
})

describe('LAN configuration', () => {
  it('selects the sole physical adapter with a default gateway', () => {
    const result = selectLanAddress([
      candidate(),
      candidate({ name: 'VirtualBox Host-Only', description: 'VirtualBox Adapter', address: '192.168.56.1', hasDefaultGateway: false }),
    ])
    expect(result).toMatchObject({ ok: true, address: '192.168.10.25', source: 'automatic' })
  })

  it('refuses to guess between multiple routed physical adapters', () => {
    const result = selectLanAddress([candidate(), candidate({ name: 'Ethernet', address: '10.0.0.8' })])
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.reason).toContain('Mehrere aktive')
  })

  it.each(['localhost', '127.0.0.1', '169.254.2.3', '999.1.1.1', ''])('rejects invalid LAN address %s', (address) => {
    expect(isUsableLanIpv4(address)).toBe(false)
    expect(selectLanAddress([], address)).toMatchObject({ ok: false })
  })

  it('accepts an explicit valid manual fallback', () => {
    expect(selectLanAddress([], '10.20.30.40')).toMatchObject({ ok: true, address: '10.20.30.40', source: 'manual' })
  })

  it('creates consistent backend, TV, controller, join, and CORS URLs', () => {
    expect(createLanRuntime('192.168.10.25', {})).toEqual({
      lanAddress: '192.168.10.25', backendPort: 3000, tvPort: 5173, controllerPort: 5174,
      backendUrl: 'http://192.168.10.25:3000', tvUrl: 'http://192.168.10.25:5173',
      controllerUrl: 'http://192.168.10.25:5174', controllerJoinBaseUrl: 'http://192.168.10.25:5174/join',
      corsOrigins: 'http://192.168.10.25:5173,http://192.168.10.25:5174',
    })
  })

  it('validates custom ports and prevents collisions', () => {
    expect(() => createLanRuntime('192.168.10.25', { HAVOC_TV_PORT: 'abc' })).toThrow('HAVOC_TV_PORT')
    expect(() => createLanRuntime('192.168.10.25', { HAVOC_SERVER_PORT: '5173' })).toThrow('verschieden')
  })
})
