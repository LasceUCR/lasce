import { describe, expect, test } from 'vitest'

import { COUNTRY_CODES, isCountryCode, listCountries } from './countries'

describe('COUNTRY_CODES', () => {
  test('lists the 249 officially assigned ISO 3166-1 alpha-2 codes once each', () => {
    expect(COUNTRY_CODES).toHaveLength(249)
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/)
    }
  })
})

describe('isCountryCode', () => {
  test('accepts an assigned upper-case code and nothing else', () => {
    expect(isCountryCode('CR')).toBe(true)
    expect(isCountryCode('cr')).toBe(false)
    expect(isCountryCode('XX')).toBe(false)
    expect(isCountryCode('')).toBe(false)
  })
})

describe('listCountries', () => {
  test('names every code in Spanish', () => {
    const countries = listCountries()

    expect(countries).toHaveLength(COUNTRY_CODES.length)
    expect(countries).toContainEqual({ code: 'CR', name: 'Costa Rica' })
    expect(countries).toContainEqual({ code: 'US', name: 'Estados Unidos' })
    for (const country of countries) {
      expect(country.name).not.toBe(country.code)
      expect(country.name).not.toMatch(/desconocid/i)
    }
  })

  test('sorts by Spanish name', () => {
    const names = listCountries().map((country) => country.name)

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))
  })

  test('returns the same memoized list on every call', () => {
    expect(listCountries()).toBe(listCountries())
  })
})
