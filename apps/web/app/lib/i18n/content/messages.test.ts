import { describe, expect, test } from 'vitest'

import { locales } from '@/app/lib/i18n/config'

import {
  contentCopy,
  contentMessages,
  inLanguage,
  joinEnglish,
  joinSpanish,
  languageNames,
  withArticle,
} from './messages'

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

describe('contentCopy', () => {
  const summary = { noun: { word: 'descripción', gender: 'f' }, nouns: { en: 'summary' } } as const
  const unnamed = { noun: { word: 'lema', gender: 'm' } } as const

  test('the Spanish copy is the API copy', () => {
    expect(contentCopy.es.required(summary, 'en')).toBe(
      contentMessages.required(summary.noun, 'en'),
    )
    expect(contentCopy.es.fieldPending).toBe(
      'Actualice este campo o confirme que sigue siendo correcto.',
    )
  })

  test('the English copy names the field and the languages in English', () => {
    expect(contentCopy.en.required(summary, 'es')).toBe('The Spanish summary is required.')
    expect(contentCopy.en.requiredWithCounterpart(summary, 'es', ['en'])).toBe(
      'The Spanish summary is required because the English summary was filled in.',
    )
    expect(contentCopy.en.counterpartChanged(summary, 'en', ['es'])).toBe(
      'The Spanish summary changed. Update the English summary or confirm that it is still correct.',
    )
    expect(contentCopy.en.versionAdded(summary, 'es', ['en'])).toBe(
      'Since you are adding the English version, check the Spanish summary: the original text may be in another language. Update it or confirm that it is correct.',
    )
    expect(contentCopy.en.pending(2)).toBe('2 to review')
    expect(contentCopy.en.errorSummary(3, ['English'])).toBe(
      'There are 3 fields to review. Also check the English tab.',
    )
  })

  test('falls back to the Spanish word for a field without an English name', () => {
    expect(contentCopy.en.required(unnamed, 'en')).toBe('The English lema is required.')
  })

  test('has an entry for every locale', () => {
    for (const locale of locales) expect(contentCopy[locale].missingTranslation).toBeTruthy()
  })
})

describe('joinEnglish', () => {
  test('joins with commas and a final and', () => {
    expect(joinEnglish([])).toBe('')
    expect(joinEnglish(['a'])).toBe('a')
    expect(joinEnglish(['a', 'b'])).toBe('a and b')
    expect(joinEnglish(['a', 'b', 'c'])).toBe('a, b and c')
  })
})
