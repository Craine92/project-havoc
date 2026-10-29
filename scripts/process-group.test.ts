import { describe, expect, it, vi } from 'vitest'

import { ManagedProcessGroup } from './process-group.js'

describe('LAN process shutdown', () => {
  it('stops every managed process once and remains idempotent', async () => {
    const order: string[] = []
    const group = new ManagedProcessGroup()
    for (const label of ['server', 'tv', 'controller']) {
      group.add({ label, stop: vi.fn(async () => { order.push(label) }) })
    }

    await Promise.all([group.shutdown(), group.shutdown()])

    expect(order).toEqual(['controller', 'tv', 'server'])
  })
})

