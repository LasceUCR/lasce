import { describe, expect, test } from 'vitest'

import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'

import {
  contentSchema,
  findPendingReviews,
  publicationContent,
  publicationUpdateSchema,
  translatableFields,
  translationLocales,
  type StoredPublicationContent,
} from './publication-schema'

/**
 * The exact contract of a publication's bilingual content: every validation message, issue code
 * and path, and every outcome of the review rule. The API forwards these paths and messages to
 * the editor, so a change here is a change to `/api/publicaciones`. The expected values are
 * written out literally on purpose, rather than computed, so they also hold the shared content
 * core (`app/lib/i18n/content/`) to them.
 */

const complete = {
  es: { title: 'Título', abstract: 'Resumen.' },
  en: { title: 'Title', abstract: 'Abstract.' },
}

const VERSION = '2026-01-01T00:00:00.000Z'

function outcome(input: unknown) {
  const result = contentSchema.safeParse(input)

  if (result.success) return { data: result.data }

  return {
    issues: result.error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
      message: issue.message,
      ...('keys' in issue ? { keys: issue.keys } : {}),
    })),
  }
}

describe('translatable fields', () => {
  test('are the title and the abstract, stored for every locale but Spanish in translations', () => {
    expect(translatableFields).toEqual(['title', 'abstract'])
    expect(translationLocales).toEqual(['en'])
  })
})

describe('content validation contract', () => {
  test('trims every text', () => {
    expect(
      outcome({ es: { title: '  Título ', abstract: ' Resumen. ' }, en: complete.en }),
    ).toEqual({ data: complete })
  })

  test.each([
    [
      'a blank title',
      { es: complete.es, en: { title: '   ', abstract: 'Abstract.' } },
      [
        {
          code: 'too_small',
          path: ['en', 'title'],
          message: 'El título en inglés es obligatorio.',
        },
      ],
    ],
    [
      'a missing abstract',
      { es: { title: 'Título' }, en: complete.en },
      [
        {
          code: 'invalid_type',
          path: ['es', 'abstract'],
          message: 'El resumen en español es obligatorio y debe ser texto.',
        },
      ],
    ],
    [
      'a title that is not text',
      { es: { title: 1, abstract: 'Resumen.' }, en: complete.en },
      [
        {
          code: 'invalid_type',
          path: ['es', 'title'],
          message: 'El título en español es obligatorio y debe ser texto.',
        },
      ],
    ],
    [
      'a missing language',
      { es: complete.es },
      [
        {
          code: 'invalid_type',
          path: ['en'],
          message: 'Falta el contenido en inglés (title y abstract).',
        },
      ],
    ],
    [
      'a language that is not an object',
      { es: complete.es, en: 'Title' },
      [
        {
          code: 'invalid_type',
          path: ['en'],
          message: 'Falta el contenido en inglés (title y abstract).',
        },
      ],
    ],
    [
      'an unsupported language',
      { ...complete, fr: complete.en },
      [
        {
          code: 'unrecognized_keys',
          path: [],
          message: 'El contenido (content) debe incluir los idiomas es y en.',
          keys: ['fr'],
        },
      ],
    ],
    [
      'an unknown field',
      { es: { ...complete.es, summary: 'x' }, en: complete.en },
      [
        {
          code: 'unrecognized_keys',
          path: ['es'],
          message: 'Falta el contenido en español (title y abstract).',
          keys: ['summary'],
        },
      ],
    ],
    [
      'null',
      null,
      [
        {
          code: 'invalid_type',
          path: [],
          message: 'El contenido (content) debe incluir los idiomas es y en.',
        },
      ],
    ],
    [
      'text instead of an object',
      'content',
      [
        {
          code: 'invalid_type',
          path: [],
          message: 'El contenido (content) debe incluir los idiomas es y en.',
        },
      ],
    ],
    [
      'an empty object',
      {},
      [
        {
          code: 'invalid_type',
          path: ['es'],
          message: 'Falta el contenido en español (title y abstract).',
        },
        {
          code: 'invalid_type',
          path: ['en'],
          message: 'Falta el contenido en inglés (title y abstract).',
        },
      ],
    ],
  ])('rejects %s', (_case, input, issues) => {
    expect(outcome(input)).toEqual({ issues })
  })
})

