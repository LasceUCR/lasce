import { describe, expect, expectTypeOf, test } from 'vitest'

import type { ContentInput, StoredContent } from './definition'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
  draftFromStored,
  emptyContentDraft,
  errorsByLocale,
  errorSummary,
  hasContentChanges,
  isConfirmed,
  isContentPath,
  languageTabFlags,
  resetConfirmations,
  reviewsNeeded,
  tabWithErrors,
  toContentInput,
  validateContent,
  withConfirmation,
  type ContentDraft,
} from './form'
import { editorCopy } from './messages'
import { altTextContent, eventContent, profileContent } from './test-fixtures'

type EventField = (typeof eventContent.fields)[number]

const stored: StoredContent<typeof eventContent.specs> = {
  es: { name: 'Taller', summary: 'Sesión práctica.' },
  en: { name: 'Workshop', summary: 'Hands-on session.' },
}

/** Saved before translations existed: no English row and no summary. */
const legacy: StoredContent<typeof eventContent.specs> = {
  es: { name: 'Workshop', summary: null },
  en: null,
}

function opened(): ContentDraft<EventField> {
  return draftFromStored(eventContent, stored)
}

describe('drafts', () => {
  test('a blank draft has every field empty in every locale', () => {
    expect(emptyContentDraft(profileContent)).toEqual({
      es: { role: '', biography: '', motto: '' },
      en: { role: '', biography: '', motto: '' },
    })
  })

  test('an existing record opens with each locale own text', () => {
    expect(opened()).toEqual({
      es: { name: 'Taller', summary: 'Sesión práctica.' },
      en: { name: 'Workshop', summary: 'Hands-on session.' },
    })
  })

  test('a missing locale opens empty instead of a copy, and a null optional field as blank', () => {
    expect(draftFromStored(eventContent, legacy)).toEqual({
      es: { name: 'Workshop', summary: '' },
      en: { name: '', summary: '' },
    })
  })

  test('each locale is an independent object', () => {
    const draft = draftFromStored(eventContent, legacy)
    draft.es.name = 'Changed'

    expect(draft.en.name).toBe('')
    expect(legacy.es.name).toBe('Workshop')
  })
})

describe('change detection', () => {
  test('an untouched or whitespace-only edit is not a change', () => {
    expect(hasContentChanges(eventContent, stored, opened())).toBe(false)
    expect(
      hasContentChanges(eventContent, stored, {
        ...opened(),
        es: { name: ' Taller ', summary: 'Sesión práctica. ' },
      }),
    ).toBe(false)
  })

  test('creating always counts as a change', () => {
    expect(hasContentChanges(eventContent, null, emptyContentDraft(eventContent))).toBe(true)
  })

  test('an untouched legacy record is not a change, though one locale is missing', () => {
    expect(hasContentChanges(eventContent, legacy, draftFromStored(eventContent, legacy))).toBe(
      false,
    )
  })

  test('any field in any locale is a change', () => {
    expect(
      hasContentChanges(eventContent, stored, {
        ...opened(),
        en: { ...opened().en, summary: 'Practical session.' },
      }),
    ).toBe(true)
  })
})

describe('reviews', () => {
  test('none while creating or unchanged', () => {
    expect(reviewsNeeded(eventContent, null, emptyContentDraft(eventContent))).toEqual([])
    expect(reviewsNeeded(eventContent, stored, opened())).toEqual([])
  })

  test('the unchanged locale of a one-sided change', () => {
    const draft = { ...opened(), en: { ...opened().en, name: 'Advanced workshop' } }

    expect(reviewsNeeded(eventContent, stored, draft)).toEqual([{ locale: 'es', field: 'name' }])
  })

  test('the base text when a legacy record gets its translation', () => {
    const draft = { es: { name: 'Workshop', summary: '' }, en: { name: 'Workshop', summary: '' } }

    expect(reviewsNeeded(eventContent, legacy, draft)).toEqual([{ locale: 'es', field: 'name' }])
  })

  test('switching a confirmation on and off', () => {
    const review = { locale: 'es', field: 'name' } as const
    const on = withConfirmation([], review, true)

    expect(on).toEqual([review])
    expect(isConfirmed(on, review)).toBe(true)
    expect(withConfirmation(on, review, true)).toEqual([review])
    expect(withConfirmation(on, review, false)).toEqual([])
  })

  test('changing a field drops every confirmation of that field only', () => {
    const confirmed = [
      { locale: 'es', field: 'name' },
      { locale: 'en', field: 'name' },
      { locale: 'en', field: 'summary' },
    ] as const

    expect(resetConfirmations([...confirmed], 'name')).toEqual([{ locale: 'en', field: 'summary' }])
  })

  test('keeps only the confirmations still needed, in their order', () => {
    const confirmed = [
      { locale: 'en', field: 'summary' },
      { locale: 'es', field: 'name' },
    ] as const
    const needed = [
      { locale: 'es', field: 'name' },
      { locale: 'es', field: 'summary' },
    ] as const

    expect(confirmationsStillNeeded<EventField>([...confirmed], [...needed])).toEqual([
      { locale: 'es', field: 'name' },
    ])
  })
})

