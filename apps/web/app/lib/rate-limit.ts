/**
 * Fixed-window rate limiting on Redis: one counter per key, created with a TTL by its first hit
 * and counted up atomically by a Lua script, so a crash between the two steps can never leave a
 * counter without an expiry. Used by the forgot-password form (`docs/password-reset.md`).
 *
 * The Redis client is passed in, so the logic is tested with a fake one. Production passes the
 * shared connection from `@lasce/jobs`.
 */

/** The one command this module needs, which ioredis' client provides. */
export interface RateLimitRedis {
  eval(script: string, numberOfKeys: number, ...args: (string | number)[]): Promise<unknown>
}

export interface RateLimitRule {
  /** Full Redis key, e.g. `lasce:rate:password-reset:ip:203.0.113.7`. */
  key: string
  limit: number
  windowSeconds: number
}

export const RATE_LIMIT_PREFIX = 'lasce:rate'

/** INCR, and set the TTL only on the hit that created the key. Returns the new count. */
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`

/** How long a Redis call may take before the limiter gives up on it. */
export const RATE_LIMIT_TIMEOUT_MS = 2_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis did not answer in ${ms} ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/**
 * Counts one hit against every rule and says whether all of them still allow it. Every rule is
 * counted even when an earlier one is already exceeded, so a blocked caller keeps its windows
 * full. When Redis fails or is slow the hit is allowed and the failure logged: the limiter
 * protects against abuse, and an outage of it must not turn into an outage of the feature.
 */
export async function consumeRateLimits(
  redis: RateLimitRedis,
  rules: readonly RateLimitRule[],
  timeoutMs: number = RATE_LIMIT_TIMEOUT_MS,
): Promise<boolean> {
  try {
    const counts = await withTimeout(
      Promise.all(
        rules.map((rule) => redis.eval(INCREMENT_SCRIPT, 1, rule.key, rule.windowSeconds)),
      ),
      timeoutMs,
    )
    return rules.every((rule, index) => Number(counts[index]) <= rule.limit)
  } catch (error) {
    console.error(
      '[rate-limit] Redis unavailable, allowing the request:',
      error instanceof Error ? error.message : error,
    )
    return true
  }
}
