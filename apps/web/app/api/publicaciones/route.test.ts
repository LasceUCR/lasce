import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as PublicationsLib from '@/app/lib/publications'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  getPublications: vi.fn(),
  createPublication: vi.fn(),
  getLocale: vi.fn(),
}))

vi.mock('@/app/lib/publications', async (importOriginal) => {
  const original = await importOriginal<typeof PublicationsLib>()

  return {
    ...original,
    getPublications: mocks.getPublications,
    createPublication: mocks.createPublication,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

// The GET handler reads the request's language through next-intl.
vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }))

import { GET, POST } from './route'

const validBody = {
  content: {
    es: { title: 'Nueva publicación', abstract: 'Un resumen de la publicación.' },
    en: { title: 'New publication', abstract: 'An abstract of the publication.' },
  },
  authors: ['Juan Pérez', 'María Rodríguez'],
  href: 'https://example.com/publication',
  DOI: '10.1234/example',
  researchGroup: 'LASCE',
  venue: 'Solar Physics',
  date: '2026-01-01',
}

const storedPublication = {
  slug: '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10',
  title: 'Nueva publicación',
  authors: ['Juan Pérez', 'María Rodríguez'],
  venue: 'Solar Physics',
  year: '2026',
  date: new Date('2026-01-01'),
  abstract: 'Un resumen de la publicación.',
  href: 'https://example.com/publication',
  DOI: '10.1234/example',
  researchGroup: 'LASCE',
  contentLocale: 'es',
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/publicaciones', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

async function post(body: unknown) {
  const response = await POST(postRequest(body))
  return { response, body: await response.json() }
}

function withContent(locale: 'es' | 'en', value: unknown) {
  return { ...validBody, content: { ...validBody.content, [locale]: value } }
}

beforeEach(() => {
  mocks.getLocale.mockResolvedValue('es')
  mocks.requireApiPermission.mockResolvedValue({
    ok: true,
    user: { id: 'admin-1', role: 'ADMIN' },
  })
  mocks.createPublication.mockResolvedValue({ ok: true, publication: storedPublication })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('GET /api/publicaciones', () => {
  test('returns publications as never-cached JSON', async () => {
    mocks.getPublications.mockResolvedValue([storedPublication])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      publications: [{ ...storedPublication, date: storedPublication.date.toISOString() }],
    })
    expect(mocks.getPublications).toHaveBeenCalledWith('es')
  })

  test('returns publications in the language chosen in the header', async () => {
    mocks.getLocale.mockResolvedValue('en')
    mocks.getPublications.mockResolvedValue([])

    await GET()

    expect(mocks.getPublications).toHaveBeenCalledWith('en')
  })
})

describe('POST /api/publicaciones: authorization', () => {
  test('requires the create permission', async () => {
    await POST(postRequest(validBody))

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
  })

  test.each([
    [401, 'without a session'],
    [403, 'without the permission'],
  ])('answers %i %s and creates nothing', async (status) => {
    const denied = deniedResponse(status)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(response.status).toBe(status)
    expect(mocks.createPublication).not.toHaveBeenCalled()
  })
})

describe('POST /api/publicaciones: validation', () => {
  test('rejects a body that is not valid JSON', async () => {
    const { response, body } = await post('not json')

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-json')
    expect(mocks.createPublication).not.toHaveBeenCalled()
  })

  test('rejects a publication without its English text, naming the language', async () => {
    const { content, ...rest } = validBody

    const { response, body } = await post({ ...rest, content: { es: content.es } })

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-body')
    expect(body.issues).toContainEqual({
      path: 'content.en',
      message: 'Falta el contenido en inglés (title y abstract).',
    })
    expect(mocks.createPublication).not.toHaveBeenCalled()
  })

  test('rejects a publication without its Spanish text', async () => {
    const { content, ...rest } = validBody

    const { response, body } = await post({ ...rest, content: { en: content.en } })

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'content.es' }))
  })

  test('rejects a publication without any content', async () => {
    const { content: _content, ...rest } = validBody

    const { response, body } = await post(rest)

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'content' }))
  })

  test('rejects an empty English title', async () => {
    const { response, body } = await post(
      withContent('en', { title: '', abstract: 'An abstract.' }),
    )

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'content.en.title', message: 'El título en inglés es obligatorio.' },
    ])
  })

  test.each([
    ['spaces', '   '],
    ['tabs', '\t\t'],
    ['line breaks', '\n\r\n'],
  ])('rejects a Spanish abstract made only of %s', async (_label, blank) => {
    const { response, body } = await post(withContent('es', { title: 'Título', abstract: blank }))

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'content.es.abstract', message: 'El resumen en español es obligatorio.' },
    ])
  })

  test('rejects a title that is not text', async () => {
    const { response, body } = await post(withContent('en', { title: 42, abstract: 'Abstract' }))

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'content.en.title' }))
  })

  test('rejects an unsupported language at its own path', async () => {
    const { response, body } = await post({
      ...validBody,
      content: { ...validBody.content, fr: validBody.content.en },
    })

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual({ path: 'content.fr', message: 'Campo no permitido: fr.' })
  })

  test('rejects the previous single-language body', async () => {
    const { content: _content, ...rest } = validBody

    const { response, body } = await post({ ...rest, title: 'Título', abstract: 'Resumen' })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual(
      expect.arrayContaining([
        { path: 'title', message: 'Campo no permitido: title.' },
        expect.objectContaining({ path: 'content' }),
      ]),
    )
  })

  test('trims the text before storing it', async () => {
    await post(withContent('en', { title: '  New publication\n', abstract: '\tAbstract ' }))

    expect(mocks.createPublication).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          en: { title: 'New publication', abstract: 'Abstract' },
        }),
      }),
    )
  })

  test('keeps the existing author, venue, group and date rules', async () => {
    const { response, body } = await post({
      ...validBody,
      authors: [],
      venue: ' ',
      researchGroup: 'OTHER',
      date: 'not a date',
    })

    expect(response.status).toBe(400)
    expect(body.issues.map((issue: { path: string }) => issue.path)).toEqual(
      expect.arrayContaining(['authors', 'venue', 'researchGroup', 'date']),
    )
  })
})

