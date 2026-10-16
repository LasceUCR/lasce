import { describe, expect, test } from 'vitest'

import {
  MONITORED_SERVICES,
  PLATFORM_SERVICES,
  readChecks,
  uniformStatuses,
} from './service-status'

describe('readChecks', () => {
  test('reads each requested service from the checks', () => {
    const body = {
      status: 'degraded',
      checks: { api: 'ok', workers: 'down', minio: 'ok', influxdb: 'down' },
    }

    expect(readChecks(body, MONITORED_SERVICES)).toEqual({
      api: 'ok',
      workers: 'down',
      minio: 'ok',
      influxdb: 'down',
    })
  })

  test('treats a failure reason in place of ok as down', () => {
    const body = { status: 'degraded', checks: { postgres: 'ok', redis: 'timed out after 5000ms' } }

    expect(readChecks(body, PLATFORM_SERVICES)).toEqual({ postgres: 'ok', redis: 'down' })
  })

  test('marks a service the body does not mention as down', () => {
    expect(readChecks({ checks: { postgres: 'ok' } }, PLATFORM_SERVICES)).toEqual({
      postgres: 'ok',
      redis: 'down',
    })
  })

  test.each([[null], ['<html>'], [{ error: 'No ha iniciado sesión.' }], [{ checks: null }]])(
    'marks every service down when the body has no checks: %j',
    (body) => {
      expect(readChecks(body, PLATFORM_SERVICES)).toEqual({ postgres: 'down', redis: 'down' })
    },
  )
})

describe('uniformStatuses', () => {
  test('gives every service the same status', () => {
    expect(Object.values(uniformStatuses('checking'))).toEqual(Array(6).fill('checking'))
  })
})
