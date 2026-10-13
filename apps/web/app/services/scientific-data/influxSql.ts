import { z } from 'zod'

import { serverEnv } from '@lasce/config/env'

import { ScientificDataUpstreamError } from './errors'

/*
 * A minimal client for InfluxDB 3's SQL HTTP API (`POST /api/v3/query_sql`). A plain `fetch` is
 * enough for the few read-only queries the web runs, so no SDK is pulled in. Values always travel
 * as bound `params` (`$name` in the SQL), never interpolated into the query text.
 */

export type InfluxSqlParams = Record<string, string | number>

/** Planning fails this way while the queried table has never been written, e.g. before ingestion. */
const TABLE_NOT_FOUND = /table '[^']*' not found/

export async function queryInfluxSql<T>(
  sql: string,
  params: InfluxSqlParams,
  rowSchema: z.ZodType<T>,
): Promise<T[]> {
  const env = serverEnv()
  let response: Response

  try {
    response = await fetch(new URL('/api/v3/query_sql', env.INFLUXDB_HOST), {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.INFLUXDB_TOKEN ? { Authorization: `Bearer ${env.INFLUXDB_TOKEN}` } : {}),
      },
      body: JSON.stringify({ db: env.INFLUXDB_DATABASE, q: sql, params, format: 'json' }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new ScientificDataUpstreamError('La base de series temporales no respondió.')
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    if (response.status === 400 && TABLE_NOT_FOUND.test(detail)) return []
    throw new ScientificDataUpstreamError(
      `La base de series temporales respondió con el estado ${response.status}.`,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ScientificDataUpstreamError(
      'La base de series temporales devolvió una respuesta incompleta o no válida.',
    )
  }
  const parsed = z.array(rowSchema).safeParse(payload)
  if (!parsed.success) {
    throw new ScientificDataUpstreamError(
      'La base de series temporales devolvió datos con un formato inesperado.',
    )
  }

  return parsed.data
}
