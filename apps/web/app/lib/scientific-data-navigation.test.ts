import { describe, expect, test } from 'vitest'

import { rosacInstrumentsContent } from './rosac-instruments'
import { rosacInstruments, scientificDataQuerySchema } from './scientific-data'
import { getInitialScientificQuery } from './scientific-data-navigation'

const date = '2026-10-01'

describe('scientific data navigation', () => {
  test('keeps the existing GOES query when opening the data page normally', () => {
    expect(getInitialScientificQuery({}, date)).toEqual({
      source: 'GOES',
      product: 'SFXR',
      parameter: '0.1-0.8nm',
      date,
      startTime: '00:00',
      endTime: '23:59',
    })
  })

  test('resolves each ROSAC card link to its existing product and parameter', () => {
    expect(rosacInstrumentsContent.items).toHaveLength(3)
    expect(rosacInstruments).toHaveLength(2)
    for (const card of rosacInstrumentsContent.items.slice(0, 2)) {
      const url = new URL(card.consultation!.href, 'https://lasce.test')
      const query = getInitialScientificQuery(Object.fromEntries(url.searchParams), date)
      const instrument = rosacInstruments.find((item) => item.code === card.id)!
      expect(card.consultation!.notice).toContain(instrument.products[0]!.name)
      expect(query).toMatchObject({
        source: 'ROSAC',
        product: instrument.products[0]!.code,
        parameter: instrument.products[0]!.parameters[0]!.code,
      })
      expect(scientificDataQuerySchema.safeParse(query).success).toBe(true)
      expect(url.hash).toBe('#scientific-query-title')
    }
    expect(rosacInstrumentsContent.items[2]!.consultation).toBeUndefined()
  })

  test('selects the first simulation for the general ROSAC consultation link', () => {
    expect(getInitialScientificQuery({ source: 'ROSAC' }, date)).toMatchObject({
      source: 'ROSAC',
      product: 'ROSAC-I1',
    })
  })

  test.each([
    { source: 'unknown', instrument: 'ROSAC-I1' },
    { source: 'GOES', instrument: 'ROSAC-I1' },
    { source: 'ROSAC', instrument: 'ROSAC-I3' },
    { source: 'ROSAC', instrument: 'SUVI' },
    { source: 'ROSAC', instrument: '' },
    { source: ['ROSAC', 'GOES'], instrument: 'ROSAC-I1' },
    { source: 'ROSAC', instrument: ['ROSAC-I1', 'ROSAC-I2'] },
  ])('safely ignores invalid or ambiguous links: %j', (params) => {
    expect(getInitialScientificQuery(params, date)).toEqual(getInitialScientificQuery({}, date))
  })
})
