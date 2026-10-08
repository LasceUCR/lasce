import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as PublicationsLib from '@/app/lib/publications'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updatePublication: vi.fn(),
  deletePublication: vi.fn(),
}))

// `@/app/lib/publications` imports `prisma` at module scope.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/publications', async (importOriginal) => {
  const original = await importOriginal<typeof PublicationsLib>()

  return {
    ...original,
    updatePublication: mocks.updatePublication,
    deletePublication: mocks.deletePublication,
  }
})

import { DELETE, PATCH } from './route'

const ID = '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10'
const VERSION = '2026-09-01T10:00:00.000Z'

const contentBody = {
  version: VERSION,
  content: {
    es: { title: 'Título', abstract: 'Resumen' },
    en: { title: 'Title', abstract: 'Abstract' },
  },
  authors: ['Juan Pérez'],
  href: 'https://example.com/publication',
  DOI: '10.1234/example',
  researchGroup: 'LASCE',
  venue: 'Solar Physics',
  date: '2026-01-01',
}

const storedPublication = {
  slug: ID,
  title: 'Título',
  authors: ['Juan Pérez'],
  venue: 'Solar Physics',
  year: '2026',
  abstract: 'Resumen',
  researchGroup: 'LASCE',
  contentLocale: 'es',
  editing: { isLegacy: false, version: '2026-09-02T08:00:00.000Z' },
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

function patchRequest(body: unknown, id = ID) {
  return new Request(`http://localhost/api/publicaciones/${id}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function patch(body: unknown, id = ID) {
  const response = await PATCH(patchRequest(body, id), paramsFor(id))
  return { response, body: await response.json() }
}

function deleteRequest(id = ID) {
  return new Request(`http://localhost/api/publicaciones/${id}`, { method: 'DELETE' })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({
    ok: true,
    user: { id: 'admin-1', role: 'ADMIN' },
  })
  mocks.updatePublication.mockResolvedValue({ ok: true, publication: storedPublication })
  mocks.deletePublication.mockResolvedValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PATCH /api/publicaciones/[id]: authorization and id', () => {
  test('requires the edit permission', async () => {
    await patch(contentBody)

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
  })

  test.each([401, 403])('answers %i from the guard and saves nothing', async (status) => {
    const denied = deniedResponse(status)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(contentBody), paramsFor(ID))

    expect(response).toBe(denied)
    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })

  test('checks permissions before looking at the id', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(contentBody, 'abc'), paramsFor('abc'))

    expect(response).toBe(denied)
  })

  test('answers 400 for an id that is not a UUID', async () => {
    const { response, body } = await patch(contentBody, 'abc')

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-id')
    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/publicaciones/[id]: validation', () => {
  test('rejects a body that is not valid JSON', async () => {
    const { response, body } = await patch('not json')

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-json')
  })

  test('requires the version the editor loaded', async () => {
    const { version: _version, ...rest } = contentBody

    const { response, body } = await patch(rest)

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'version' }))
    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })

  test('requires both languages in a content update', async () => {
    const { response, body } = await patch({
      version: VERSION,
      content: { es: contentBody.content.es },
    })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'content.en', message: 'Falta el contenido en inglés (title y abstract).' },
    ])
  })

  test('rejects a blank title in a content update', async () => {
    const { response, body } = await patch({
      ...contentBody,
      content: { ...contentBody.content, es: { title: ' \t', abstract: 'Resumen' } },
    })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'content.es.title', message: 'El título en español es obligatorio.' },
    ])
  })

  test('rejects a request with nothing to update', async () => {
    const { response, body } = await patch({ version: VERSION })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: '', message: 'La solicitud no incluye ningún campo para actualizar.' },
    ])
  })

  test('rejects confirmations without content', async () => {
    const { response, body } = await patch({
      version: VERSION,
      DOI: '10.1234/other',
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'confirmedUnchanged' }))
  })

  test('rejects clearing the publication date', async () => {
    const { response, body } = await patch({ version: VERSION, date: null })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'date', message: 'La fecha de publicación es obligatoria.' },
    ])
    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })

  test('rejects unknown fields, such as the old single-language title', async () => {
    const { response, body } = await patch({ version: VERSION, title: 'Título' })

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual({ path: 'title', message: 'Campo no permitido: title.' })
    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })

  test('rejects a version that is not a timestamp', async () => {
    const { response, body } = await patch({ version: 'latest', DOI: null })

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'version' }))
  })

  test('rejects an invalid DOI in a shared-field update', async () => {
    const { response, body } = await patch({ version: VERSION, DOI: 'doi:10.1234/x' })

    expect(response.status).toBe(400)
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'DOI' }))
  })
})

