import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  getJobStatus: vi.fn(),
  retry: vi.fn(),
  getJob: vi.fn(),
}))
vi.mock('@lasce/jobs', () => ({
  enqueue: mocks.enqueue,
  getJobStatus: mocks.getJobStatus,
  getQueue: () => ({ getJob: mocks.getJob }),
}))

import { queryCiticScientificData } from '@/app/services/scientific-data/citicScientificDataSource'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2025-01-05',
  startTime: '11:20',
  endTime: '11:21',
}
const { source: _source, ...payload } = query

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getJobStatus.mockResolvedValue(null)
})

describe('CITIC historical query', () => {
  test('enqueues one validated historical interval with a stable identifier', async () => {
    const result = await queryCiticScientificData(query)
    expect(result).toMatchObject({ state: 'pending', progress: 0 })
    expect(mocks.enqueue).toHaveBeenCalledWith('query-goes-archive', payload, {
      jobId: expect.stringMatching(/^goes-v1-[a-f0-9]{64}-archive$/),
    })
  })

  test('polls an existing query without adding work and returns observed provenance', async () => {
    const pending = await queryCiticScientificData(query)
    if (!('state' in pending)) throw new Error('Expected pending result')
    mocks.enqueue.mockClear()
    mocks.getJobStatus.mockResolvedValue({
      name: 'query-goes-archive',
      state: 'active',
      progress: 45,
    })
    expect(await queryCiticScientificData(query, pending.jobId)).toMatchObject({ progress: 45 })
    mocks.getJobStatus.mockResolvedValue({
      name: 'query-goes-archive',
      state: 'completed',
      returnValue: {
        query: payload,
        points: [{ timestamp: '2025-01-05T11:20:01Z', value: 0.001 }],
        satellite: 18,
        sampled: true,
      },
    })
    const result = await queryCiticScientificData(query, pending.jobId)
    expect(result).toMatchObject({
      visualization: 'time-series',
      points: [{ timestamp: '2025-01-05T11:20:01Z', value: 0.001 }],
      origin: { kind: 'observed', satellite: 18, provider: expect.stringContaining('CITIC') },
    })
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  test('rejects a poll identifier belonging to different criteria', async () => {
    await expect(queryCiticScientificData(query, 'another-job')).rejects.toThrow(/criterios/)
    expect(mocks.getJobStatus).not.toHaveBeenCalled()
  })

  test('does not return malformed or mismatched worker observations', async () => {
    mocks.getJobStatus.mockResolvedValue({
      name: 'query-goes-archive',
      state: 'completed',
      returnValue: {},
    })
    await expect(queryCiticScientificData(query)).rejects.toThrow(/CITIC/)
    mocks.getJobStatus.mockResolvedValue({
      name: 'query-goes-archive',
      state: 'completed',
      returnValue: {
        query: { ...payload, date: '2025-01-06' },
        points: [],
        satellite: null,
        sampled: false,
      },
    })
    await expect(queryCiticScientificData(query)).rejects.toThrow(/CITIC/)
  })

  test('surfaces failed work while polling and permits an explicit subsequent retry', async () => {
    const pending = await queryCiticScientificData(query)
    if (!('state' in pending)) throw new Error('Expected pending result')
    mocks.getJobStatus.mockResolvedValue({ name: 'query-goes-archive', state: 'failed' })
    await expect(queryCiticScientificData(query, pending.jobId)).rejects.toThrow(/CITIC/)
    expect(mocks.retry).not.toHaveBeenCalled()
    mocks.getJob.mockResolvedValue({ retry: mocks.retry })
    expect(await queryCiticScientificData(query)).toMatchObject({ state: 'pending' })
    expect(mocks.retry).toHaveBeenCalledOnce()
  })

  test('reports queue failures and refuses SUVI or ROSAC input', async () => {
    mocks.getJobStatus.mockRejectedValue(new Error('offline'))
    await expect(queryCiticScientificData(query)).rejects.toThrow(/CITIC/)
    await expect(
      queryCiticScientificData({ ...query, product: 'Fe171', parameter: 'image' }),
    ).rejects.toThrow(/time series/)
    await expect(queryCiticScientificData({ ...query, source: 'ROSAC' })).rejects.toThrow(
      /time series/,
    )
  })
})
