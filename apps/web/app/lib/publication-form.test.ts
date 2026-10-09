import { describe, expect, test } from 'vitest'

import {
  buildCreateRequest,
  buildUpdateRequest,
  describeSaveFailure,
  emptyInitial,
  errorsByLocale,
  hasContentChanges,
  initialFromPublication,
  isFormField,
  REVIEW_FIELD_MESSAGE,
  reviewsNeeded,
  SAVE_ERROR_MESSAGE,
  validateDraft,
  type PublicationDraft,
} from './publication-form'
import type { Publication } from './publication-schema'

const VERSION = '2026-09-01T10:00:00.000Z'

const bilingual: Publication = {
  slug: 'p-1',
  title: 'Título',
  authors: ['Ana'],
  venue: 'Solar Physics',
  year: '2025',
  date: new Date('2025-03-04T00:00:00.000Z'),
  abstract: 'Resumen',
  href: 'https://example.com/a',
  DOI: '10.1234/a',
  researchGroup: 'LASCE',
  contentLocale: 'es',
  editing: {
    content: {
      es: { title: 'Título', abstract: 'Resumen' },
      en: { title: 'Title', abstract: 'Abstract' },
    },
    isLegacy: false,
    version: VERSION,
  },
}

const legacy: Publication = {
  ...bilingual,
  slug: 'p-2',
  authors: [],
  href: undefined,
  DOI: '',
  contentLocale: null,
  editing: {
    content: { es: { title: 'Base title', abstract: 'Base abstract' }, en: null },
    isLegacy: true,
    version: VERSION,
  },
}

function edit(draft: PublicationDraft, changes: Partial<PublicationDraft>): PublicationDraft {
  return { ...draft, ...changes }
}

function withContent(
  draft: PublicationDraft,
  locale: 'es' | 'en',
  title: string,
  abstract?: string,
) {
  return {
    ...draft,
    content: {
      ...draft.content,
      [locale]: { title, abstract: abstract ?? draft.content[locale].abstract },
    },
  }
}

describe('initial values', () => {
  test('a new publication starts blank, dated today in local time', () => {
    const initial = emptyInitial(new Date(2026, 9, 8, 23, 30))

    expect(initial.stored).toBeNull()
    expect(initial.version).toBeNull()
    expect(initial.draft.date).toBe('2026-10-08')
    expect(initial.draft.content.en).toEqual({ title: '', abstract: '' })
  })

  test('a legacy record opens with an empty English text instead of a copy', () => {
    const initial = initialFromPublication(legacy)

    expect(initial.isLegacy).toBe(true)
    expect(initial.draft.content.es).toEqual({ title: 'Base title', abstract: 'Base abstract' })
    expect(initial.draft.content.en).toEqual({ title: '', abstract: '' })
    expect(initial.draft.href).toBe('')
  })

  test('the date input shows the stored day', () => {
    expect(initialFromPublication(bilingual).draft.date).toBe('2025-03-04')
  })
})

describe('content changes and reviews', () => {
  const initial = initialFromPublication(bilingual)

  test('an untouched form has no content changes', () => {
    expect(hasContentChanges(initial, initial.draft)).toBe(false)
  })

  test('whitespace around the text is not a change', () => {
    expect(hasContentChanges(initial, withContent(initial.draft, 'es', ' Título '))).toBe(false)
  })

  test('a one-sided change needs the counterpart reviewed', () => {
    expect(reviewsNeeded(initial, withContent(initial.draft, 'en', 'New title'))).toEqual([
      { locale: 'es', field: 'title' },
    ])
  })

  test('creating never asks for reviews', () => {
    const create = emptyInitial()
    expect(reviewsNeeded(create, withContent(create.draft, 'es', 'x'))).toEqual([])
  })
})

describe('validateDraft', () => {
  test('a shared-field edit of a legacy record needs no translation and no authors', () => {
    const initial = initialFromPublication(legacy)

    expect(validateDraft(initial, edit(initial.draft, { DOI: '10.5555/x' }), [])).toEqual({})
  })

  test('changing a title of a legacy record requires the English text', () => {
    const initial = initialFromPublication(legacy)
    const errors = validateDraft(initial, withContent(initial.draft, 'es', 'Título nuevo'), [])

    expect(errors).toMatchObject({
      'content.en.title': 'El título en inglés es obligatorio.',
      'content.en.abstract': 'El resumen en inglés es obligatorio.',
      'content.es.abstract': REVIEW_FIELD_MESSAGE,
    })
  })

  test('an explicit confirmation clears the review', () => {
    const initial = initialFromPublication(bilingual)
    const draft = withContent(initial.draft, 'es', 'Título nuevo')

    expect(validateDraft(initial, draft, [])).toEqual({ 'content.en.title': REVIEW_FIELD_MESSAGE })
    expect(validateDraft(initial, draft, [{ locale: 'en', field: 'title' }])).toEqual({})
  })

  test('checks a shared field only when it changed', () => {
    const initial = initialFromPublication(bilingual)

    expect(validateDraft(initial, edit(initial.draft, { venue: ' ' }), [])).toEqual({
      venue: 'La publicación es obligatoria.',
    })
    expect(validateDraft(initial, edit(initial.draft, { authors: [] }), [])).toEqual({
      authors: 'Debe existir al menos un autor.',
    })
    expect(validateDraft(initial, edit(initial.draft, { date: '' }), [])).toEqual({
      date: 'La fecha de publicación es obligatoria.',
    })
  })

  test('counts errors per language tab', () => {
    expect(
      errorsByLocale({ 'content.en.title': 'x', 'content.en.abstract': 'y', DOI: 'z' }),
    ).toEqual({ es: 0, en: 2 })
  })
})

