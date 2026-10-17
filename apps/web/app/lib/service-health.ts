import * as Minio from 'minio'

import { serverEnv } from '@lasce/config/env'
import { getQueue, getRedisConnection } from '@lasce/jobs'

import type { MONITORED_SERVICES, ServiceState } from './service-status'
import { parseEndpoint } from './suvi-storage'

/**
 * Probes behind `/api/health/services`: MinIO, InfluxDB, the Python workers and the API itself.
 * PostgreSQL and Redis are `/api/health`'s, which is also the platform healthcheck and is not
 * extended so that a down MinIO or worker never fails a deploy.
 */

type MonitoredService = (typeof MONITORED_SERVICES)[number]

export interface ProbeResult {
  state: ServiceState
  /** Why a probe failed, for the server log. Never sent to the browser. */
  reason?: string
}

export type ServicesHealth = Record<MonitoredService, ProbeResult>

/** Same bound as `/api/health`, for the same reason: a Redis or SDK call may retry forever. */
export const PROBE_TIMEOUT_MS = 5_000

/** Runs `check`, which resolves to a failure reason or `null`, and bounds it in time. */
export async function probe(check: () => Promise<string | null>): Promise<ProbeResult> {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const reason = await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timed out after ${PROBE_TIMEOUT_MS}ms`)),
          PROBE_TIMEOUT_MS,
        )
      }),
    ])
    return reason === null ? { state: 'ok' } : { state: 'down', reason }
  } catch (error) {
    return { state: 'down', reason: error instanceof Error ? error.message : 'unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

/** The bucket the site serves files from exists and the credentials can see it. */
export async function checkMinio(): Promise<string | null> {
  const env = serverEnv()
  const { endPoint, port, useSSL } = parseEndpoint(env.MINIO_ENDPOINT, env.MINIO_USE_SSL)
  const client = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey: env.MINIO_ACCESS_KEY ?? '',
    secretKey: env.MINIO_SECRET_KEY ?? '',
  })

  return (await client.bucketExists(env.MINIO_BUCKET))
    ? null
    : `bucket "${env.MINIO_BUCKET}" does not exist`
}

/** InfluxDB 3's `/health` answers 200 when the server is up and the token is accepted. */
export async function checkInflux(): Promise<string | null> {
  const env = serverEnv()
  const response = await fetch(new URL('/health', env.INFLUXDB_HOST), {
    cache: 'no-store',
    headers: env.INFLUXDB_TOKEN ? { Authorization: `Bearer ${env.INFLUXDB_TOKEN}` } : {},
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  })

  return response.ok ? null : `responded with status ${response.status}`
}

/**
 * The Redis connection names in a `CLIENT LIST` reply that belong to a worker of `queue`, the
 * queue's qualified name (`bull:lasce`). A worker given a name adds `:w:<name>`.
 *
 * BullMQ's own `Queue.getWorkers()` cannot be used: the Node port expects the queue name
 * base64-encoded (`bull:bGFzY2U=`), while the Python port, which runs our workers, names the
 * connection with the plain name, so it never finds them.
 */
export function workerConnections(clientList: string, qualifiedName: string): string[] {
  return clientList
    .split(/\r?\n/)
    .map((line) => /(?:^| )name=(\S*)/.exec(line)?.[1] ?? '')
    .filter((name) => name === qualifiedName || name.startsWith(`${qualifiedName}:w:`))
}

/** At least one worker holds a connection to the queue. */
export async function checkWorkers(): Promise<string | null> {
  const clientList = (await getRedisConnection().client('LIST')) as string
  const workers = workerConnections(clientList, getQueue().qualifiedName)

  return workers.length > 0 ? null : 'no worker is connected to the queue'
}

export async function checkServices(): Promise<ServicesHealth> {
  // In parallel, so one slow dependency does not delay the others.
  const [workers, minio, influxdb] = await Promise.all([
    probe(checkWorkers),
    probe(checkMinio),
    probe(checkInflux),
  ])

  // The API is up by definition: this code is running inside it to answer.
  return { api: { state: 'ok' }, workers, minio, influxdb }
}
