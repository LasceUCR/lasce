import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateRosacStage: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    updateRosacStage: mocks.updateRosacStage,
  }
})

import { PATCH } from './route'

const params = Promise.resolve({ id: 'preparation' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  title: 'Etapa 1: Preparación',
  description: 'Descripción de la etapa de preparación.',
  images: [{ src: '/images/stage1.jpg', alt: 'Preparación' }],
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/rosac/stages/preparation', {
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

describe('PATCH /api/rosac/stages/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateRosacStage).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacStage).not.toHaveBeenCalled()
  })

  test('rejects a body missing required title', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ ...validBody, title: '' }), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateRosacStage).not.toHaveBeenCalled()
  })

  test('returns 404 when the stage does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateRosacStage.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect(mocks.updateRosacStage).toHaveBeenCalledWith('preparation', validBody)
  })

  test('saves the change and returns updated stage', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const updated = { id: 'preparation', ...validBody }
    mocks.updateRosacStage.mockResolvedValue(updated)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ stage: updated })
    expect(mocks.updateRosacStage).toHaveBeenCalledWith('preparation', validBody)
  })
})
