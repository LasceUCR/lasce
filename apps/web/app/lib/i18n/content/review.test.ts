import { describe, expect, test } from 'vitest'

import type { LocalizedContent, StoredContent } from './definition'
import {
  changedLocales,
  confirmationLabel,
  findPendingReviews,
  reviewMessage,
  sameReview,
} from './review'
import { eventContent, profileContent } from './test-fixtures'

type EventStored = StoredContent<typeof eventContent.specs>

type EventText = LocalizedContent<typeof eventContent.specs>

const spanish: EventText = { name: 'Taller', summary: 'Sesión práctica.' }
const english: EventText = { name: 'Workshop', summary: 'Hands-on session.' }
const stored: EventStored = { es: spanish, en: english }
/** The same text, as submitted again unchanged. */
const unchanged = { es: spanish, en: english }

/** A record saved before translations existed: no English row, base text of unknown language. */
const legacy: EventStored = {
  es: { name: 'Workshop', summary: null },
  en: null,
}

describe('changedLocales', () => {
  test('ignores surrounding whitespace and treats null as empty', () => {
    expect(
      changedLocales('name', stored, {
        es: { name: '  Taller ', summary: null },
        en: { name: 'Workshop', summary: null },
      }),
    ).toEqual([])

    expect(
      changedLocales('summary', legacy, {
        es: { name: 'Workshop', summary: '' },
        en: { name: 'Workshop', summary: null },
      }),
    ).toEqual(['en'])
  })

  test('counts every locale as changed when nothing is stored yet', () => {
    expect(changedLocales('name', null, unchanged)).toEqual(['es', 'en'])
  })
})

describe('findPendingReviews', () => {
  test('needs nothing when nothing changed', () => {
    expect(findPendingReviews(eventContent, stored, unchanged)).toEqual([])
  })

  test('needs nothing when a field changed in every locale', () => {
    const next = {
      es: { ...spanish, name: 'Taller avanzado' },
      en: { ...english, name: 'Advanced workshop' },
    }

    expect(findPendingReviews(eventContent, stored, next)).toEqual([])
  })

  test('asks to review the unchanged locale of a field changed in one locale only', () => {
    const next = { es: { ...spanish, name: 'Taller avanzado' }, en: english }

    expect(findPendingReviews(eventContent, stored, next)).toEqual([
      { locale: 'en', field: 'name' },
    ])
  })

  test('works in both directions', () => {
    const next = { es: spanish, en: { ...english, summary: 'A practical session.' } }

    expect(findPendingReviews(eventContent, stored, next)).toEqual([
      { locale: 'es', field: 'summary' },
    ])
  })

  test('accepts a confirmation of exactly the pending locale and field', () => {
    const next = { es: { ...spanish, name: 'Taller avanzado' }, en: english }

    expect(
      findPendingReviews(eventContent, stored, next, [{ locale: 'en', field: 'name' }]),
    ).toEqual([])
    expect(
      findPendingReviews(eventContent, stored, next, [
        { locale: 'es', field: 'name' },
        { locale: 'en', field: 'summary' },
      ]),
    ).toEqual([{ locale: 'en', field: 'name' }])
  })

  test('lists pending reviews in field order', () => {
    const profile: StoredContent<typeof profileContent.specs> = {
      es: { role: 'Investigadora', biography: 'Bio.', motto: null },
      en: { role: 'Researcher', biography: 'Bio.', motto: null },
    }
    const next = {
      es: { role: 'Investigadora principal', biography: 'Biografía.', motto: null },
      en: { role: 'Researcher', biography: 'Bio.', motto: null },
    }

    expect(findPendingReviews(profileContent, profile, next)).toEqual([
      { locale: 'en', field: 'role' },
      { locale: 'en', field: 'biography' },
    ])
  })

  test('asks to review the base text when a legacy record gets its translation', () => {
    const next = {
      es: { name: 'Workshop', summary: null },
      en: { name: 'Workshop', summary: null },
    }

    // The English row is new, so English counts as changed; the base text may not be Spanish.
    expect(findPendingReviews(eventContent, legacy, next)).toEqual([
      { locale: 'es', field: 'name' },
    ])
  })

  test('needs nothing when a legacy record is rewritten in every locale', () => {
    const next = {
      es: { name: 'Taller', summary: null },
      en: { name: 'Workshop', summary: null },
    }

    expect(findPendingReviews(eventContent, legacy, next)).toEqual([])
  })

  test('needs no review for an optional field left empty in every locale', () => {
    const next = { es: { ...spanish, summary: null }, en: { ...english, summary: '  ' } }

    expect(findPendingReviews(eventContent, stored, next)).toEqual([])
  })

  test('reviews an optional field that changed in one locale only', () => {
    const next = { es: { ...spanish, summary: 'Sesión teórica.' }, en: english }

    expect(findPendingReviews(eventContent, stored, next)).toEqual([
      { locale: 'en', field: 'summary' },
    ])
  })
})

