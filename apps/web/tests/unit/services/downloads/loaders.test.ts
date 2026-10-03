import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), queryExisReadingsFull: vi.fn() }))

vi.mock('@/app/services/scientific-data', () => ({
  scientificDataSources: { query: mocks.query },
}))
vi.mock('@/app/services/scientific-data/exisReadingsDataSource', () => ({
  queryExisReadingsFull: mocks.queryExisReadingsFull,
}))

import { DOWNLOAD_FORMATS } from '@/app/lib/downloads/formats'
import { DOWNLOAD_POLICIES } from '@/app/lib/downloads/policy'
import type { ScientificDataQuery } from '@/app/lib/scientific-data'
import { findDownloadLoader } from '@/app/services/downloads/loaders'

const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-27',
  startTime: '08:00',
  endTime: '09:00',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('findDownloadLoader', () => {
  test('has a loader for every download the policy allows', () => {
    const missing = Object.entries(DOWNLOAD_POLICIES).flatMap(([source, instruments]) =>
      Object.entries(instruments ?? {}).flatMap(([instrument, policy]) =>
        DOWNLOAD_FORMATS.filter((format) => policy[format]).flatMap((format) =>
          findDownloadLoader(source as never, instrument as never, format)
            ? []
            : [`${source}/${instrument}/${format}`],
        ),
      ),
    )

    expect(missing).toEqual([])
  })

  test('has no loader for SUVI', () => {
    expect(findDownloadLoader('GOES', 'SUVI', 'png')).toBeNull()
    expect(findDownloadLoader('GOES', 'SUVI', 'csv')).toBeNull()
  })

  test('draws a chart image from the result the page showed', async () => {
    mocks.query.mockResolvedValue({ state: 'pending', jobId: 'job', progress: 0 })

    await findDownloadLoader('GOES', 'MAG', 'png')!({ query, jobId: 'job' })

    expect(mocks.query).toHaveBeenCalledWith({ query, jobId: 'job' })
  })

  test('exports EXIS data at full resolution rather than the sampled chart series', async () => {
    await findDownloadLoader('GOES', 'EXIS', 'csv')!({ query })

    expect(mocks.queryExisReadingsFull).toHaveBeenCalledWith(query)
    expect(mocks.query).not.toHaveBeenCalled()
  })
})
