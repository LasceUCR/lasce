import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateRosacAcknowledgment: vi.fn(),
  deleteRosacAcknowledgment: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    updateRosacAcknowledgment: mocks.updateRosacAcknowledgment,
    deleteRosacAcknowledgment: mocks.deleteRosacAcknowledgment,
  }
})

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ id: '00000000-0000-0000-0000-000000000002' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  name: 'CINESPA UCR Actualizado',
  href: 'https://cinespa.ucr.ac.cr',
  logo: {
    src: '/images/cinespa.webp',
    alt: 'Logo CINESPA',
  },
}

function patchRequest(body: unknown) {
  return new Request(
    'http://localhost/api/rosac/acknowledgments/00000000-0000-0000-0000-000000000002',
    {
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
  )
}

function deleteRequest() {
  return new Request(
    'http://localhost/api/rosac/acknowledgments/00000000-0000-0000-0000-000000000002',
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

describe('PATCH /api/rosac/acknowledgments/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateRosacAcknowledgment).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacAcknowledgment).not.toHaveBeenCalled()
  })

  test('rejects javascript: URL in href', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(
      patchRequest({
        ...validBody,
        href: 'javascript:void(0)',
      }),
      { params },
    )

    expect(response.status).toBe(400)
    expect(mocks.updateRosacAcknowledgment).not.toHaveBeenCalled()
  })

  test('returns 404 when acknowledgment does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateRosacAcknowledgment.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect(mocks.updateRosacAcknowledgment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000002',
      validBody,
    )
  })

  test('saves changes and returns updated acknowledgment', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const updated = { id: '00000000-0000-0000-0000-000000000002', ...validBody }
    mocks.updateRosacAcknowledgment.mockResolvedValue(updated)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ acknowledgment: updated })
    expect(mocks.updateRosacAcknowledgment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000002',
      validBody,
    )
  })
})

describe('DELETE /api/rosac/acknowledgments/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteRosacAcknowledgment).not.toHaveBeenCalled()
  })

  test('returns 404 when acknowledgment does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteRosacAcknowledgment.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes acknowledgment and returns 204', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteRosacAcknowledgment.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteRosacAcknowledgment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000002',
    )
  })
})
