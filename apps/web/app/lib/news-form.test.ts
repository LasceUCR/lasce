import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }
import es from '@/messages/es.json' with { type: 'json' }

import {
  buildCreateRequest,
  buildUpdateRequest,
  describeNewsFailure,
  emptyInitial,
  hasUnsavedChanges,
  initialFromArticle,
  splitAuthors,
  validateDraft,
  type NewsDraft,
  type NewsFailureMessages,
} from './news-form'
import type { NewsArticle } from './news-schema'

const VERSION = '2026-09-01T10:00:00.000Z'

const article: NewsArticle = {
  slug: 'news-1',
  title: 'Título',
  authors: 'Ana Mora, Luis Soto',
  source: 'La Nación',
  date: '24 de mayo de 2026',
  publishedAt: '2026-05-24',
  abstract: 'Resumen',
  href: 'https://example.com/nota',
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

const spanish: NewsFailureMessages = {
  ...es.news.errors,
  server: es.common.feedback.server,
  fallback: es.news.errors.saveUnknown,
}

const english: NewsFailureMessages = {
  ...en.news.errors,
  server: en.common.feedback.server,
  fallback: en.news.errors.saveUnknown,
}

function edited(change: Partial<NewsDraft>): NewsDraft {
  return { ...initialFromArticle(article).draft, ...change }
}

describe('splitAuthors', () => {
  test('turns a comma-separated list into trimmed names, dropping empty ones', () => {
    expect(splitAuthors(' Ana Mora,, Luis Soto , ')).toEqual(['Ana Mora', 'Luis Soto'])
  })
})

describe('initialFromArticle', () => {
  test('opens with every stored language and the version to save against', () => {
    const initial = initialFromArticle(article)

    expect(initial.draft.content).toEqual(article.editing!.content)
    expect(initial).toMatchObject({ isLegacy: false, version: VERSION })
  })

  test('opens a legacy item with its base text and an empty English version', () => {
    const initial = initialFromArticle({
      ...article,
      editing: {
        ...article.editing!,
        content: { ...article.editing!.content, en: null },
        isLegacy: true,
      },
    })

    expect(initial.draft.content.en).toEqual({ title: '', abstract: '' })
    expect(initial.isLegacy).toBe(true)
  })

  test('treats an item loaded without editing data as base text with no translation', () => {
    const initial = initialFromArticle({ ...article, editing: undefined })

    expect(initial).toMatchObject({ isLegacy: true, version: null })
  })

  test('opens an undated item with an empty date', () => {
    expect(initialFromArticle({ ...article, publishedAt: null }).draft.publishedAt).toBe('')
  })
})

describe('hasUnsavedChanges', () => {
  test('is false until something is typed, and true after', () => {
    const initial = initialFromArticle(article)

    expect(hasUnsavedChanges(initial, initial.draft)).toBe(false)
    expect(hasUnsavedChanges(initial, edited({ source: 'La Nación ' }))).toBe(true)
  })
})

describe('validateDraft', () => {
  test('checks every field of a new item, in the editor’s language', () => {
    const errors = validateDraft(emptyInitial(), emptyInitial().draft, [], 'en', en.news.validation)

    expect(errors).toMatchObject({
      'content.es.title': expect.any(String),
      'content.en.abstract': expect.any(String),
      source: 'The source is required.',
      authors: 'Enter at least one author.',
      externalUrl: 'The link must be a URL that starts with http:// or https://.',
    })
    expect(errors).not.toHaveProperty('publishedAt')
  })

  test('checks only the shared fields that changed on an existing item', () => {
    const initial = initialFromArticle(article)

    expect(validateDraft(initial, edited({ source: '' }), [])).toEqual({
      source: 'La fuente es obligatoria.',
    })
  })
})

describe('buildCreateRequest', () => {
  test('sends both languages and every shared field, cleaned up', () => {
    const draft: NewsDraft = {
      content: {
        es: { title: ' Título ', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
      authors: 'Ana Mora, Luis Soto',
      source: ' La Nación ',
      publishedAt: '',
      externalUrl: ' https://example.com/nota ',
    }

    expect(buildCreateRequest(draft)).toEqual({
      content: {
        es: { title: 'Título', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
      source: 'La Nación',
      authors: ['Ana Mora', 'Luis Soto'],
      publishedAt: null,
      externalUrl: 'https://example.com/nota',
    })
  })
})

describe('buildUpdateRequest', () => {
  const initial = initialFromArticle(article)

  test('is null when nothing changed', () => {
    expect(buildUpdateRequest(initial, initial.draft, [])).toBeNull()
  })

  test('ignores whitespace and a re-typed author list that reads the same', () => {
    expect(buildUpdateRequest(initial, edited({ authors: 'Ana Mora ,Luis Soto' }), [])).toBeNull()
  })

  test('sends only the shared fields that changed', () => {
    expect(buildUpdateRequest(initial, edited({ publishedAt: '' }), [])).toEqual({
      version: VERSION,
      publishedAt: null,
    })
  })

  test('sends both languages and the confirmations still needed when content changed', () => {
    const draft = edited({
      content: { ...initial.draft.content, es: { title: 'Otro título', abstract: 'Resumen' } },
    })

    expect(buildUpdateRequest(initial, draft, [{ locale: 'en', field: 'title' }])).toEqual({
      version: VERSION,
      content: {
        es: { title: 'Otro título', abstract: 'Resumen' },
        en: { title: 'Title', abstract: 'Abstract' },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })
})

describe('describeNewsFailure', () => {
  test('leaves a server failure to the generic message for a Spanish editor', () => {
    expect(describeNewsFailure(500, { error: 'Falló.' }, 'es', spanish)).toBeNull()
  })

  test('says the server failed in English, never in the server’s Spanish', () => {
    expect(describeNewsFailure(503, { error: 'Falló.' }, 'en', english)).toBe(english.server)
  })

  test.each([
    [401, {}, 'forbidden'],
    [403, {}, 'forbidden'],
    [404, { code: 'not-found' }, 'notFound'],
    [409, { code: 'conflict' }, 'conflict'],
    [409, { code: 'duplicate-external-url' }, 'duplicateLink'],
    [400, { code: 'review-required' }, 'review'],
  ] as const)('explains a %i %j in the editor’s language', (status, body, key) => {
    expect(describeNewsFailure(status, body, 'es', spanish)).toBe(spanish[key])
    expect(describeNewsFailure(status, body, 'en', english)).toBe(english[key])
  })

  test('lists the server’s field messages to a Spanish editor', () => {
    const body = {
      code: 'invalid-body',
      error: 'Faltan campos obligatorios o no son válidos.',
      issues: [
        { path: 'source', message: 'La fuente es obligatoria.' },
        { path: 'authors', message: 'Debe indicar al menos un autor.' },
      ],
    }

    expect(describeNewsFailure(400, body, 'es', spanish)).toBe(
      'Faltan campos obligatorios o no son válidos: La fuente es obligatoria. Debe indicar al menos un autor.',
    )
  })

  test('shows the server’s message alone when it lists no fields', () => {
    expect(
      describeNewsFailure(400, { code: 'invalid-json', error: 'No es JSON.' }, 'es', spanish),
    ).toBe('No es JSON.')
  })

  test('falls back to the request’s own message when the failure says nothing', () => {
    expect(describeNewsFailure(422, null, 'es', spanish)).toBe(spanish.fallback)
    expect(describeNewsFailure(422, null, 'en', english)).toBe(english.fallback)
  })

  test('asks an English editor to check the fields when the body was invalid', () => {
    expect(
      describeNewsFailure(400, { code: 'invalid-body', error: 'Faltan.' }, 'en', english),
    ).toBe(english.invalid)
  })
})
