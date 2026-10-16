import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as HomeLib from '@/app/lib/home'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  reorderIndicators: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({ requireApiPermission: mocks.requireApiPermission }))

vi.mock('@/app/lib/home', async (importOriginal) => ({
  ...(await importOriginal<typeof HomeLib>()),
  reorderIndicators: mocks.reorderIndicators,
}))

import { PUT } from './route'

const ID_A = '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10'
const ID_B = '5a1d6f0e-2c47-4f7b-8d3e-0c9b1a2e4f60'

async function put(payload: unknown) {
  const response = await PUT(
    new Request('http://localhost/api/home/indicators', {
      method: 'PUT',
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    }),
  )
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.reorderIndicators.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PUT /api/home/indicators', () => {
  test('requires the edit permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PUT(
      new Request('http://localhost/api/home/indicators', { method: 'PUT', body: '{}' }),
    )

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(response).toBe(denied)
    expect(mocks.reorderIndicators).not.toHaveBeenCalled()
  })

  test('rejects a body that is not JSON or not a list of ids', async () => {
    expect((await put('nope')).body.code).toBe('invalid-json')

    const { response, body } = await put({ ids: [ID_A, ID_A] })
    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-body')
    expect(mocks.reorderIndicators).not.toHaveBeenCalled()
  })

  test('saves the order and answers with it', async () => {
    const { response, body } = await put({ ids: [ID_B, ID_A] })

    expect(response.status).toBe(200)
    expect(mocks.reorderIndicators).toHaveBeenCalledWith({
      ids: [ID_B, ID_A],
      positionField: 'position',
    })
    expect(body).toEqual({ ids: [ID_B, ID_A] })
  })

  test('answers 409 when the ids are not the stored indices', async () => {
    mocks.reorderIndicators.mockResolvedValue({ ok: false, reason: 'conflict' })

    const { response, body } = await put({ ids: [ID_A] })

    expect(response.status).toBe(409)
    expect(body).toEqual({
      code: 'conflict',
      error:
        'Los índices geomagnéticos cambiaron desde que cargó la página. Recárguela y vuelva a ordenarlos.',
    })
  })

  test('answers a database failure as a JSON 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.reorderIndicators.mockRejectedValue(new Error('boom'))

    const { response, body } = await put({ ids: [ID_A, ID_B] })

    expect(response.status).toBe(500)
    expect(body.code).toBe('internal-error')
  })
})