describe('POST /api/publicaciones: publication date', () => {
  test.each([
    ['null', null],
    ['empty', ''],
    ['blank', '   '],
    ['zero', 0],
    ['false', false],
    ['left out', undefined],
  ])('rejects a %s date instead of storing 1970-01-01', async (_label, date) => {
    const { response, body } = await post({ ...validBody, date })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'date', message: 'La fecha de publicación es obligatoria.' },
    ])
    expect(mocks.createPublication).not.toHaveBeenCalled()
  })

  test('rejects text that is not a date', async () => {
    const { response, body } = await post({ ...validBody, date: 'next week' })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'date', message: 'La fecha de publicación no es válida.' },
    ])
  })

  test.each(['2026-01-31', '2026-01-31T00:00:00.000Z'])('accepts the date %s', async (date) => {
    await post({ ...validBody, date })

    expect(mocks.createPublication).toHaveBeenCalledWith(
      expect.objectContaining({ date: new Date('2026-01-31T00:00:00.000Z') }),
    )
  })
})

describe('POST /api/publicaciones: optional DOI and external link', () => {
  test.each([
    ['left out', undefined],
    ['null', null],
    ['empty', ''],
    ['whitespace', '   '],
  ])('stores a DOI %s as null', async (_label, DOI) => {
    const { response } = await post({ ...validBody, DOI })

    expect(response.status).toBe(201)
    expect(mocks.createPublication).toHaveBeenCalledWith(expect.objectContaining({ DOI: null }))
  })

  test.each([
    ['left out', undefined],
    ['null', null],
    ['empty', ''],
  ])('stores an external link %s as null', async (_label, href) => {
    const { response } = await post({ ...validBody, href })

    expect(response.status).toBe(201)
    expect(mocks.createPublication).toHaveBeenCalledWith(expect.objectContaining({ href: null }))
  })

  test('accepts a publication with neither a DOI nor an external link', async () => {
    const { href: _href, DOI: _doi, ...rest } = validBody

    const { response } = await post(rest)

    expect(response.status).toBe(201)
    expect(mocks.createPublication).toHaveBeenCalledWith(
      expect.objectContaining({ href: null, DOI: null }),
    )
  })

  test.each([
    '10.1117/12.3100841',
    '10.1109/CONCAPAN63470.2024.10933895',
    '10.1051/0004-6361/202450456',
    '10.1002/(SICI)1097-4636(199707)36:1<1::AID-JBM1>3.0.CO;2-T',
    '10.1000.10/123456',
  ])('accepts the DOI %s', async (DOI) => {
    const { response } = await post({ ...validBody, DOI })

    expect(response.status).toBe(201)
  })

  test.each([
    'https://doi.org/10.1109/CONCAPAN63470.2024.10933895',
    'doi:10.1234/example',
    '10.1234',
    '11.1234/example',
    '10.abc/example',
    '10.1234/with space',
  ])('rejects the DOI %s', async (DOI) => {
    const { response, body } = await post({ ...validBody, DOI })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      {
        path: 'DOI',
        message: 'El DOI debe tener la forma 10.<registrante>/<sufijo>, sin prefijos.',
      },
    ])
  })

  test.each(['https://example.com/paper', 'http://example.com/paper?id=1'])(
    'accepts the external link %s',
    async (href) => {
      const { response } = await post({ ...validBody, href })

      expect(response.status).toBe(201)
    },
  )

  test.each([
    'example.com/paper',
    '/publicaciones',
    'ftp://example.com/paper',
    'javascript:alert(1)',
  ])('rejects the external link %s', async (href) => {
    const { response, body } = await post({ ...validBody, href })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      {
        path: 'href',
        message: 'El enlace externo debe ser una URL absoluta que empiece con http:// o https://.',
      },
    ])
  })

  test('rejects a DOI that is not text', async () => {
    const { response, body } = await post({ ...validBody, DOI: 123 })

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'DOI' }))
  })
})

