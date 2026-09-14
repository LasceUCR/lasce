import { describe, expect, test } from 'vitest'

import {
  findScientificProduct,
  GOES_PRODUCT_CODES,
  goesInstruments,
  rosacInstruments,
  scientificDataQuerySchema,
} from './scientific-data'

const validQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-10',
  startTime: '08:00',
  endTime: '12:00',
}

describe('scientific data catalog and query validation', () => {
  test('lists every supplied GOES product under exactly one instrument', () => {
    const catalogCodes = goesInstruments.flatMap((instrument) =>
      instrument.products.map((product) => product.code),
    )

    expect(catalogCodes).toEqual(GOES_PRODUCT_CODES)
    expect(new Set(catalogCodes).size).toBe(GOES_PRODUCT_CODES.length)
    expect(goesInstruments.map((instrument) => instrument.code)).toEqual([
      'EXIS',
      'MAG',
      'SEISS',
      'SUVI',
    ])
  })

  test('keeps ROSAC instruments explicitly provisional', () => {
    expect(rosacInstruments.map(({ name }) => name)).toEqual([
      'Instrumento 1 (por definir)',
      'Instrumento 2 (por definir)',
    ])
    expect(rosacInstruments[1]!.products[0]).toMatchObject({
      visualization: 'dynamic-spectrum',
    })
  })

  test('resolves a source product together with its instrument', () => {
    expect(findScientificProduct('GOES', 'Fe171')).toMatchObject({
      instrument: { code: 'SUVI' },
      product: { code: 'Fe171', name: 'Imágenes solares: 171 Å (Fe171)' },
    })
    expect(findScientificProduct('ROSAC', 'SFXR')).toBeNull()
  })

  test('accepts a valid source, product, parameter, calendar day and time range', () => {
    expect(scientificDataQuerySchema.safeParse(validQuery).success).toBe(true)
  })

  test.each([
    ['equal times', { startTime: '08:00', endTime: '08:00' }],
    ['end before start', { startTime: '12:00', endTime: '08:00' }],
    ['nonexistent calendar day', { date: '2026-02-31' }],
    ['unknown product', { product: 'UNKNOWN' }],
    ['source and product mismatch', { source: 'ROSAC' }],
    ['parameter and product mismatch', { parameter: 'Hp' }],
    ['unavailable GOES product', { product: 'EHIS', parameter: 'heavy-ion' }],
    ['SGPS proton channel under MPSH', { product: 'MPSH', parameter: 'proton:P1' }],
  ])('rejects %s', (_label, overrides) => {
    expect(scientificDataQuerySchema.safeParse({ ...validQuery, ...overrides }).success).toBe(false)
  })
})