describe('review confirmation contract', () => {
  function confirmationIssues(confirmedUnchanged: unknown) {
    const result = publicationUpdateSchema.safeParse({
      version: VERSION,
      content: complete,
      confirmedUnchanged,
    })

    return result.error?.issues.map(({ code, path, message }) => ({ code, path, message }))
  }

  test('accepts every locale and translatable field once', () => {
    expect(
      confirmationIssues([
        { locale: 'es', field: 'title' },
        { locale: 'es', field: 'abstract' },
        { locale: 'en', field: 'title' },
        { locale: 'en', field: 'abstract' },
      ]),
    ).toBeUndefined()
  })

  test.each([
    [
      'a field that is not translatable',
      [{ locale: 'en', field: 'venue' }],
      [
        {
          code: 'invalid_value',
          path: ['confirmedUnchanged', 0, 'field'],
          message: 'Invalid option: expected one of "title"|"abstract"',
        },
      ],
    ],
    [
      'an unsupported language',
      [{ locale: 'fr', field: 'title' }],
      [
        {
          code: 'invalid_value',
          path: ['confirmedUnchanged', 0, 'locale'],
          message: 'Invalid option: expected one of "es"|"en"',
        },
      ],
    ],
    [
      'an unknown key',
      [{ locale: 'en', field: 'title', extra: 1 }],
      [
        {
          code: 'unrecognized_keys',
          path: ['confirmedUnchanged', 0],
          message: 'Unrecognized key: "extra"',
        },
      ],
    ],
    [
      'more confirmations than locale and field pairs',
      Array.from({ length: 5 }, () => ({ locale: 'en', field: 'title' })),
      [
        {
          code: 'too_big',
          path: ['confirmedUnchanged'],
          message: 'Too big: expected array to have <=4 items',
        },
      ],
    ],
  ])('rejects %s', (_case, confirmedUnchanged, issues) => {
    expect(confirmationIssues(confirmedUnchanged)).toEqual(issues)
  })
})

describe('review rule contract', () => {
  const stored: StoredPublicationContent = complete
  const legacy: StoredPublicationContent = { es: complete.es, en: null }

  test.each([
    ['nothing changed', stored, complete, []],
    [
      'only whitespace changed',
      stored,
      { ...complete, es: { ...complete.es, title: ' Título ' } },
      [],
    ],
    [
      'the Spanish title changed',
      stored,
      { ...complete, es: { ...complete.es, title: 'Nuevo' } },
      [{ locale: 'en', field: 'title' }],
    ],
    [
      'the English abstract changed',
      stored,
      { ...complete, en: { ...complete.en, abstract: 'New.' } },
      [{ locale: 'es', field: 'abstract' }],
    ],
    [
      'both titles changed',
      stored,
      { es: { ...complete.es, title: 'Nuevo' }, en: { ...complete.en, title: 'New' } },
      [],
    ],
    [
      'each field changed in a different language',
      stored,
      { es: { ...complete.es, title: 'Nuevo' }, en: { ...complete.en, abstract: 'New.' } },
      [
        { locale: 'en', field: 'title' },
        { locale: 'es', field: 'abstract' },
      ],
    ],
    [
      'a legacy record got its English text',
      legacy,
      complete,
      [
        { locale: 'es', field: 'title' },
        { locale: 'es', field: 'abstract' },
      ],
    ],
    [
      'a legacy record was rewritten in both languages',
      legacy,
      { es: { title: 'Otro', abstract: 'Otro.' }, en: complete.en },
      [],
    ],
  ])('when %s', (_case, before, next, pending) => {
    expect(findPendingReviews(before, next, [])).toEqual(pending)
  })

  test('drops only the confirmed reviews', () => {
    const next = {
      es: { ...complete.es, title: 'Nuevo' },
      en: { ...complete.en, abstract: 'New.' },
    }

    expect(findPendingReviews(stored, next, [{ locale: 'en', field: 'title' }])).toEqual([
      { locale: 'es', field: 'abstract' },
    ])
    expect(findPendingReviews(stored, next, [{ locale: 'es', field: 'title' }])).toEqual([
      { locale: 'en', field: 'title' },
      { locale: 'es', field: 'abstract' },
    ])
  })
})

describe('review copy contract', () => {
  const stored: StoredPublicationContent = complete
  const legacy: StoredPublicationContent = { es: complete.es, en: null }

  test.each([
    [
      'a Spanish title change',
      stored,
      { ...complete, es: { ...complete.es, title: 'Nuevo' } },
      { locale: 'en', field: 'title' } as const,
      'Cambió el título en español. Actualice el título en inglés o confirme que sigue siendo correcto.',
    ],
    [
      'an English abstract change',
      stored,
      { ...complete, en: { ...complete.en, abstract: 'New.' } },
      { locale: 'es', field: 'abstract' } as const,
      'Cambió el resumen en inglés. Actualice el resumen en español o confirme que sigue siendo correcto.',
    ],
    [
      'a legacy record getting its English text',
      legacy,
      complete,
      { locale: 'es', field: 'title' } as const,
      'Al agregar la versión en inglés, revise el título en español: el texto original podría estar en otro idioma. Actualícelo o confirme que es correcto.',
    ],
  ])('explains %s', (_case, before, next, review, message) => {
    expect(findPendingReviews(before, next, [])).toContainEqual(review)
    expect(reviewMessage(publicationContent, review, before, next)).toBe(message)
  })

  test('labels each confirmation switch', () => {
    expect(
      (['es', 'en'] as const).flatMap((locale) =>
        publicationContent.fields.map((field) =>
          confirmationLabel(publicationContent, { locale, field }),
        ),
      ),
    ).toEqual([
      'El título en español sigue siendo correcto',
      'El resumen en español sigue siendo correcto',
      'El título en inglés sigue siendo correcto',
      'El resumen en inglés sigue siendo correcto',
    ])
  })
})
