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

const processFile: JobPayload<'process-file'> = {
  objectKey: 'uploads/a.csv',
  contentType: 'text/csv',
}

// enqueue() is typed on the schema's *output*, where contentType is already
// defaulted, so omitting it is valid input but not valid TypeScript. The cast
// is what lets the test prove the runtime default is still applied.
const withoutContentType = { objectKey: 'uploads/a.csv' } as JobPayload<'process-file'>

beforeEach(() => {
  vi.clearAllMocks()
  add.mockResolvedValue({ id: 'job-123' })
  vi.mocked(getQueue).mockReturnValue({ add } as unknown as Queue)
})

describe('enqueue', () => {
  test('returns the id BullMQ assigned', async () => {
    const id = await enqueue(JOB_NAMES.processFile, processFile)

    expect(id).toBe('job-123')
  })

  test('passes the parsed payload, so contract defaults reach the worker', async () => {
    await enqueue(JOB_NAMES.processFile, withoutContentType)

    expect(add).toHaveBeenCalledWith(
      JOB_NAMES.processFile,
      // contentType is defaulted by the contract, not supplied above.
      expect.objectContaining({
        objectKey: 'uploads/a.csv',
        contentType: 'application/octet-stream',
      }),
      undefined,
    )
  })

  test('forwards job options untouched', async () => {
    await enqueue(JOB_NAMES.processFile, processFile, { delay: 5_000 })

    expect(add).toHaveBeenCalledWith(JOB_NAMES.processFile, expect.anything(), { delay: 5_000 })
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

    await expect(enqueue(JOB_NAMES.processFile, processFile)).rejects.toThrow(
      /no id for job "process-file"/,
    )
  })
})
