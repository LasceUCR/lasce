import { getRedisConnection } from '@lasce/jobs'
import { prisma } from '@lasce/db'
import { NextResponse } from 'next/server'

/**
 * Liveness probe that actually touches the dependencies, so a container that is
 * up but cannot reach Redis or PostgreSQL reports unhealthy instead of pretending.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, 'ok' | string> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.postgres = 'ok'
  } catch (error) {
    checks.postgres = error instanceof Error ? error.message : 'unreachable'
  }

  try {
    await getRedisConnection().ping()
    checks.redis = 'ok'
  } catch (error) {
    checks.redis = error instanceof Error ? error.message : 'unreachable'
  }

  const healthy = Object.values(checks).every((value) => value === 'ok')

  return NextResponse.json({ status: healthy ? 'ok' : 'degraded', checks }, {
    status: healthy ? 200 : 503,
  })
}
