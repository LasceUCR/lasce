'use client'

import { useEffect, useState } from 'react'

import {
  MONITORED_SERVICES,
  PLATFORM_SERVICES,
  readChecks,
  uniformStatuses,
  type ServiceName,
  type ServiceStatuses,
} from '@/app/lib/service-status'

/** Reads one health endpoint. A network failure confirms nothing, so it reads as every `down`. */
async function fetchChecks<Name extends ServiceName>(url: string, names: readonly Name[]) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    // Both endpoints answer 503 with the same body when something is down.
    const body: unknown = await response.json().catch(() => null)
    return readChecks(body, names)
  } catch {
    return readChecks(null, names)
  }
}

/**
 * The state of every service on the administration summary, from `/api/health` and
 * `/api/health/services` in parallel. Every service is `checking` until both have answered.
 */
export function useServiceStatuses(): ServiceStatuses {
  const [statuses, setStatuses] = useState<ServiceStatuses>(() => uniformStatuses('checking'))

  useEffect(() => {
    let isMounted = true

    Promise.all([
      fetchChecks('/api/health', PLATFORM_SERVICES),
      fetchChecks('/api/health/services', MONITORED_SERVICES),
    ]).then(([platform, monitored]) => {
      if (isMounted) setStatuses({ ...platform, ...monitored })
    })

    return () => {
      isMounted = false
    }
  }, [])

  return statuses
}