describe('request bodies', () => {
  test('a create request sends both languages and null for a missing DOI or link', () => {
    const draft = {
      ...emptyInitial().draft,
      content: {
        es: { title: ' Título ', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
      authors: ['Ana'],
      venue: 'Solar Physics',
      date: '2026-10-08',
    }

    expect(buildCreateRequest(draft)).toEqual({
      content: {
        es: { title: 'Título', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
      authors: ['Ana'],
      venue: 'Solar Physics',
      date: '2026-10-08',
      href: null,
      DOI: null,
      researchGroup: 'LASCE',
    })
  })

  test('an unchanged edit sends nothing', () => {
    const initial = initialFromPublication(bilingual)
    expect(buildUpdateRequest(initial, initial.draft, [])).toBeNull()
  })

  test('a shared-field edit sends only that field and the version', () => {
    const initial = initialFromPublication(bilingual)

    expect(buildUpdateRequest(initial, edit(initial.draft, { href: '  ' }), [])).toEqual({
      version: VERSION,
      href: null,
    })
  })

  test('a content edit sends both languages and only the confirmations still needed', () => {
    const initial = initialFromPublication(bilingual)
    const draft = withContent(initial.draft, 'es', 'Título nuevo')

    expect(
      buildUpdateRequest(initial, draft, [
        { locale: 'en', field: 'title' },
        { locale: 'en', field: 'abstract' },
      ]),
    ).toEqual({
      version: VERSION,
      content: {
        es: { title: 'Título nuevo', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })
})

describe('describeSaveFailure', () => {
  test('maps validation issues to their fields', () => {
    expect(
      describeSaveFailure(400, {
        code: 'invalid-body',
        issues: [
          { path: 'content.en.title', message: 'El título en inglés es obligatorio.' },
          { path: '', message: 'La solicitud no incluye ningún campo para actualizar.' },
        ],
      }),
    ).toEqual({
      message: 'La solicitud no incluye ningún campo para actualizar.',
      fieldErrors: { 'content.en.title': 'El título en inglés es obligatorio.' },
      reopen: false,
    })
  })

  test('says above the form what no field can show', () => {
    const failure = describeSaveFailure(400, {
      code: 'invalid-body',
      issues: [
        { path: 'version', message: 'La versión de la publicación es obligatoria.' },
        { path: 'DOI', message: 'El DOI no es válido.' },
      ],
    })

    expect(failure.message).toBe('La versión de la publicación es obligatoria.')
    expect(failure.fieldErrors).toEqual({ DOI: 'El DOI no es válido.' })
  })

  test('knows which paths the form shows', () => {
    expect(isFormField('content.en.title')).toBe(true)
    expect(isFormField('DOI')).toBe(true)
    expect(isFormField('content.fr.title')).toBe(false)
    expect(isFormField('content.en')).toBe(false)
    expect(isFormField('version')).toBe(false)
  })

  test('maps pending reviews to their fields', () => {
    expect(
      describeSaveFailure(400, {
        code: 'review-required',
        error: 'Cambió un campo en un solo idioma.',
        pending: [{ path: 'content.es.title', locale: 'es', field: 'title' }],
      }).fieldErrors,
    ).toEqual({ 'content.es.title': REVIEW_FIELD_MESSAGE })
  })

  test('puts a duplicate external link under the link field', () => {
    expect(
      describeSaveFailure(409, { code: 'duplicate-external-url', error: 'Ya existe.' }).fieldErrors,
    ).toEqual({ href: 'Ya existe.' })
  })

  test('asks to reopen after a concurrent change or a deletion', () => {
    expect(describeSaveFailure(409, { code: 'conflict' }).reopen).toBe(true)
    expect(describeSaveFailure(404, { code: 'not-found' }).reopen).toBe(true)
  })

  test('falls back to a generic message for anything unreadable', () => {
    expect(describeSaveFailure(502, null)).toEqual({
      message: SAVE_ERROR_MESSAGE,
      fieldErrors: {},
      reopen: false,
    })
  })
})
