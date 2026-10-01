import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as ResearchAreas from '@/app/lib/research-areas'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateResearchArea: vi.fn(),
  deleteResearchArea: vi.fn(),
}))

// `@/app/lib/nosotros` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded
// below (via `importOriginal`) so `nosotrosResearcherInputSchema` stays real,
// but with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/research-areas', async (importOriginal) => {
  const original = await importOriginal<typeof ResearchAreas>()
  return {
    ...original,
    updateResearchArea: mocks.updateResearchArea,
    deleteResearchArea: mocks.deleteResearchArea,
  }
})

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' })
const validBody = {
  title: 'Área actualizada',
  description: 'Descripción actualizada.',
  src: '/images/research/actualizada.jpg',
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/research-areas/area-id', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse() {
  return new Response(JSON.stringify({ error: 'denied' }), { status: 401 })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/research-areas/[id]', () => {
  test('rejects a request denied by the edit_components guard', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateResearchArea).not.toHaveBeenCalled()
  })

  test('rejects invalid JSON and invalid fields', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })

    const invalidJsonResponse = await PATCH(patchRequest('not json'), { params })
    const invalidFieldsResponse = await PATCH(patchRequest({ ...validBody, title: '' }), { params })

    expect(invalidJsonResponse.status).toBe(400)
    expect(invalidFieldsResponse.status).toBe(400)
    expect((await invalidFieldsResponse.json()).issues).toMatchObject({ title: expect.any(Array) })
    expect(mocks.updateResearchArea).not.toHaveBeenCalled()
  })

  test('returns 404 when the area does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })
    mocks.updateResearchArea.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
  })

  test('updates the area and returns never-cached JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })
    const area = { id: 'area-id', ...validBody }
    mocks.updateResearchArea.mockResolvedValue(area)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ area })
    expect(mocks.updateResearchArea).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      validBody,
    )
  })
})

describe('DELETE /api/research-areas/[id]', () => {
  test('rejects a request denied by the delete_components guard', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(new Request('http://localhost'), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteResearchArea).not.toHaveBeenCalled()
  })

  test('returns 404 when the area does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })
    mocks.deleteResearchArea.mockResolvedValue(false)

    const response = await DELETE(new Request('http://localhost'), { params })

    expect(response.status).toBe(404)
  })

  test('deletes the area and returns no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })
    mocks.deleteResearchArea.mockResolvedValue(true)

    const response = await DELETE(new Request('http://localhost'), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteResearchArea).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001')
  })
})
