import { describe, expect, test } from 'vitest'

import { findPendingReviews, newsCreateSchema, newsUpdateSchema } from './news-schema'

const VERSION = '2026-09-01T10:00:00.000Z'

const content = {
  es: { title: 'Título', abstract: 'Resumen' },
  en: { title: 'Title', abstract: 'Abstract' },
}

const createBody = {
  content,
  source: 'La Nación',
  authors: ['Juan Pérez'],
  publishedAt: '2026-01-01',
  externalUrl: 'https://example.com/nota',
}

function issues(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  return (result.error?.issues ?? []).map(({ path, message }) => ({
    path: path.join('.'),
    message,
  }))
}

describe('newsCreateSchema', () => {
  test('accepts an item with every language, trimming its text', () => {
    const parsed = newsCreateSchema.parse({
      ...createBody,
      source: '  La Nación ',
      authors: [' Juan Pérez '],
      externalUrl: ' https://example.com/nota ',
    })

    expect(parsed).toEqual({ ...createBody, publishedAt: '2026-01-01' })
  })

  test('stores an absent date as no date', () => {
    const { publishedAt: _date, ...undated } = createBody

    expect(newsCreateSchema.parse(undated).publishedAt).toBeNull()
  })

  test('rejects an item missing the English text, naming the language', () => {
    const result = newsCreateSchema.safeParse({ ...createBody, content: { es: content.es } })

    expect(result.success).toBe(false)
    expect(issues(result)[0]?.path).toBe('content.en')
  })

  test('rejects an English title that is only whitespace, in Spanish', () => {
    const result = newsCreateSchema.safeParse({
      ...createBody,
      content: { ...content, en: { title: '   ', abstract: 'Abstract' } },
    })

    expect(issues(result)).toEqual([
      { path: 'content.en.title', message: 'El título en inglés es obligatorio.' },
    ])
  })

  test('rejects the previous single-language shape', () => {
    const result = newsCreateSchema.safeParse({
      title: 'Título',
      abstract: 'Resumen',
      source: 'La Nación',
      authors: ['Juan Pérez'],
      publishedAt: null,
      externalUrl: 'https://example.com/nota',
    })

    expect(result.success).toBe(false)
  })

  test.each([
    ['source', { source: ' ' }, 'La fuente es obligatoria.'],
    ['authors', { authors: [] }, 'Debe indicar al menos un autor.'],
    ['publishedAt', { publishedAt: '2026-02-30' }, 'La fecha no es válida.'],
    [
      'externalUrl',
      { externalUrl: 'javascript:alert(1)' },
      'El enlace debe ser una URL que empiece con http:// o https://.',
    ],
  ])('rejects an invalid %s with its own message', (path, change, message) => {
    expect(issues(newsCreateSchema.safeParse({ ...createBody, ...change }))).toEqual([
      { path, message },
    ])
  })
})

describe('newsUpdateSchema', () => {
  test('requires the version the editor loaded', () => {
    expect(newsUpdateSchema.safeParse({ source: 'La Nación' }).success).toBe(false)
  })

  test('accepts an update of shared fields only, keeping just the fields sent', () => {
    expect(newsUpdateSchema.parse({ version: VERSION, source: 'Delfino.cr' })).toEqual({
      version: VERSION,
      source: 'Delfino.cr',
    })
  })

  test('accepts clearing the date', () => {
    expect(newsUpdateSchema.parse({ version: VERSION, publishedAt: null })).toEqual({
      version: VERSION,
      publishedAt: null,
    })
  })

  test('rejects an update with nothing to change', () => {
    expect(issues(newsUpdateSchema.safeParse({ version: VERSION }))).toEqual([
      { path: '', message: 'La solicitud no incluye ningún campo para actualizar.' },
    ])
  })

  test('rejects confirmations outside a content update', () => {
    const result = newsUpdateSchema.safeParse({
      version: VERSION,
      source: 'La Nación',
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(issues(result)).toEqual([
      {
        path: 'confirmedUnchanged',
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      },
    ])
  })

  test('rejects a confirmation for a field that is not translatable', () => {
    const result = newsUpdateSchema.safeParse({
      version: VERSION,
      content,
      confirmedUnchanged: [{ locale: 'en', field: 'source' }],
    })

    expect(result.success).toBe(false)
  })

  test('rejects a field it does not know', () => {
    expect(newsUpdateSchema.safeParse({ version: VERSION, title: 'Título' }).success).toBe(false)
  })
})

describe('findPendingReviews', () => {
  const stored = { es: content.es, en: content.en }

  test('requires nothing when a field changed in every language', () => {
    const next = {
      es: { title: 'Otro título', abstract: 'Resumen' },
      en: { title: 'Another title', abstract: 'Abstract' },
    }

    expect(findPendingReviews(stored, next, [])).toEqual([])
  })

  test('requires reviewing the other language when a field changed in one', () => {
    const next = { ...content, es: { title: 'Otro título', abstract: 'Resumen' } }

    expect(findPendingReviews(stored, next, [])).toEqual([{ locale: 'en', field: 'title' }])
  })

  test('accepts an explicit confirmation that the other language is still correct', () => {
    const next = { ...content, es: { title: 'Otro título', abstract: 'Resumen' } }

    expect(findPendingReviews(stored, next, [{ locale: 'en', field: 'title' }])).toEqual([])
  })

  test('requires reviewing the base text when completing a legacy item', () => {
    expect(findPendingReviews({ es: content.es, en: null }, content, [])).toEqual([
      { locale: 'es', field: 'title' },
      { locale: 'es', field: 'abstract' },
    ])
  })
})
