import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'
import { RosacConflictError, RosacReviewRequiredError } from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateRosacCharacteristic: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    updateRosacCharacteristic: mocks.updateRosacCharacteristic,
  }
})

import { PATCH } from './route'

const params = Promise.resolve({ id: 'antenna' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  icon: 'antenna',
  title: 'Antena de 11 metros',
  description: 'Descripción actualizada de la antena.',
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/rosac/characteristics/antenna', {
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

describe('PATCH /api/rosac/characteristics/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateRosacCharacteristic).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacCharacteristic).not.toHaveBeenCalled()
  })

  test('rejects a body with invalid icon or missing required fields', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ ...validBody, icon: 'invalid-icon' }), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacCharacteristic).not.toHaveBeenCalled()
  })

  test('returns 404 when the characteristic does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateRosacCharacteristic.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect(mocks.updateRosacCharacteristic).toHaveBeenCalledWith('antenna', validBody)
  })

  test('saves the change and returns updated characteristic', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const updated = { id: 'antenna', ...validBody }
    mocks.updateRosacCharacteristic.mockResolvedValue(updated)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ characteristic: updated })
    expect(mocks.updateRosacCharacteristic).toHaveBeenCalledWith('antenna', validBody)
  })

  test('returns 409 when the characteristic changed since it was opened', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateRosacCharacteristic.mockRejectedValue(
      new RosacConflictError('La característica cambió desde que la abrió.'),
    )

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'La característica cambió desde que la abrió.',
      code: 'conflict',
    })
  })

  test('returns 400 listing the translations that still need review', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateRosacCharacteristic.mockRejectedValue(
      new RosacReviewRequiredError([{ locale: 'en', field: 'title' }]),
    )

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('review-required')
    expect(body.pending).toEqual([{ path: 'content.en.title', locale: 'en', field: 'title' }])
  })
})
