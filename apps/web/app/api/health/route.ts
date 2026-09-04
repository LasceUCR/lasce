import { getRedisConnection } from '@lasce/jobs'
import { prisma } from '@lasce/db'
import { NextResponse } from 'next/server'

/**
 * Liveness probe that actually touches the dependencies, so a container that is
 * up but cannot reach Redis or PostgreSQL reports unhealthy instead of pretending.
 */
export const dynamic = 'force-dynamic'

/**
 * How long a single dependency probe may take before it is called a failure.
 *
 * The Redis connection sets `maxRetriesPerRequest: null` because BullMQ needs
 * it, which means `ping()` against an unreachable server retries forever rather
 * than rejecting. Without a bound this route hangs and a platform healthcheck
 * reports a timeout instead of reading a clean 503.
 */
const PROBE_TIMEOUT_MS = 5_000

async function probe(run: () => Promise<unknown>): Promise<'ok' | string> {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timed out after ${PROBE_TIMEOUT_MS}ms`)),
          PROBE_TIMEOUT_MS,
        )
      }),
    ])
    return 'ok'
  } catch (error) {
    return error instanceof Error ? error.message : 'unreachable'
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(): Promise<NextResponse> {
  // In parallel: a slow dependency should not add to a slow one beside it.
  const [postgres, redis] = await Promise.all([
    probe(() => prisma.$queryRaw`SELECT 1`),
    probe(() => getRedisConnection().ping()),
  ])

  const checks: Record<string, 'ok' | string> = { postgres, redis }
  const healthy = Object.values(checks).every((value) => value === 'ok')

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 },
  )
}
