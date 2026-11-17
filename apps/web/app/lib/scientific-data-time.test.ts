import { describe, expect, test } from 'vitest'

import {
  crossesMidnight,
  getLocalRange,
  getQueryMinuteRange,
  getQueryWindow,
  toCostaRicaTime,
} from './scientific-data-time'

describe('scientific data time', () => {
  test('treats an end before the start as a range across midnight', () => {
    expect(crossesMidnight({ startTime: '23:00', endTime: '01:00' })).toBe(true)
    expect(crossesMidnight({ startTime: '00:00', endTime: '23:59' })).toBe(false)
  })

  test('ends a range across midnight on the next day', () => {
    expect(getQueryWindow({ date: '2026-09-30', startTime: '23:00', endTime: '01:00' })).toEqual({
      start: '2026-09-30T23:00:00Z',
      end: '2026-10-01T01:00:59.999Z',
    })
  })

  test('keeps a same-day range on its own date', () => {
    expect(getQueryWindow({ date: '2026-09-30', startTime: '00:00', endTime: '23:59' })).toEqual({
      start: '2026-09-30T00:00:00Z',
      end: '2026-09-30T23:59:59.999Z',
    })
  })

  test('counts the minutes of a range across midnight past 24 hours', () => {
    expect(getQueryMinuteRange({ startTime: '23:00', endTime: '01:00' })).toEqual({
      start: 1380,
      end: 1500,
    })
  })

  test('converts UTC to Costa Rica time, six hours behind', () => {
    expect(toCostaRicaTime('12:00')).toEqual({ time: '06:00', dayOffset: 0 })
    expect(toCostaRicaTime('03:30')).toEqual({ time: '21:30', dayOffset: -1 })
  })

  test('converts both ends of a range across midnight', () => {
    expect(getLocalRange({ startTime: '23:00', endTime: '01:00' })).toEqual({
      start: { time: '17:00', dayOffset: 0 },
      end: { time: '19:00', dayOffset: 0 },
    })
    expect(getLocalRange({ startTime: '00:00', endTime: '23:59' })).toEqual({
      start: { time: '18:00', dayOffset: -1 },
      end: { time: '17:59', dayOffset: 0 },
    })
  })
})
