import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryExisReadingsFull: vi.fn(),
  queryMagReadingsFull: vi.fn(),
  queryEhisReadingsFull: vi.fn(),
  querySgpsReadingsFull: vi.fn(),
  queryMpshReadingsFull: vi.fn(),
}))

vi.mock('@/app/services/scientific-data', () => ({
  scientificDataSources: { query: mocks.query },
}))
vi.mock('@/app/services/scientific-data/exisReadingsDataSource', () => ({
  queryExisReadingsFull: mocks.queryExisReadingsFull,
}))
vi.mock('@/app/services/scientific-data/magReadingsDataSource', () => ({
  queryMagReadingsFull: mocks.queryMagReadingsFull,
}))
vi.mock('@/app/services/scientific-data/ehisReadingsDataSource', () => ({
  queryEhisReadingsFull: mocks.queryEhisReadingsFull,
}))
vi.mock('@/app/services/scientific-data/sgpsReadingsDataSource', () => ({
  querySgpsReadingsFull: mocks.querySgpsReadingsFull,
}))
vi.mock('@/app/services/scientific-data/mpshReadingsDataSource', () => ({
  queryMpshReadingsFull: mocks.queryMpshReadingsFull,
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

  test('exports MAG data at full resolution rather than the sampled chart series', async () => {
    const mag = { ...query, product: 'GEOF' as const, parameter: 'EPN-z' }

    await findDownloadLoader('GOES', 'MAG', 'csv')!({ query: mag })

    expect(mocks.queryMagReadingsFull).toHaveBeenCalledWith(mag)
    expect(mocks.query).not.toHaveBeenCalled()
  })

  test.each([
    ['EHIS', 'H:E1', mocks.queryEhisReadingsFull],
    ['SGPS', 'plus:P1', mocks.querySgpsReadingsFull],
    ['MPSH', 'electron:T1:E1', mocks.queryMpshReadingsFull],
  ] as const)(
    'exports SEISS %s from its own full-resolution reader',
    async (product, parameter, read) => {
      const seiss: ScientificDataQuery = { ...query, product, parameter }

      await findDownloadLoader('GOES', 'SEISS', 'csv')!({ query: seiss })

      expect(read).toHaveBeenCalledWith(seiss)
      expect(mocks.query).not.toHaveBeenCalled()
    },
  )

  test('refuses to export a SEISS product the pipeline does not ingest', async () => {
    await expect(
      findDownloadLoader('GOES', 'SEISS', 'csv')!({ query: { ...query, product: 'MPSL' } }),
    ).rejects.toThrow('MPSL has no data export')
  })
})
