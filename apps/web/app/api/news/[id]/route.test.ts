import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NewsLib from '@/app/lib/news'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateNews: vi.fn(),
  deleteNews: vi.fn(),
}))

// `@/app/lib/news` imports `prisma` at module scope, which throws if `DATABASE_URL` is unset — as
// it is here. The real module is still loaded below (via `importOriginal`) so `newsInputSchema`
// stays real, but with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/news', async (importOriginal) => {
  const original = await importOriginal<typeof NewsLib>()
  return {
    ...original,
    updateNews: mocks.updateNews,
    deleteNews: mocks.deleteNews,
  }
})

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ id: 'abc' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  title: 'Artículo actualizado',
  source: 'La Nación',
  authors: ['Jorge Arturo Mora'],
  publishedAt: '2026-05-24',
  externalUrl: 'https://www.nacion.com/articulo',
  abstract: 'Resumen actualizado.',
  imageUrl: '/images/news/example.png',
  imageAlt: 'Descripción de la imagen.',
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/news/abc', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request('http://localhost/api/news/abc', { method: 'DELETE' })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/news/[id]', () => {
  test('rejects a request the edit_components guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateNews).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateNews).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields and lists which ones', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ ...validBody, title: '', authors: [] }), {
      params,
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toMatchObject({
      title: expect.any(Array),
      authors: expect.any(Array),
    })
    expect(mocks.updateNews).not.toHaveBeenCalled()
  })

  test('returns 404 when the article does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNews.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
  })

  test('saves the change', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const saved = {
      slug: 'abc',
      ...validBody,
      date: '24 de mayo de 2026',
      href: validBody.externalUrl,
    }
    mocks.updateNews.mockResolvedValue(saved)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ article: saved })
    expect(mocks.updateNews).toHaveBeenCalledWith('abc', validBody)
  })
})

describe('DELETE /api/news/[id]', () => {
  test('rejects a request the delete_components guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteNews).not.toHaveBeenCalled()
  })

  test('returns 404 when the article does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNews.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes the article and returns no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNews.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteNews).toHaveBeenCalledWith('abc')
  })
})
