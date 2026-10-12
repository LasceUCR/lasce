import { describe, expect, test } from 'vitest'

import type { ContentInput, StoredContent } from './definition'
import {
  baseContent,
  contentLangAttribute,
  isLegacyContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from './resolve'
import { eventContent, profileContent } from './test-fixtures'

type EventStored = StoredContent<typeof eventContent.specs>

/** A base row as loaded, with columns that are not translatable. */
const baseRow = {
  id: '7d0c2a62-1d84-4a4e-9d64-4c5b1f2a9e10',
  name: 'Taller',
  summary: 'Sesión práctica.',
  startsAt: new Date('2026-03-01T15:00:00Z'),
}

const englishRow = {
  id: 'b1b0c9de-0d3f-4f61-8a0b-3c2b6c1d9f22',
  locale: 'en',
  name: 'Workshop',
  summary: 'Hands-on session.',
}

const complete: EventStored = {
  es: { name: 'Taller', summary: 'Sesión práctica.' },
  en: { name: 'Workshop', summary: 'Hands-on session.' },
}

const legacy: EventStored = { es: { name: 'Workshop', summary: null }, en: null }

describe('storedContentFrom', () => {
  test('keeps only the defined fields of the base row and of each translation row', () => {
    expect(storedContentFrom(eventContent, baseRow, [englishRow])).toEqual(complete)
  })

  test('leaves a locale without a translation row as null', () => {
    expect(storedContentFrom(eventContent, baseRow, [])).toEqual({
      es: { name: 'Taller', summary: 'Sesión práctica.' },
      en: null,
    })
  })

  test('ignores rows for unsupported locales', () => {
    const french = { locale: 'fr', name: 'Atelier', summary: null }

    expect(storedContentFrom(eventContent, baseRow, [french])).toEqual({
      es: { name: 'Taller', summary: 'Sesión práctica.' },
      en: null,
    })
  })
})

describe('isLegacyContent', () => {
  test('is true while some translation row is missing', () => {
    expect(isLegacyContent(legacy)).toBe(true)
    expect(isLegacyContent(complete)).toBe(false)
  })
})

describe('resolveContent', () => {
  test('shows the requested translation when the record has it', () => {
    expect(resolveContent(complete, 'en')).toEqual({
      content: complete.en,
      contentLocale: 'en',
      isLegacy: false,
    })
  })

  test('shows the base text in the default locale for a complete record', () => {
    expect(resolveContent(complete, 'es')).toEqual({
      content: complete.es,
      contentLocale: 'es',
      isLegacy: false,
    })
  })

  test('falls back to the base text, in an unknown language, for a legacy record', () => {
    for (const locale of ['es', 'en'] as const) {
      expect(resolveContent(legacy, locale)).toEqual({
        content: legacy.es,
        contentLocale: null,
        isLegacy: true,
      })
    }
  })
})

describe('contentLangAttribute', () => {
  test('marks unknown languages with an empty lang and leaves unresolved content alone', () => {
    expect(contentLangAttribute('en')).toBe('en')
    expect(contentLangAttribute(null)).toBe('')
    expect(contentLangAttribute(undefined)).toBeUndefined()
  })
})

describe('writing', () => {
  const input: ContentInput<typeof profileContent.specs> = {
    es: { role: 'Investigadora', biography: 'Biografía.', motto: null },
    en: { role: 'Researcher', biography: 'Biography.', motto: null },
  }

  test('baseContent is the default locale text', () => {
    expect(baseContent(profileContent, input)).toEqual(input.es)
  })

  test('translationRows has one row per non-default locale', () => {
    expect(translationRows(profileContent, input)).toEqual([{ locale: 'en', ...input.en }])
  })

  test('only defined fields reach the rows', () => {
    const withExtra = { ...input, en: { ...input.en, id: 'not-a-field' } }

    expect(translationRows(profileContent, withExtra)).toEqual([{ locale: 'en', ...input.en }])
    const spanishWithExtra = { ...input.es, id: 'not-a-field' }
    expect(baseContent(profileContent, { ...input, es: spanishWithExtra })).toEqual(input.es)
  })

  test('what is written reads back as the same content', () => {
    expect(
      storedContentFrom(
        profileContent,
        baseContent(profileContent, input),
        translationRows(profileContent, input),
      ),
    ).toEqual(input)
  })
})
