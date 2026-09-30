import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NosotrosLib from '@/app/lib/nosotros'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateNosotrosResearcher: vi.fn(),
  deleteNosotrosResearcher: vi.fn(),
}))

// `@/app/lib/nosotros` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded
// below (via `importOriginal`) so `nosotrosResearcherInputSchema` stays real,
// but with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/nosotros', async (importOriginal) => {
  const original = await importOriginal<typeof NosotrosLib>()
  return {
    ...original,
    updateNosotrosResearcher: mocks.updateNosotrosResearcher,
    deleteNosotrosResearcher: mocks.deleteNosotrosResearcher,
  }
})

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ id: 'abc' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  src: '/images/Researchers/Updated.jpg',
  role: 'Investigador colaborador',
  name: 'Nuevo nombre',
  institution: 'UCR',
  description: 'Texto actualizado.',
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/nosotros/researchers/abc', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request('http://localhost/api/nosotros/researchers/abc', { method: 'DELETE' })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/nosotros/researchers/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields and lists which ones', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ ...validBody, institution: '', src: '' }), {
      params,
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toMatchObject({
      institution: expect.any(Array),
      src: expect.any(Array),
    })
    expect(mocks.updateNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('returns 404 when the researcher does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNosotrosResearcher.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
  })

  test('saves the change and stamps modifiedBy with the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const saved = { id: 'abc', ...validBody }
    mocks.updateNosotrosResearcher.mockResolvedValue(saved)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ researcher: saved })
    expect(mocks.updateNosotrosResearcher).toHaveBeenCalledWith('abc', validBody, adminUser.id)
  })
})

describe('DELETE /api/nosotros/researchers/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('returns 404 when the researcher does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNosotrosResearcher.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes the researcher and returns no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNosotrosResearcher.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteNosotrosResearcher).toHaveBeenCalledWith('abc')
  })
})