describe('validateContent', () => {
  test('checks nothing while the content is unchanged', () => {
    expect(
      validateContent(eventContent, legacy, draftFromStored(eventContent, legacy), []),
    ).toEqual({})
  })

  test('uses the definition schema messages, at content paths', () => {
    const draft = { es: { name: '  ', summary: 'Sesión.' }, en: { name: 'Workshop', summary: '' } }

    expect(validateContent(eventContent, null, draft, [])).toEqual({
      'content.es.name': 'El nombre en español es obligatorio.',
      'content.en.summary':
        'La descripción en inglés es obligatoria porque se completó en español.',
    })
  })

  test('flags each unconfirmed review on its field', () => {
    const draft = { ...opened(), en: { ...opened().en, name: 'Advanced workshop' } }

    expect(validateContent(eventContent, stored, draft, [])).toEqual({
      'content.es.name': editorCopy.fieldPending,
    })
    expect(validateContent(eventContent, stored, draft, [{ locale: 'es', field: 'name' }])).toEqual(
      {},
    )
  })

  test('requires the missing locale once a legacy record content changes', () => {
    const draft = { es: { name: 'Taller', summary: '' }, en: { name: '', summary: '' } }

    expect(validateContent(eventContent, legacy, draft, [])).toEqual({
      'content.en.name': 'El nombre en inglés es obligatorio.',
    })
  })

  test('works with fields of every gender and a single-field definition', () => {
    const profile = {
      es: { role: 'Investigadora', biography: '', motto: '' },
      en: { role: 'Researcher', biography: 'Bio.', motto: '' },
    }
    expect(validateContent(profileContent, null, profile, [])).toEqual({
      'content.es.biography': 'La biografía en español es obligatoria.',
    })

    expect(
      validateContent(altTextContent, null, { es: { altText: '' }, en: { altText: 'x' } }, []),
    ).toEqual({ 'content.es.altText': 'El texto alternativo en español es obligatorio.' })
  })
})

describe('language tabs', () => {
  const errors = {
    'content.en.name': 'x',
    'content.en.summary': 'y',
    startsAt: 'z',
  }

  test('counts content errors per locale, ignoring shared fields', () => {
    expect(errorsByLocale(errors)).toEqual({ es: 0, en: 2 })
  })

  test('opens the first tab with errors unless the current one has some', () => {
    expect(tabWithErrors(errors, 'es')).toBe('en')
    expect(tabWithErrors(errors, 'en')).toBeNull()
    expect(tabWithErrors({ startsAt: 'z' }, 'es')).toBeNull()
  })

  test('flags errors and unconfirmed reviews together, each field once', () => {
    const needed = [
      { locale: 'en', field: 'name' },
      { locale: 'es', field: 'summary' },
    ] as const

    expect(languageTabFlags(stored, { 'content.en.name': 'x' }, [...needed], [])).toEqual({
      es: '1 por revisar',
      en: '1 por revisar',
    })
    expect(languageTabFlags(stored, {}, [...needed], [{ locale: 'es', field: 'summary' }])).toEqual(
      { es: null, en: '1 por revisar' },
    )
  })

  test('says a locale has no text yet when there is nothing else to fix', () => {
    expect(languageTabFlags(legacy, {}, [], [])).toEqual({ es: null, en: 'Sin traducción' })
    expect(languageTabFlags(null, {}, [], [])).toEqual({ es: null, en: null })
  })

  test('summarizes every error and names the other tabs that have some', () => {
    expect(errorSummary({}, 'es')).toBeNull()
    expect(errorSummary({ startsAt: 'z' }, 'es')).toBe('Hay 1 campo por revisar.')
    expect(errorSummary(errors, 'es')).toBe(
      'Hay 3 campos por revisar. Revise también la pestaña English.',
    )
    expect(errorSummary(errors, 'en')).toBe('Hay 3 campos por revisar.')
  })
})

describe('paths and request content', () => {
  test('content paths name a locale and a defined field', () => {
    expect(contentPath('en', 'summary')).toBe('content.en.summary')
    expect(isContentPath(eventContent, 'content.en.summary')).toBe(true)
    expect(isContentPath(eventContent, 'content.fr.summary')).toBe(false)
    expect(isContentPath(eventContent, 'content.en.title')).toBe(false)
    expect(isContentPath(eventContent, 'startsAt')).toBe(false)
  })

  test('trims the text and sends a blank optional field as null', () => {
    const draft = {
      es: { name: ' Taller ', summary: '  ' },
      en: { name: 'Workshop', summary: '' },
    }

    expect(toContentInput(eventContent, draft)).toEqual({
      es: { name: 'Taller', summary: null },
      en: { name: 'Workshop', summary: null },
    })
  })

  test('keeps a blank required field as text, for the API to reject', () => {
    const draft = { es: { altText: ' ' }, en: { altText: 'Antenna' } }

    expect(toContentInput(altTextContent, draft)).toEqual({
      es: { altText: '' },
      en: { altText: 'Antenna' },
    })
  })

  test('produces the type the definition schema validates', () => {
    expectTypeOf(toContentInput(eventContent, opened())).toEqualTypeOf<
      ContentInput<typeof eventContent.specs>
    >()
  })
})

describe('contentFieldLang', () => {
  test('is each locale while creating and for a complete record', () => {
    expect(contentFieldLang(null, 'es')).toBe('es')
    expect(contentFieldLang(null, 'en')).toBe('en')
    expect(contentFieldLang(stored, 'es')).toBe('es')
    expect(contentFieldLang(stored, 'en')).toBe('en')
  })

  test('is unknown for the base text of a legacy record, never the default locale', () => {
    expect(contentFieldLang(legacy, 'es')).toBe('')
    // The missing language starts empty and is typed in that language.
    expect(contentFieldLang(legacy, 'en')).toBe('en')
  })
})
