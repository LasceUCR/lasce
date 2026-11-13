import { describe, expect, test } from 'vitest'

import { rosacInstrumentsContent } from './rosac-instruments'
import { rosacInstruments, scientificDataQuerySchema } from './scientific-data'
import {
  getInitialScientificQuery,
  getRequestedScientificQuery,
  scientificDataHref,
  withQueryReturn,
} from './scientific-data-navigation'

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
      const url = new URL(card.consultation!.href!, 'https://lasce.test')
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
    expect(rosacInstrumentsContent.items[2]!.consultation).toEqual({
      label: 'Consultar simulación del ROSAC-HIROS',
    })
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

describe('restoring a query from the URL', () => {
  const query = {
    source: 'GOES',
    product: 'SFXR',
    parameter: '0.1-0.8nm',
    date: '2025-01-05',
    startTime: '08:00',
    endTime: '09:00',
  } as const

  test('writes every query field to the data page URL', () => {
    expect(scientificDataHref(query)).toBe(
      '/datos?source=GOES&product=SFXR&parameter=0.1-0.8nm&date=2025-01-05&startTime=08%3A00&endTime=09%3A00',
    )
  })

  test('reads back a query it wrote', () => {
    const url = new URL(scientificDataHref(query), 'https://lasce.test')
    expect(getRequestedScientificQuery(Object.fromEntries(url.searchParams), date)).toEqual(query)
  })

  test.each([
    { ...query, endTime: undefined },
    { ...query, source: ['GOES', 'ROSAC'] },
    { ...query, product: 'ROSAC-I1' },
    { ...query, parameter: 'unknown' },
    { ...query, date: '2025-02-30' },
    { ...query, date: '2026-10-02' },
    { ...query, startTime: '09:00', endTime: '08:00' },
  ])('ignores an incomplete, invalid or future query: %j', (params) => {
    expect(getRequestedScientificQuery(params, date)).toBeNull()
  })

  test('returns from sign-in to the same consultation', () => {
    const href = withQueryReturn('/acceso?next=%2Fdatos&reason=auth', query)
    const url = new URL(href, 'https://lasce.test')

    expect(url.pathname).toBe('/acceso')
    expect(url.searchParams.get('reason')).toBe('auth')
    expect(url.searchParams.get('next')).toBe(scientificDataHref(query))
  })

  test('leaves a sign-in link without a return path alone', () => {
    expect(withQueryReturn('/acceso', query)).toBe('/acceso')
  })
})
