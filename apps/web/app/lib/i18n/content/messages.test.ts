import { describe, expect, test } from 'vitest'

import { locales } from '@/app/lib/i18n/config'

import { contentMessages, inLanguage, joinSpanish, languageNames, withArticle } from './messages'

describe('joinSpanish', () => {
  test.each([
    [[], ''],
    [['a'], 'a'],
    [['a', 'b'], 'a y b'],
    [['a', 'b', 'c'], 'a, b y c'],
  ])('joins %j as %j', (items, expected) => {
    expect(joinSpanish(items)).toBe(expected)
  })
})

describe('withArticle', () => {
  test('uses the article of the noun gender', () => {
    expect(withArticle({ word: 'nombre', gender: 'm' })).toBe('el nombre')
    expect(withArticle({ word: 'descripción', gender: 'f' })).toBe('la descripción')
  })
})

describe('language names', () => {
  test('name every supported locale', () => {
    for (const locale of locales) {
      expect(inLanguage[locale]).toMatch(/^en \S/)
      expect(languageNames[locale]).toBeTruthy()
    }
  })
})

describe('contentMessages', () => {
  const feminine = { word: 'descripción', gender: 'f' } as const

  test('agree with a feminine noun', () => {
    expect(contentMessages.required(feminine, 'en')).toBe(
      'La descripción en inglés es obligatoria.',
    )
    expect(contentMessages.requiredNotText(feminine, 'es')).toBe(
      'La descripción en español es obligatoria y debe ser texto.',
    )
  })

  test('name several filled languages', () => {
    expect(contentMessages.requiredWithCounterpart(feminine, 'es', ['en', 'es'])).toBe(
      'La descripción en español es obligatoria porque se completó en inglés y en español.',
    )
  })
})
