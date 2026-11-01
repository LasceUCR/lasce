import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NewsLib from '@/app/lib/news'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateNews: vi.fn(),
  deleteNews: vi.fn(),
}))

// `@/app/lib/news` imports `prisma` at module scope, which throws if `DATABASE_URL` is unset, as
// it is here. The real module is still loaded below (via `importOriginal`) so `newsUpdateSchema`
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

const newsId = '0b9c3a52-7d1e-4f8a-9b6c-5e4d3c2b1a09'
const params = Promise.resolve({ id: newsId })
const badParams = Promise.resolve({ id: 'abc' })
const VERSION = '2026-09-01T10:00:00.000Z'
const NEWS_GONE =
  'Esta noticia ya no existe. Es posible que otra persona la haya eliminado; recargue la página.'
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const contentBody = {
  version: VERSION,
  content: {
    es: { title: 'Artículo actualizado', abstract: 'Resumen actualizado.' },
    en: { title: 'Updated article', abstract: 'Updated abstract.' },
  },
}

function patchRequest(body: unknown) {
  return new Request(`http://localhost/api/news/${newsId}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request(`http://localhost/api/news/${newsId}`, { method: 'DELETE' })
}

function deniedResponse() {
  return new Response(JSON.stringify({ error: 'No ha iniciado sesión.' }), { status: 401 })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/news/[id]', () => {
  test('rejects a request the edit_components guard denies', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(contentBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateNews).not.toHaveBeenCalled()
  })

  test('rejects an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest(contentBody), { params: badParams })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'invalid-id' })
    expect(mocks.updateNews).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('{not json'), { params })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'invalid-json' })
  })

  test('rejects an update without the version the editor loaded', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const { version: _version, ...unversioned } = contentBody

    const response = await PATCH(patchRequest(unversioned), { params })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('invalid-body')
    expect(body.issues).toEqual([expect.objectContaining({ path: 'version' })])
    expect(mocks.updateNews).not.toHaveBeenCalled()
  })

  test('saves the change and answers with the stored item', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const article = { slug: newsId, title: 'Artículo actualizado' }
    mocks.updateNews.mockResolvedValue({ ok: true, article })

    const response = await PATCH(patchRequest(contentBody), { params })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ article })
    expect(mocks.updateNews).toHaveBeenCalledWith(newsId, contentBody, expect.anything())
  })

  test('passes a shared-field update through without content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNews.mockResolvedValue({ ok: true, article: {} })

    await PATCH(patchRequest({ version: VERSION, source: 'Delfino.cr' }), { params })

    expect(mocks.updateNews).toHaveBeenCalledWith(
      newsId,
      {
        version: VERSION,
        source: 'Delfino.cr',
      },
      expect.anything(),
    )
  })

  test('answers 404 when the item does not exist, saying it may have been deleted', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNews.mockResolvedValue({ ok: false, reason: 'not-found' })

    const response = await PATCH(patchRequest(contentBody), { params })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ code: 'not-found', error: NEWS_GONE })
  })

  test('answers 409 conflict when the item changed since the editor loaded it', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNews.mockResolvedValue({ ok: false, reason: 'conflict' })

    const response = await PATCH(patchRequest(contentBody), { params })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ code: 'conflict' })
  })

  test('answers 409 when another item already uses the link', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNews.mockResolvedValue({ ok: false, reason: 'duplicate-link' })

    const response = await PATCH(patchRequest(contentBody), { params })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ code: 'duplicate-external-url' })
  })

  test('lists the fields to update or confirm when a change was made in one language only', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNews.mockResolvedValue({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })

    const response = await PATCH(patchRequest(contentBody), { params })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'review-required',
      pending: [{ path: 'content.en.title', locale: 'en', field: 'title' }],
    })
  })

  test('explains a database failure without its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNews.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await PATCH(patchRequest(contentBody), { params })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      code: 'internal-error',
      error: 'No se pudieron guardar los cambios de la noticia.',
    })
  })
})

describe('DELETE /api/news/[id]', () => {
  test('rejects a request the delete_components guard denies', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteNews).not.toHaveBeenCalled()
  })

  test('rejects an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await DELETE(deleteRequest(), { params: badParams })

    expect(response.status).toBe(400)
    expect(mocks.deleteNews).not.toHaveBeenCalled()
  })

  test('answers 404 when the item does not exist, saying it may have been deleted', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNews.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ code: 'not-found', error: NEWS_GONE })
  })

  test('explains a database failure without its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNews.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ code: 'internal-error' })
  })

  test('deletes the item and answers with no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNews.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteNews).toHaveBeenCalledWith(newsId, expect.anything())
  })
})
