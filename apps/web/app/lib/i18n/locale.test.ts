import { describe, expect, test } from 'vitest'

import { defaultLocale, isLocale, localeLabels, locales } from './config'
import { resolveLocale } from './locale'

describe('resolveLocale', () => {
  test('keeps a supported language', () => {
    expect(resolveLocale('en')).toBe('en')
    expect(resolveLocale('es')).toBe('es')
  })

  test('falls back to Spanish when there is no cookie', () => {
    expect(resolveLocale(undefined)).toBe('es')
  })

  test.each(['fr', '', 'EN', 'en-US', '../../etc/passwd'])(
    'falls back to Spanish for the unsupported value %j',
    (value) => {
      expect(resolveLocale(value)).toBe(defaultLocale)
    },
  )
})

describe('locale configuration', () => {
  test('names every supported language for the language switcher', () => {
    for (const locale of locales) {
      expect(localeLabels[locale]).toEqual(expect.any(String))
    }
  })

  test('recognises only supported languages', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(42)).toBe(false)
  })
})