describe('POST /api/publicaciones: edge cases', () => {
  test.each([
    ['neither a DOI nor a link', {}, { href: null, DOI: null }],
    ['only a DOI', { DOI: '10.1234/only-doi' }, { href: null, DOI: '10.1234/only-doi' }],
    [
      'only a link',
      { href: 'https://example.com/only-link' },
      { href: 'https://example.com/only-link', DOI: null },
    ],
    [
      'both',
      { DOI: '10.1234/both', href: 'https://example.com/both' },
      { href: 'https://example.com/both', DOI: '10.1234/both' },
    ],
  ])('creates a publication with %s', async (_label, optional, stored) => {
    const { href: _href, DOI: _doi, ...rest } = validBody

    const { response } = await post({ ...rest, ...optional })

    expect(response.status).toBe(201)
    expect(mocks.createPublication).toHaveBeenCalledWith(expect.objectContaining(stored))
  })

  test('accepts the same text in both languages, as for an official title', async () => {
    const same = { title: 'ROSAC', abstract: 'Radio Observatorio de Santa Cruz (ROSAC).' }

    const { response } = await post({ ...validBody, content: { es: same, en: same } })

    expect(response.status).toBe(201)
  })

  test('rejects an empty body, listing every missing field', async () => {
    const { response, body } = await post({})

    expect(response.status).toBe(400)
    expect(body.issues.map((issue: { path: string }) => issue.path)).toEqual(
      expect.arrayContaining(['content', 'authors', 'researchGroup', 'venue', 'date']),
    )
  })

  test.each([
    ['null', null],
    ['an array', [validBody]],
    ['a string', 'publication'],
  ])('rejects a body that is %s', async (_label, value) => {
    const { response, body } = await post(JSON.stringify(value))

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-body')
    expect(mocks.createPublication).not.toHaveBeenCalled()
  })

  test('rejects unknown fields instead of ignoring them', async () => {
    const { response, body } = await post({ ...validBody, version: '1', isAdmin: true })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual(
      expect.arrayContaining([
        { path: 'version', message: 'Campo no permitido: version.' },
        { path: 'isAdmin', message: 'Campo no permitido: isAdmin.' },
      ]),
    )
  })
})

describe('POST /api/publicaciones: results', () => {
  test('creates the publication in both languages', async () => {
    const { response, body } = await post(validBody)

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({
      publication: { ...storedPublication, date: storedPublication.date.toISOString() },
    })
    expect(mocks.createPublication).toHaveBeenCalledWith({
      ...validBody,
      date: new Date('2026-01-01'),
    })
  })

  test('answers 409 for a duplicate DOI', async () => {
    mocks.createPublication.mockResolvedValue({ ok: false, reason: 'duplicate', field: 'doi' })

    const { response, body } = await post(validBody)

    expect(response.status).toBe(409)
    expect(body).toEqual({
      code: 'duplicate-doi',
      error: 'Ya existe una publicación con este DOI.',
    })
  })

  test('answers 409 for a duplicate external link', async () => {
    mocks.createPublication.mockResolvedValue({
      ok: false,
      reason: 'duplicate',
      field: 'externalUrl',
    })

    const { response, body } = await post(validBody)

    expect(response.status).toBe(409)
    expect(body.code).toBe('duplicate-external-url')
  })

  test('answers 500 without database details when the write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createPublication.mockRejectedValue(
      new Error('relation "research.research_record_translations" does not exist'),
    )

    const { response, body } = await post(validBody)

    expect(response.status).toBe(500)
    expect(body).toEqual({ code: 'internal-error', error: 'No se pudo crear la publicación.' })
    expect(JSON.stringify(body)).not.toContain('research_record_translations')
    expect(consoleError).toHaveBeenCalled()
  })
})
