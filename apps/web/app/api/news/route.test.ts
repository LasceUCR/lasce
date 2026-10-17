import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NewsLib from '@/app/lib/news'

const mocks = vi.hoisted(() => ({
  createNews: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@/app/lib/news', async (importOriginal) => {
  const original = await importOriginal<typeof NewsLib>()
  return {
    ...original,
    createNews: mocks.createNews,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

// `newsCreateSchema` is kept real (via `importOriginal` above), and the module that defines it
// imports `prisma` at load time: stub it out so loading the real schema doesn't also require a
// live DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  content: {
    es: { title: 'Nuevo artículo', abstract: 'Resumen del artículo.' },
    en: { title: 'New article', abstract: 'Article abstract.' },
  },
  source: 'La Nación',
  authors: ['Jorge Arturo Mora'],
  publishedAt: '2026-05-24',
  externalUrl: 'https://www.nacion.com/articulo',
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/news', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse() {
  return new Response(JSON.stringify({ error: 'No ha iniciado sesión.' }), { status: 401 })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/news', () => {
  test('rejects a request the create_components guard denies', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createNews).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest('{not json'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'invalid-json' })
    expect(mocks.createNews).not.toHaveBeenCalled()
  })

  test('rejects an item missing its English text, pointing at the language', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({ ...validBody, content: { es: validBody.content.es } }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('invalid-body')
    expect(body.issues).toEqual([expect.objectContaining({ path: 'content.en' })])
    expect(mocks.createNews).not.toHaveBeenCalled()
  })

  test('rejects the previous single-language body', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const { content, ...shared } = validBody

    const response = await POST(postRequest({ ...shared, ...content.es }))

    expect(response.status).toBe(400)
    expect(mocks.createNews).not.toHaveBeenCalled()
  })

  test('creates the item in both languages and answers with it', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const article = { slug: 'news-1', title: 'Nuevo artículo' }
    mocks.createNews.mockResolvedValue({ ok: true, article })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ article })
    expect(mocks.createNews).toHaveBeenCalledWith(validBody)
  })

  test('answers 409 when another item already uses the link', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createNews.mockResolvedValue({ ok: false, reason: 'duplicate-link' })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      code: 'duplicate-external-url',
      error: 'Ya existe una noticia con este enlace. Use otro enlace o edite la noticia existente.',
    })
  })

  test('explains a database failure without its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createNews.mockRejectedValue(new Error('connection refused at 10.0.0.5'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      code: 'internal-error',
      error: 'No se pudo guardar la noticia.',
    })
  })
})
