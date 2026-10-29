import type { RandomSource } from './types.js'

function checkedRandom(random: RandomSource): number {
  const value = random.next()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`RandomSource.next() must return a finite value in [0, 1), received ${value}`)
  }
  return value
}

export function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(checkedRandom(random) * (index + 1))
    const currentValue = result[index]
    const targetValue = result[target]
    if (currentValue === undefined || targetValue === undefined) throw new Error('Shuffle index invariant failed')
    result[index] = targetValue
    result[target] = currentValue
  }
  return result
}

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0
      let value = state
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    },
  }
}

