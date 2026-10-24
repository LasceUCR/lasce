import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateRosacActivity: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    updateRosacActivity: mocks.updateRosacActivity,
  }
})

import { PATCH } from './route'

const params = Promise.resolve({ id: 'tracking' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  icon: 'tracking',
  title: 'Apuntado y seguimiento',
  description: 'Desarrollamos un radiotelescopio capaz de apuntar y seguir fuentes.',
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/rosac/activities/tracking', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/rosac/activities/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateRosacActivity).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacActivity).not.toHaveBeenCalled()
  })

  test('rejects a body missing required title', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ ...validBody, title: '  ' }), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacActivity).not.toHaveBeenCalled()
  })

  test('returns 404 when the activity does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateRosacActivity.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect(mocks.updateRosacActivity).toHaveBeenCalledWith('tracking', validBody)
  })

  test('saves the change and returns updated activity', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const updated = { id: 'tracking', ...validBody }
    mocks.updateRosacActivity.mockResolvedValue(updated)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ activity: updated })
    expect(mocks.updateRosacActivity).toHaveBeenCalledWith('tracking', validBody)
  })
})