describe('PATCH /api/publicaciones/[id]: content and shared-field updates', () => {
  test('saves a bilingual content update', async () => {
    const { response, body } = await patch(contentBody)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({ publication: storedPublication })
    expect(mocks.updatePublication).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ version: VERSION, content: contentBody.content }),
    )
  })

  test('passes explicit confirmations with a content update', async () => {
    await patch({ ...contentBody, confirmedUnchanged: [{ locale: 'en', field: 'title' }] })

    expect(mocks.updatePublication).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ confirmedUnchanged: [{ locale: 'en', field: 'title' }] }),
    )
  })

  test('treats a body without content as a shared-field update of the fields sent', async () => {
    const { response } = await patch({ version: VERSION, DOI: '10.5555/new-doi' })

    expect(response.status).toBe(200)
    expect(mocks.updatePublication).toHaveBeenCalledWith(ID, {
      version: VERSION,
      DOI: '10.5555/new-doi',
    })
  })

  test('clears the external link when it is sent as null or empty', async () => {
    await patch({ version: VERSION, href: '' })

    expect(mocks.updatePublication).toHaveBeenCalledWith(ID, { version: VERSION, href: null })
  })

  test('answers 400 with the field to review when one language changed alone', async () => {
    mocks.updatePublication.mockResolvedValue({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })

    const { response, body } = await patch(contentBody)

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      code: 'review-required',
      pending: [{ path: 'content.en.title', locale: 'en', field: 'title' }],
    })
  })

  test('answers 409 when someone else saved first', async () => {
    mocks.updatePublication.mockResolvedValue({ ok: false, reason: 'conflict' })

    const { response, body } = await patch(contentBody)

    expect(response.status).toBe(409)
    expect(body.code).toBe('conflict')
  })

  test('answers 404 when the publication does not exist', async () => {
    mocks.updatePublication.mockResolvedValue({ ok: false, reason: 'not-found' })

    const { response, body } = await patch(contentBody)

    expect(response.status).toBe(404)
    expect(body).toEqual({
      code: 'not-found',
      error: `No existe una publicación con id "${ID}".`,
    })
  })

  test.each([
    ['doi', 'duplicate-doi'],
    ['externalUrl', 'duplicate-external-url'],
  ])('answers 409 for a duplicate %s', async (field, code) => {
    mocks.updatePublication.mockResolvedValue({ ok: false, reason: 'duplicate', field })

    const { response, body } = await patch(contentBody)

    expect(response.status).toBe(409)
    expect(body.code).toBe(code)
  })

  test('answers 500 without database details when the write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.updatePublication.mockRejectedValue(new Error('Transaction already closed: P2028'))

    const { response, body } = await patch(contentBody)

    expect(response.status).toBe(500)
    expect(body).toEqual({ code: 'internal-error', error: 'No se pudo guardar la publicación.' })
    expect(consoleError).toHaveBeenCalled()
  })
})

describe('DELETE /api/publicaciones/[id]', () => {
  test('requires the delete permission', async () => {
    await DELETE(deleteRequest(), paramsFor(ID))

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
  })

  test.each([401, 403])('answers %i from the guard and deletes nothing', async (status) => {
    const denied = deniedResponse(status)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), paramsFor(ID))

    expect(response).toBe(denied)
    expect(mocks.deletePublication).not.toHaveBeenCalled()
  })

  test('answers 400 for an id that is not a UUID', async () => {
    const response = await DELETE(deleteRequest('abc'), paramsFor('abc'))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('invalid-id')
    expect(mocks.deletePublication).not.toHaveBeenCalled()
  })

  test('answers 404 when the publication does not exist', async () => {
    mocks.deletePublication.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), paramsFor(ID))

    expect(response.status).toBe(404)
  })

  test('deletes the publication and returns no content', async () => {
    const response = await DELETE(deleteRequest(), paramsFor(ID))

    expect(response.status).toBe(204)
    expect(mocks.deletePublication).toHaveBeenCalledWith(ID)
  })

  test('answers 500 without database details when the delete fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.deletePublication.mockRejectedValue(new Error('connection terminated'))

    const response = await DELETE(deleteRequest(), paramsFor(ID))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'internal-error',
      error: 'No se pudo eliminar la publicación.',
    })
  })
})
