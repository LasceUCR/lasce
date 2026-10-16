import { describe, expect, test } from 'vitest'

import type { ScientificProduct, ScientificSource } from './scientific-data'
import { countQueryableInstruments } from './summary-cards'

function product(available: boolean): ScientificProduct {
  return { code: 'SFXR', name: 'x', visualization: 'time-series', available, parameters: [] }
}

function source(dataKind: ScientificSource['dataKind'], ...instruments: boolean[][]) {
  return {
    code: 'GOES',
    name: 'x',
    description: 'x',
    dataKind,
    instruments: instruments.map((products) => ({
      code: 'EXIS',
      name: 'x',
      products: products.map(product),
    })),
  } satisfies ScientificSource
}

describe('countQueryableInstruments', () => {
  test('counts the observed instruments that have an available product', () => {
    expect(countQueryableInstruments([source('observed', [true], [false, true], [false])])).toBe(2)
  })

  test('leaves out the instruments of a simulated source', () => {
    expect(countQueryableInstruments([source('simulated', [true], [true])])).toBe(0)
  })

  test('counts EXIS, MAG, SEISS and SUVI in the /datos catalogue, not ROSAC', () => {
    expect(countQueryableInstruments()).toBe(4)
  })
})
