import { JOB_NAMES, type JobPayload } from '@lasce/contracts'
import type { Queue } from 'bullmq'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { enqueue } from './enqueue'
import { getQueue } from './queue'

// The real getQueue() opens a Redis connection at first use, which a unit test
// must not need. Only the queue boundary is stubbed; the contract validation
// enqueue() performs is exercised for real.
vi.mock('./queue', () => ({ getQueue: vi.fn() }))

const add = vi.fn()

const ingestReadings: JobPayload<'ingest-readings'> = {
  deviceId: 'device-1',
  from: '2026-01-01T00:00:00Z',
  to: '2026-01-02T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  add.mockResolvedValue({ id: 'job-123' })
  vi.mocked(getQueue).mockReturnValue({ add } as unknown as Queue)
})

describe('enqueue', () => {
  test('returns the id BullMQ assigned', async () => {
    const id = await enqueue(JOB_NAMES.ingestReadings, ingestReadings)

    expect(id).toBe('job-123')
  })

  test('passes the parsed payload through to the queue', async () => {
    await enqueue(JOB_NAMES.ingestReadings, ingestReadings)

    expect(add).toHaveBeenCalledWith(
      JOB_NAMES.ingestReadings,
      expect.objectContaining({ deviceId: 'device-1' }),
      undefined,
    )
  })

  test('forwards job options untouched', async () => {
    await enqueue(JOB_NAMES.ingestReadings, ingestReadings, { delay: 5_000 })

    expect(add).toHaveBeenCalledWith(JOB_NAMES.ingestReadings, expect.anything(), { delay: 5_000 })
  })

  test('rejects a malformed payload before it reaches the queue', async () => {
    await expect(
      enqueue(JOB_NAMES.ingestReadings, {
        deviceId: 'device-1',
        from: 'yesterday',
        to: '2026-01-01T00:00:00Z',
      } as never),
    ).rejects.toThrow()

    // The whole point of validating here is that a bad job never gets queued.
    expect(add).not.toHaveBeenCalled()
  })

  test('fails loudly when BullMQ returns a job without an id', async () => {
    add.mockResolvedValue({ id: undefined })

    await expect(enqueue(JOB_NAMES.ingestReadings, ingestReadings)).rejects.toThrow(
      /no id for job "ingest-readings"/,
    )
  })
})
