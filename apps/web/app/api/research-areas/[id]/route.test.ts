import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as ResearchAreas from '@/app/lib/research-areas'

const mocks = vi.hoisted(() => ({
  updateResearchArea: vi.fn(),
  deleteResearchArea: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/research-areas', async (importOriginal) => ({
  ...(await importOriginal<typeof ResearchAreas>()),
  updateResearchArea: mocks.updateResearchArea,
  deleteResearchArea: mocks.deleteResearchArea,
}))

vi.mock('@/app/lib/auth/apiGuard', () => ({ requireApiPermission: mocks.requireApiPermission }))

import { DELETE, PATCH } from './route'

const ID = '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10'
const VERSION = '2026-10-15T10:00:00.000Z'

const content = {
  es: { title: 'Geomagnetismo', description: 'Estudia el campo magnético.' },
  en: { title: 'Geomagnetism', description: 'Studies the magnetic field.' },
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

async function patch(body: unknown, id = ID) {
  const response = await PATCH(
    new Request(`http://localhost/api/research-areas/${id}`, {
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    paramsFor(id),
  )
  return { response, body: await response.json() }
}

function remove(id = ID) {
  return DELETE(
    new Request(`http://localhost/api/research-areas/${id}`, { method: 'DELETE' }),
    paramsFor(id),
  )
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.updateResearchArea.mockResolvedValue({ ok: true, area: { id: ID } })
  mocks.deleteResearchArea.mockResolvedValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PATCH /api/research-areas/[id]', () => {
  test('requires the edit permission before looking at the id', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(
      new Request('http://localhost/api/research-areas/abc', { method: 'PATCH', body: '{}' }),
      paramsFor('abc'),
    )

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(response).toBe(denied)
    expect(mocks.updateResearchArea).not.toHaveBeenCalled()
  })

  test('answers 400 for an id that is not a UUID', async () => {
    const { response, body } = await patch({ version: VERSION, src: '/a.jpg' }, 'abc')

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      code: 'invalid-id',
      error: 'El identificador del área de investigación no es válido.',
    })
  })

  test('rejects a body that is not JSON, or without the version', async () => {
    expect((await patch('nope')).body.code).toBe('invalid-json')

    const { response, body } = await patch({ src: '/a.jpg' })
    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      {
        path: 'version',
        message: 'La versión del área de investigación es obligatoria y debe ser la que se cargó.',
      },
    ])
  })

  test('saves a photo-only update', async () => {
    const { response, body } = await patch({ version: VERSION, src: '/nueva.jpg' })

    expect(response.status).toBe(200)
    expect(mocks.updateResearchArea).toHaveBeenCalledWith(ID, {
      version: VERSION,
      src: '/nueva.jpg',
    })
    expect(body).toEqual({ area: { id: ID } })
  })

  test.each([
    [
      'not-found',
      404,
      'not-found',
      `No existe un área de investigación con id "0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10".`,
    ],
    [
      'conflict',
      409,
      'conflict',
      'El área de investigación cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
    ],
  ])('maps %s to %i', async (reason, status, code, error) => {
    mocks.updateResearchArea.mockResolvedValue({ ok: false, reason })

    const { response, body } = await patch({ version: VERSION, src: '/a.jpg' })

    expect(response.status).toBe(status)
    expect(body).toEqual({ code, error })
  })

  test('answers a review required with the path of each field to review', async () => {
    mocks.updateResearchArea.mockResolvedValue({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })

    const { response, body } = await patch({ version: VERSION, content })

    expect(response.status).toBe(400)
    expect(body.pending).toEqual([{ path: 'content.en.title', locale: 'en', field: 'title' }])
  })

  test('answers a database failure as a JSON 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.updateResearchArea.mockRejectedValue(new Error('boom'))

    const { response, body } = await patch({ version: VERSION, src: '/a.jpg' })

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'No se pudo guardar el área de investigación.',
      code: 'internal-error',
    })
  })
})

describe('DELETE /api/research-areas/[id]', () => {
  test.each([401, 403])('answers %i from the guard and deletes nothing', async (status) => {
    const denied = deniedResponse(status)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await remove()

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(response).toBe(denied)
    expect(mocks.deleteResearchArea).not.toHaveBeenCalled()
  })

  test('answers 400 for an id that is not a UUID', async () => {
    const response = await remove('abc')

    expect(response.status).toBe(400)
    expect(mocks.deleteResearchArea).not.toHaveBeenCalled()
  })

  test('deletes the area and answers 204', async () => {
    const response = await remove()

    expect(response.status).toBe(204)
    expect(mocks.deleteResearchArea).toHaveBeenCalledWith(ID)
  })

  test('answers 404 when there was nothing to delete', async () => {
    mocks.deleteResearchArea.mockResolvedValue(false)

    const response = await remove()

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ code: 'not-found' })
  })

  test('answers a database failure as a JSON 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.deleteResearchArea.mockRejectedValue(new Error('boom'))

    const response = await remove()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'No se pudo eliminar el área de investigación.',
      code: 'internal-error',
    })
  })
})
