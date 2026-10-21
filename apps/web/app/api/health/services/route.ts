import { NextResponse } from 'next/server'

import { canSeeAdminNavigation } from '@/app/lib/auth/account'
import { getSessionUser } from '@/app/lib/auth/session'
import { checkServices } from '@/app/lib/service-health'

/**
 * The state of MinIO, InfluxDB, the workers and the API, for the administration summary. Kept
 * apart from `/api/health`, the platform healthcheck, so these never fail a deploy. Readable by
 * the accounts that may open the administration panel; the body says `ok` or `down` per service
 * and the reasons go to the server log only.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'No ha iniciado sesión.' }, { status: 401 })
  }
  if (!canSeeAdminNavigation(user.role)) {
    return NextResponse.json(
      { error: 'No tiene permisos para consultar el estado de los servicios.' },
      { status: 403 },
    )
  }

  const results = await checkServices()
  const failures = Object.entries(results).filter(([, result]) => result.state === 'down')

  if (failures.length > 0) {
    console.error(
      'services health check degraded:',
      failures.map(([name, result]) => `${name}: ${result.reason ?? 'down'}`).join(' | '),
    )
  }

  const checks = Object.fromEntries(
    Object.entries(results).map(([name, result]) => [name, result.state]),
  )

  return NextResponse.json(
    { status: failures.length === 0 ? 'ok' : 'degraded', checks },
    { status: failures.length === 0 ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
