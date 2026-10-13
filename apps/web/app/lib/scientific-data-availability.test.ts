import { describe, expect, test } from 'vitest'
import type { ScientificDataQuery } from './scientific-data'
import { getAvailabilityMessage, getGoesAvailability } from './scientific-data-availability'

const availability = getGoesAvailability(new Date('2026-09-14T12:30:00Z'))
const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'Fe171',
  parameter: 'image',
  date: '2026-09-13',
  startTime: '12:30',
  endTime: '23:59',
}

describe('scientific data availability', () => {
  test('uses the current UTC date as the latest GOES day', () => {
    expect(getGoesAvailability(new Date('2026-10-01T00:30:12Z'))).toEqual({ today: '2026-10-01' })
  })
  test.each([
    { product: 'Fe171' as const, parameter: 'image' },
    { product: 'SFXR' as const, parameter: '0.1-0.8nm' },
  ])('accepts historical and current dates for $product', (overrides) => {
    expect(
      getAvailabilityMessage({ ...query, ...overrides, date: '2025-01-05' }, availability),
    ).toBeNull()
    expect(
      getAvailabilityMessage({ ...query, ...overrides, date: '2026-09-14' }, availability),
    ).toBeNull()
  })
  test('rejects future GOES dates', () => {
    expect(getAvailabilityMessage({ ...query, date: '2026-09-15' }, availability)).toContain(
      'posterior a hoy',
    )
  })
  test('leaves ROSAC dates unrestricted', () => {
    const rosac: ScientificDataQuery = {
      ...query,
      source: 'ROSAC',
      product: 'ROSAC-I1',
      parameter: 'simulated-intensity',
      date: '2030-01-01',
    }
    expect(getAvailabilityMessage(rosac, availability)).toBeNull()
  })
})
