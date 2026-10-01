import { describe, expect, test, vi } from 'vitest'

import type { ScientificDataQuery } from '@/app/lib/scientific-data'
import { UnsupportedScientificQueryError } from '@/app/services/scientific-data/errors'
import { createInstrumentRoutedDataSource } from '@/app/services/scientific-data/instrumentRoutedDataSource'
import type { ScientificDataProvider } from '@/app/services/scientific-data/scientificDataSource'

const xrayQuery: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '09:00',
}
const suviQuery: ScientificDataQuery = { ...xrayQuery, product: 'Fe171', parameter: 'image' }

function fakeProvider(jobId: string) {
  const query = vi.fn().mockResolvedValue({ state: 'pending', jobId, progress: 0 })
  return { query } satisfies ScientificDataProvider
}

describe('instrument-routed data source', () => {
  test('sends each product to the provider registered for its instrument', async () => {
    const images = fakeProvider('images')
    const archive = fakeProvider('archive')
    const goes = createInstrumentRoutedDataSource('GOES', { SUVI: images, EXIS: archive })

    expect(goes.code).toBe('GOES')
    expect(await goes.query({ query: suviQuery })).toMatchObject({ jobId: 'images' })
    expect(await goes.query({ query: xrayQuery, jobId: 'job-1' })).toMatchObject({
      jobId: 'archive',
    })
    expect(images.query).toHaveBeenCalledExactlyOnceWith({ query: suviQuery })
    expect(archive.query).toHaveBeenCalledExactlyOnceWith({ query: xrayQuery, jobId: 'job-1' })
  })

  test('rejects a product whose instrument has no provider', async () => {
    const goes = createInstrumentRoutedDataSource('GOES', { SUVI: fakeProvider('images') })

    await expect(goes.query({ query: xrayQuery })).rejects.toBeInstanceOf(
      UnsupportedScientificQueryError,
    )
  })

  test('rejects a product that does not belong to the source', async () => {
    const rosac = createInstrumentRoutedDataSource('ROSAC', { EXIS: fakeProvider('archive') })

    await expect(rosac.query({ query: xrayQuery })).rejects.toBeInstanceOf(
      UnsupportedScientificQueryError,
    )
  })
})
