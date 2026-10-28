import { describe, expect, it } from 'vitest'

import { runClassicSimulations } from './simulation.js'

describe('Classic deterministic simulation', () => {
  it('finishes reproducibly while preserving every invariant after every action', () => {
    const first = runClassicSimulations({ runs: 50, seed: 20_260_228 })
    const second = runClassicSimulations({ runs: 50, seed: 20_260_228 })
    expect(first).toEqual(second)
    expect(first.completedGames).toBe(50)
    expect(first.totalActions).toBeGreaterThan(50)
  })
})