describe('typing', () => {
  test('checks the values passed with a definition against its fields', () => {
    const next = { es: { ...spanish, name: 'Taller avanzado' }, en: english }

    const confirmed = [{ locale: 'en', field: 'title' }] as const

    // @ts-expect-error `title` is not a field of the event definition
    expect(findPendingReviews(eventContent, stored, next, confirmed)).toEqual([
      { locale: 'en', field: 'name' },
    ])
    // @ts-expect-error `title` is not a field of the event definition
    expect(changedLocales('title', stored, next)).toEqual([])
  })
})

describe('sameReview', () => {
  test('compares locale and field', () => {
    expect(sameReview({ locale: 'en', field: 'name' }, { locale: 'en', field: 'name' })).toBe(true)
    expect(sameReview({ locale: 'en', field: 'name' }, { locale: 'es', field: 'name' })).toBe(false)
    expect(sameReview({ locale: 'en', field: 'name' }, { locale: 'en', field: 'summary' })).toBe(
      false,
    )
  })
})

describe('reviewMessage', () => {
  test('names the locale that changed and the one to review', () => {
    const next = { es: spanish, en: { ...english, summary: 'A practical session.' } }

    expect(reviewMessage(eventContent, { locale: 'es', field: 'summary' }, stored, next)).toBe(
      'Cambió la descripción en inglés. Actualice la descripción en español o confirme que sigue siendo correcta.',
    )
  })

  test('says the base text may be in another language when a translation is added', () => {
    const next = {
      es: { name: 'Workshop', summary: null },
      en: { name: 'Workshop', summary: null },
    }

    expect(reviewMessage(eventContent, { locale: 'es', field: 'name' }, legacy, next)).toBe(
      'Al agregar la versión en inglés, revise el nombre en español: el texto original podría estar en otro idioma. Actualícelo o confirme que es correcto.',
    )
  })

  test('agrees the legacy message with a feminine field', () => {
    const next = {
      es: { name: 'Workshop', summary: 'Sesión.' },
      en: { name: 'Workshop', summary: 'Session.' },
    }
    const legacyWithSummary: EventStored = {
      es: { name: 'Workshop', summary: 'Sesión.' },
      en: null,
    }

    expect(
      reviewMessage(eventContent, { locale: 'es', field: 'summary' }, legacyWithSummary, next),
    ).toBe(
      'Al agregar la versión en inglés, revise la descripción en español: el texto original podría estar en otro idioma. Actualícela o confirme que es correcta.',
    )
  })

  test('names the other locales when asked about a review that is not pending', () => {
    expect(reviewMessage(eventContent, { locale: 'en', field: 'name' }, stored, unchanged)).toBe(
      'Cambió el nombre en español. Actualice el nombre en inglés o confirme que sigue siendo correcto.',
    )
  })
})

describe('confirmationLabel', () => {
  test('says the field is still correct in its locale, agreeing with the gender', () => {
    expect(confirmationLabel(eventContent, { locale: 'en', field: 'summary' })).toBe(
      'La descripción en inglés sigue siendo correcta',
    )
    expect(confirmationLabel(eventContent, { locale: 'es', field: 'name' })).toBe(
      'El nombre en español sigue siendo correcto',
    )
  })
})
