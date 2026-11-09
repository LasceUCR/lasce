import type { Queue } from 'bullmq'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { schedules } from './schedules'
import { syncSchedules } from './sync-schedules'

// The real getQueue() opens a Redis connection at first use. Every test passes
// its own stub queue, so the default is never reached.
vi.mock('./queue', () => ({ getQueue: vi.fn() }))

const upsertJobScheduler = vi.fn()
const getJobSchedulers = vi.fn()
const removeJobScheduler = vi.fn()

// noUncheckedIndexedAccess types schedules[0] as possibly undefined.
const [declared] = schedules as [(typeof schedules)[number], ...typeof schedules]

const queue = {
  name: 'lasce',
  upsertJobScheduler,
  getJobSchedulers,
  removeJobScheduler,
} as unknown as Queue

beforeEach(() => {
  vi.clearAllMocks()
  getJobSchedulers.mockResolvedValue([])
})

describe('syncSchedules', () => {
  test('upserts every declared schedule with its cron and timezone', async () => {
    const result = await syncSchedules(queue)

    expect(upsertJobScheduler).toHaveBeenCalledTimes(schedules.length)
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      declared.id,
      { pattern: declared.cron, tz: declared.timezone },
      { name: declared.name, data: declared.data },
    )
    expect(result.upserted).toEqual(schedules.map((schedule) => schedule.id))
  })

  test('removes a scheduler that is no longer declared', async () => {
    getJobSchedulers.mockResolvedValue([{ key: 'retired-job' }, { key: declared.id }])

    const result = await syncSchedules(queue)

    expect(removeJobScheduler).toHaveBeenCalledExactlyOnceWith('retired-job')
    expect(result.removed).toEqual(['retired-job'])
  })

  test('falls back to the scheduler id and skips entries with neither', async () => {
    getJobSchedulers.mockResolvedValue([{ id: 'legacy-job' }, {}])

    const result = await syncSchedules(queue)

    expect(result.removed).toEqual(['legacy-job'])
  })

  test('reports the queue it synced', async () => {
    const result = await syncSchedules(queue)

    expect(result.queue).toBe('lasce')
  })
})
