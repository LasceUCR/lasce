/**
 * The services the administration summary reports on, and how the two health endpoints' bodies
 * become one state per service. Client-safe: no SDK, no environment.
 *
 * `/api/health` covers PostgreSQL and Redis and is the platform healthcheck, so it stays as it is.
 * `/api/health/services` covers the rest (`service-health.ts`). The summary reads both.
 */

export type ServiceState = 'ok' | 'down'

/** What the panel shows for a service: its state, or `checking` until the endpoint answers. */
export type ServiceStatus = ServiceState | 'checking'

/** Answered by `/api/health`. */
export const PLATFORM_SERVICES = ['postgres', 'redis'] as const

/** Answered by `/api/health/services`. */
export const MONITORED_SERVICES = ['api', 'workers', 'minio', 'influxdb'] as const

export type ServiceName = (typeof PLATFORM_SERVICES)[number] | (typeof MONITORED_SERVICES)[number]

/** Display order in the panel. */
export const SERVICE_NAMES: readonly ServiceName[] = [
  'api',
  'postgres',
  'redis',
  'workers',
  'minio',
  'influxdb',
]

export type ServiceStatuses = Record<ServiceName, ServiceStatus>

export function uniformStatuses(status: ServiceStatus): ServiceStatuses {
  return Object.fromEntries(SERVICE_NAMES.map((name) => [name, status])) as ServiceStatuses
}

/**
 * Reads the `checks` of a health body for `names`. A check is `ok` only when it says exactly
 * that: `/api/health` puts the failure reason in place of `ok`, and a body without `checks` (a
 * 401, a proxy error page, no body at all) means nothing could be confirmed, so every service it
 * should have answered for is `down`.
 */
export function readChecks<Name extends ServiceName>(
  body: unknown,
  names: readonly Name[],
): Record<Name, ServiceState> {
  const checks =
    typeof body === 'object' && body !== null && 'checks' in body ? body.checks : undefined

  return Object.fromEntries(
    names.map((name) => {
      const value =
        typeof checks === 'object' && checks !== null && name in checks
          ? (checks as Record<string, unknown>)[name]
          : undefined
      return [name, value === 'ok' ? 'ok' : 'down']
    }),
  ) as Record<Name, ServiceState>
}
