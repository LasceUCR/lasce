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

// `newsInputSchema` is kept real (via `importOriginal` above), and the module that defines it
// imports `prisma` at load time — stub it out so loading the real schema doesn't also require a
// live DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  title: 'Nuevo artículo',
  source: 'La Nación',
  authors: ['Jorge Arturo Mora'],
  publishedAt: '2026-05-24',
  externalUrl: 'https://www.nacion.com/articulo',
  abstract: 'Resumen del artículo.',
  imageUrl: '/images/news/example.png',
  imageAlt: 'Descripción de la imagen.',
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

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createNews).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest({ ...validBody, title: '', authors: [] }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toMatchObject({
      title: expect.any(Array),
      authors: expect.any(Array),
    })
    expect(mocks.createNews).not.toHaveBeenCalled()
  })

  test('creates the article', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = {
      slug: 'new-1',
      ...validBody,
      date: '24 de mayo de 2026',
      href: validBody.externalUrl,
    }
    mocks.createNews.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ article: created })
    expect(mocks.createNews).toHaveBeenCalledWith(validBody)
  })
})
