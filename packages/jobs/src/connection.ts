import { serverEnv } from '@lasce/config/env'
import IORedis from 'ioredis'

/**
 * Redis connection used by BullMQ.
 *
 * `maxRetriesPerRequest: null` is required by BullMQ: its blocking commands can
 * sit idle far longer than ioredis' default retry budget allows, and without it
 * they get killed mid-wait.
 */
const globalForRedis = globalThis as unknown as { lasceRedis?: IORedis }

export function getRedisConnection(): IORedis {
  if (globalForRedis.lasceRedis) return globalForRedis.lasceRedis

  const connection = new IORedis(serverEnv().REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    // ioredis resolves IPv4 only by default, but Railway's private network is
    // IPv6 only, so `redis.railway.internal` would never resolve and every
    // health check would report Redis unreachable. 0 lets DNS return either
    // family, which keeps localhost working in development.
    family: 0,
  })

  globalForRedis.lasceRedis = connection
  return connection
}
