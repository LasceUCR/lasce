import { serverEnv } from '@lasce/config/env'
import { syncSchedules } from '@lasce/jobs'
import { NextResponse } from 'next/server'

/**
 * Syncs the declared schedules into BullMQ's scheduler.
 *
 *   POST /api/jobs/schedules
 *   Authorization: Bearer $CRON_SECRET
 *
 * The deploy job in cd.yml calls this after every release. It runs the same
 * `syncSchedules()` as `pnpm jobs:register`, but from inside the web container,
 * because the deployed Redis is not reachable from outside the server.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${serverEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncSchedules()

  return NextResponse.json(result)
}
