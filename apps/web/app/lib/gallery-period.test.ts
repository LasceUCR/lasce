import { describe, expect, test } from 'vitest'

import {
  emptyPeriod,
  formatYearsLabel,
  localizeYearsLabel,
  parseYearsLabel,
  periodError,
  type AlbumPeriod,
} from './gallery-period'

function period(
  start: [month: number | null, year: number | null],
  end: [month: number | null, year: number | null] = [null, null],
): AlbumPeriod {
  return {
    start: { month: start[0], year: start[1] },
    end: { month: end[0], year: end[1] },
  }
}

describe('parseYearsLabel', () => {
  test('reads a year range, a single month and a month range', () => {
    expect(parseYearsLabel('2019–2023')).toEqual(period([null, 2019], [null, 2023]))
    expect(parseYearsLabel('febrero 2026')).toEqual(period([2, 2026]))
    expect(parseYearsLabel('Marzo 2024 - junio 2025')).toEqual(period([3, 2024], [6, 2025]))
  })

  test('reads an empty label as an empty period', () => {
    expect(parseYearsLabel('  ')).toEqual(emptyPeriod)
  })

  test('reads English month names too, as an editor in English is shown them', () => {
    expect(parseYearsLabel('February 2026')).toEqual(period([2, 2026]))
    expect(parseYearsLabel('May 2024–September 2025')).toEqual(period([5, 2024], [9, 2025]))
  })

  test('returns null for a label in any other shape', () => {
    expect(parseYearsLabel('primavera 2024')).toBeNull()
    expect(parseYearsLabel('desde 2020')).toBeNull()
  })
})

describe('formatYearsLabel', () => {
  test('writes the stored label, with Spanish month names', () => {
    expect(formatYearsLabel(period([null, 2019], [null, 2023]))).toBe('2019–2023')
    expect(formatYearsLabel(period([2, 2026]))).toBe('febrero 2026')
    expect(formatYearsLabel(period([3, 2024], [6, 2025]))).toBe('marzo 2024–junio 2025')
  })

  test('collapses an end equal to the start and leaves an empty period empty', () => {
    expect(formatYearsLabel(period([null, 2025], [null, 2025]))).toBe('2025')
    expect(formatYearsLabel(emptyPeriod)).toBe('')
  })

  test('round-trips every label it writes', () => {
    for (const label of ['2019–2023', 'febrero 2026', 'marzo 2024–junio 2025', '2020']) {
      const parsed = parseYearsLabel(label)
      expect(parsed && formatYearsLabel(parsed)).toBe(label)
    }
  })
})

describe('periodError', () => {
  test('accepts an empty period, a start alone and an ordered range', () => {
    expect(periodError(emptyPeriod)).toBeNull()
    expect(periodError(period([2, 2026]))).toBeNull()
    expect(periodError(period([null, 2025], [3, 2025]))).toBeNull()
  })

  test('rejects a month without a year and an end without a start', () => {
    expect(periodError(period([2, null]))).toBe('monthNeedsYear')
    expect(periodError(period([null, 2020], [5, null]))).toBe('monthNeedsYear')
    expect(periodError(period([null, null], [null, 2020]))).toBe('endNeedsStart')
  })

  test('rejects an end before the start', () => {
    expect(periodError(period([null, 2024], [null, 2023]))).toBe('endBeforeStart')
    expect(periodError(period([6, 2024], [3, 2024]))).toBe('endBeforeStart')
  })
})

describe('localizeYearsLabel', () => {
  test('shows the month names in English for an English visitor', () => {
    expect(localizeYearsLabel('febrero 2026', 'en')).toBe('February 2026')
    expect(localizeYearsLabel('marzo 2024–junio 2025', 'en')).toBe('March 2024–June 2025')
  })

  test('leaves Spanish, year-only and unrecognised labels as stored', () => {
    expect(localizeYearsLabel('febrero 2026', 'es')).toBe('febrero 2026')
    expect(localizeYearsLabel('2019–2023', 'en')).toBe('2019–2023')
    expect(localizeYearsLabel('primavera 2024', 'en')).toBe('primavera 2024')
    expect(localizeYearsLabel('', 'en')).toBe('')
  })

  test('is saved back with the Spanish names', () => {
    const parsed = parseYearsLabel(localizeYearsLabel('marzo 2024–junio 2025', 'en'))
    expect(parsed && formatYearsLabel(parsed)).toBe('marzo 2024–junio 2025')
  })
})
