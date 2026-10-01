import { describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery, ScientificSourceCode } from '@/app/lib/scientific-data'
import { UnsupportedScientificQueryError } from '@/app/services/scientific-data/errors'
import type { ScientificDataSource } from '@/app/services/scientific-data/scientificDataSource'
import { ScientificDataSourceManager } from '@/app/services/scientific-data/scientificDataSourceManager'

const goesQuery: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}

function fakeSource(code: ScientificSourceCode) {
  const query = vi.fn().mockResolvedValue({ state: 'pending', jobId: code, progress: 0 })
  return { code, query } satisfies ScientificDataSource
}

describe('ScientificDataSourceManager', () => {
  test('hands the request, poll token included, to the source named by the query', async () => {
    const goes = fakeSource('GOES')
    const rosac = fakeSource('ROSAC')
    const manager = new ScientificDataSourceManager([goes, rosac])

    const response = await manager.query({ query: goesQuery, jobId: 'job-1' })

    expect(response).toEqual({ state: 'pending', jobId: 'GOES', progress: 0 })
    expect(goes.query).toHaveBeenCalledWith({ query: goesQuery, jobId: 'job-1' })
    expect(rosac.query).not.toHaveBeenCalled()
  })

  test('rejects a query for a source that is not registered', async () => {
    const manager = new ScientificDataSourceManager([fakeSource('ROSAC')])

    await expect(manager.query({ query: goesQuery })).rejects.toBeInstanceOf(
      UnsupportedScientificQueryError,
    )
  })

  test('refuses to register the same source twice', () => {
    expect(() => new ScientificDataSourceManager([fakeSource('GOES'), fakeSource('GOES')])).toThrow(
      /registered twice/,
    )
  })
})
