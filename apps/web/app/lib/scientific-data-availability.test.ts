import { describe, expect, test } from 'vitest'
import type { ScientificDataQuery } from './scientific-data'
import {
  fitSuviQuery,
  getAvailabilityMessage,
  getSuviAvailability,
  getSuviTimeLimits,
} from './scientific-data-availability'

const availability = getSuviAvailability(new Date('2026-09-14T12:30:00Z'))
const query: ScientificDataQuery = {
  source: 'GOES',
  product: 'Fe171',
  parameter: 'image',
  date: '2026-09-13',
  startTime: '12:30',
  endTime: '23:59',
}

describe('scientific data availability', () => {
  test('bounds the calendar and UTC times to the last 24 hours across month boundaries', () => {
    expect(getSuviAvailability(new Date('2026-10-01T12:30:12Z'))).toEqual({
      start: '2026-09-30T12:31:00.000Z',
      end: '2026-10-01T12:30:00.000Z',
    })
    expect(getSuviTimeLimits('2026-09-13', availability)).toEqual({ min: '12:30', max: '23:59' })
    expect(getSuviTimeLimits('2026-09-14', availability)).toEqual({ min: '00:00', max: '12:30' })
    expect(getAvailabilityMessage(query, availability)).toBeNull()
  })
  test.each([
    { date: '2026-09-12' },
    { startTime: '12:29' },
    { date: '2026-09-14', startTime: '12:00', endTime: '12:31' },
    { date: '2026-09-15' },
  ])('rejects solar images outside the rolling interval: %j', (overrides) => {
    expect(getAvailabilityMessage({ ...query, ...overrides }, availability)).toContain(
      'últimas 24 horas',
    )
  })
  test('preserves CITIC historical dates while rejecting future GOES dates', () => {
    const historical = {
      ...query,
      product: 'SFXR' as const,
      parameter: '0.1-0.8nm',
      date: '2025-01-05',
    }
    expect(getAvailabilityMessage(historical, availability)).toBeNull()
    expect(getAvailabilityMessage({ ...historical, date: '2026-09-15' }, availability)).toContain(
      'posterior a hoy',
    )
  })
  test('fits a historical selection to SUVI and keeps a usable interval at midnight', () => {
    expect(fitSuviQuery({ ...query, date: '2025-01-05' }, availability)).toMatchObject({
      date: '2026-09-14',
      startTime: '00:00',
      endTime: '12:30',
    })
    const midnight = getSuviAvailability(new Date('2026-09-14T00:00:00Z'))
    expect(fitSuviQuery({ ...query, date: '2026-09-14' }, midnight)).toMatchObject({
      date: '2026-09-13',
      startTime: '12:30',
      endTime: '23:59',
    })
  })
})
