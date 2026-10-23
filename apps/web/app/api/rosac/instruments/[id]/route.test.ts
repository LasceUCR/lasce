import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateRosacInstrument: vi.fn(),
  deleteRosacInstrument: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    updateRosacInstrument: mocks.updateRosacInstrument,
    deleteRosacInstrument: mocks.deleteRosacInstrument,
  }
})

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  name: 'Polarímetro Modificado',
  pendingMessage: undefined,
}

function patchRequest(body: unknown) {
  return new Request(
    'http://localhost/api/rosac/instruments/00000000-0000-0000-0000-000000000001',
    {
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
  )
}

function deleteRequest() {
  return new Request(
    'http://localhost/api/rosac/instruments/00000000-0000-0000-0000-000000000001',
    {
      method: 'DELETE',
    },
  )
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/rosac/instruments/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateRosacInstrument).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacInstrument).not.toHaveBeenCalled()
  })

  test('returns 404 when instrument does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateRosacInstrument.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect(mocks.updateRosacInstrument).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      validBody,
    )
  })

  test('saves changes and returns updated instrument', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const updated = { id: '00000000-0000-0000-0000-000000000001', ...validBody }
    mocks.updateRosacInstrument.mockResolvedValue(updated)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ instrument: updated })
    expect(mocks.updateRosacInstrument).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      validBody,
    )
  })
})

describe('DELETE /api/rosac/instruments/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteRosacInstrument).not.toHaveBeenCalled()
  })

  test('returns 404 when instrument does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteRosacInstrument.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes instrument and returns 204', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteRosacInstrument.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteRosacInstrument).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001')
  })
})
