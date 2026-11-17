import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { consumeRateLimits, type RateLimitRedis } from './rate-limit'

/** A Redis stand-in that runs the counting script's logic in memory. */
function fakeRedis() {
  const counts = new Map<string, number>()
  const ttls = new Map<string, number>()
  const redis: RateLimitRedis = {
    eval: vi.fn(async (_script: string, _keys: number, ...args: (string | number)[]) => {
      const [key = '', window = 0] = args
      const count = (counts.get(String(key)) ?? 0) + 1
      counts.set(String(key), count)
      if (count === 1) ttls.set(String(key), Number(window))
      return count
    }),
  }
  return { redis, counts, ttls }
}

const rules = [
  { key: 'lasce:rate:test:ip:1', limit: 2, windowSeconds: 900 },
  { key: 'lasce:rate:test:email:x', limit: 3, windowSeconds: 3600 },
]

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('consumeRateLimits', () => {
  test('allows hits up to the lowest limit and blocks the next one', async () => {
    const { redis } = fakeRedis()

    expect(await consumeRateLimits(redis, rules)).toBe(true)
    expect(await consumeRateLimits(redis, rules)).toBe(true)
    expect(await consumeRateLimits(redis, rules)).toBe(false)
  })

  test('counts every rule on every hit and sets each window once', async () => {
    const { redis, counts, ttls } = fakeRedis()

    for (let hit = 0; hit < 4; hit += 1) await consumeRateLimits(redis, rules)

    expect(counts.get('lasce:rate:test:ip:1')).toBe(4)
    expect(counts.get('lasce:rate:test:email:x')).toBe(4)
    expect(ttls.get('lasce:rate:test:ip:1')).toBe(900)
    expect(ttls.get('lasce:rate:test:email:x')).toBe(3600)
  })

  test('sends one atomic script per rule with the key and the window', async () => {
    const { redis } = fakeRedis()
    await consumeRateLimits(redis, rules)

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR', KEYS[1])"),
      1,
      'lasce:rate:test:ip:1',
      900,
    )
  })

  test('allows the hit and logs when Redis fails', async () => {
    const redis: RateLimitRedis = { eval: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) }

    expect(await consumeRateLimits(redis, rules)).toBe(true)
    expect(console.error).toHaveBeenCalledWith(
      '[rate-limit] Redis unavailable, allowing the request:',
      'ECONNREFUSED',
    )
  })

  test('allows the hit when Redis does not answer in time', async () => {
    const redis: RateLimitRedis = { eval: vi.fn(() => new Promise<unknown>(() => {})) }

    expect(await consumeRateLimits(redis, rules, 10)).toBe(true)
    expect(console.error).toHaveBeenCalled()
  })
})
