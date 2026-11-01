import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ syncSchedules: vi.fn() }))

vi.mock('@lasce/jobs', () => ({ syncSchedules: mocks.syncSchedules }))

vi.mock('@lasce/config/env', () => ({
  serverEnv: () => ({ CRON_SECRET: 'test-cron-secret' }),
}))

import { POST } from './route'

function post(authorization?: string) {
  return POST(
    new Request('http://localhost/api/jobs/schedules', {
      method: 'POST',
      headers: authorization ? { authorization } : {},
    }),
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/jobs/schedules', () => {
  test.each([undefined, 'Bearer wrong-secret', 'test-cron-secret'])(
    'answers 401 without touching the queue when authorization is %j',
    async (authorization) => {
      const response = await post(authorization)

      expect(response.status).toBe(401)
      expect(mocks.syncSchedules).not.toHaveBeenCalled()
    },
  )

  test('syncs the schedules and reports what changed', async () => {
    const result = { queue: 'lasce', upserted: ['exis-sfxr'], removed: ['retired-job'] }
    mocks.syncSchedules.mockResolvedValue(result)

    const response = await post('Bearer test-cron-secret')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(result)
    expect(mocks.syncSchedules).toHaveBeenCalledOnce()
  })
})
