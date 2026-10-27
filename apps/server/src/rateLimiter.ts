import type { RateLimitConfig } from './config.js'

interface Counter {
  count: number
  resetAt: number
}

/** Small fixed-window limiter with an injected clock for deterministic tests. */
export class RateLimiter {
  readonly #counters = new Map<string, Counter>()

  constructor(
    private readonly config: RateLimitConfig,
    private readonly now: () => number,
  ) {}

  allow(key: string): boolean {
    const currentTime = this.now()
    const counter = this.#counters.get(key)
    if (!counter || counter.resetAt <= currentTime) {
      this.#counters.set(key, { count: 1, resetAt: currentTime + this.config.windowMs })
      return true
    }
    if (counter.count >= this.config.limit) return false
    counter.count += 1
    return true
  }

  prune(): void {
    const currentTime = this.now()
    for (const [key, counter] of this.#counters) {
      if (counter.resetAt <= currentTime) this.#counters.delete(key)
    }
  }

  clear(): void {
    this.#counters.clear()
  }
}
