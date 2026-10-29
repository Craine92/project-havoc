import { describe, expect, it } from 'vitest'

import { createSeededRandom, shuffle } from './random.js'

describe('deterministic random helpers', () => {
  it('repeats a shuffle for the same seed without mutating input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const first = shuffle(input, createSeededRandom(42))
    const second = shuffle(input, createSeededRandom(42))
    expect(first).toEqual(second)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('rejects an invalid random source', () => {
    expect(() => shuffle([1, 2], { next: () => 1 })).toThrow('[0, 1)')
  })
})

