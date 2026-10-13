import { afterEach, describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

import { ScientificDataUpstreamError } from '@/app/services/scientific-data/errors'

const mocks = vi.hoisted(() => ({ env: {} as Record<string, unknown> }))

vi.mock('@lasce/config/env', () => ({ serverEnv: () => mocks.env }))

import { queryInfluxSql } from '@/app/services/scientific-data/influxSql'

const row = z.object({ time: z.string(), value: z.number() })

function useEnv(token?: string) {
  mocks.env = {
    INFLUXDB_HOST: 'http://influx.test:8181',
    INFLUXDB_DATABASE: 'lasce',
    ...(token ? { INFLUXDB_TOKEN: token } : {}),
  }
}

function stubFetch(response: Partial<Response> | Error) {
  const fetch =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue({ ok: true, status: 200, ...response })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('queryInfluxSql', () => {
  test('posts the SQL with bound params to the configured database', async () => {
    useEnv('secret-token')
    const fetch = stubFetch({ json: async () => [{ time: '2026-09-27T00:00:00', value: 1 }] })

    const rows = await queryInfluxSql(
      'SELECT time, value WHERE channel = $channel',
      { channel: 'x' },
      row,
    )

    expect(rows).toEqual([{ time: '2026-09-27T00:00:00', value: 1 }])
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe('http://influx.test:8181/api/v3/query_sql')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer secret-token')
    expect(JSON.parse(init.body)).toEqual({
      db: 'lasce',
      q: 'SELECT time, value WHERE channel = $channel',
      params: { channel: 'x' },
      format: 'json',
    })
  })

  test('sends no Authorization header when no token is configured', async () => {
    useEnv()
    const fetch = stubFetch({ json: async () => [] })

    await queryInfluxSql('SELECT 1', {}, row)

    expect(fetch.mock.calls[0]![1].headers).not.toHaveProperty('Authorization')
  })

  test('treats a table that was never written as an empty result', async () => {
    useEnv()
    stubFetch({
      ok: false,
      status: 400,
      text: async () => "Error during planning: table 'public.iox.exis_irradiance' not found",
    })

    await expect(queryInfluxSql('SELECT 1', {}, row)).resolves.toEqual([])
  })

  test.each([
    ['a network failure', new Error('ECONNREFUSED')],
    ['another error status', { ok: false, status: 404, text: async () => 'database not found' }],
    ['a body that is not JSON', { json: async () => Promise.reject(new SyntaxError('bad')) }],
    ['rows in an unexpected shape', { json: async () => [{ time: 1 }] }],
  ] as const)('reports %s as an upstream error', async (_label, response) => {
    useEnv()
    stubFetch(response as Partial<Response> | Error)

    await expect(queryInfluxSql('SELECT 1', {}, row)).rejects.toBeInstanceOf(
      ScientificDataUpstreamError,
    )
  })
})
