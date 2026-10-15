import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as HomeLib from '@/app/lib/home'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateIndicator: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({ requireApiPermission: mocks.requireApiPermission }))

vi.mock('@/app/lib/home', async (importOriginal) => ({
  ...(await importOriginal<typeof HomeLib>()),
  updateIndicator: mocks.updateIndicator,
}))

import { PATCH } from './route'

const ID = '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10'
const VERSION = '2026-10-14T10:00:00.000Z'

async function patch(payload: unknown, id = ID) {
  const response = await PATCH(
    new Request(`http://localhost/api/home/indicators/${id}`, {
      method: 'PATCH',
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id }) },
  )
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.updateIndicator.mockResolvedValue({
    ok: true,
    indicator: { id: ID, code: 'dst', value: '-40 nT', description: 'Estable' },
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PATCH /api/home/indicators/[id]', () => {
  test('requires the edit permission before looking at the id', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 401 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(
      new Request('http://localhost/api/home/indicators/abc', { method: 'PATCH', body: '{}' }),
      { params: Promise.resolve({ id: 'abc' }) },
    )

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(response).toBe(denied)
  })

  test('answers 400 for an id that is not a UUID', async () => {
    const { response, body } = await patch({ version: VERSION, value: '2' }, 'kp')

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      code: 'invalid-id',
      error: 'El identificador del índice geomagnético no es válido.',
    })
    expect(mocks.updateIndicator).not.toHaveBeenCalled()
  })

  test('rejects a body that is not JSON', async () => {
    const { response, body } = await patch('{')

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-json')
  })

  test('rejects a value longer than 15 characters', async () => {
    const { response, body } = await patch({ version: VERSION, value: '1234567890123456' })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'value', message: 'El valor no puede superar los 15 caracteres.' },
    ])
  })

  test('saves a value-only edit', async () => {
    const { response, body } = await patch({ version: VERSION, value: '-40 nT' })

    expect(response.status).toBe(200)
    expect(mocks.updateIndicator).toHaveBeenCalledWith(ID, { version: VERSION, value: '-40 nT' })
    expect(body.indicator.value).toBe('-40 nT')
  })

  test.each([
    ['not-found', 404, 'No existe ese índice geomagnético.'],
    [
      'conflict',
      409,
      'El índice cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
    ],
  ])('maps %s to %i', async (reason, status, error) => {
    mocks.updateIndicator.mockResolvedValue({ ok: false, reason })

    const { response, body } = await patch({ version: VERSION, value: '2' })

    expect(response.status).toBe(status)
    expect(body.error).toBe(error)
  })

  test('answers a review required with its pending fields', async () => {
    mocks.updateIndicator.mockResolvedValue({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'description' }],
    })

    const { response, body } = await patch({
      version: VERSION,
      content: { es: { description: 'Perturbado' }, en: { description: 'Stable' } },
    })

    expect(response.status).toBe(400)
    expect(body.pending).toEqual([
      { path: 'content.en.description', locale: 'en', field: 'description' },
    ])
  })

  test('answers a database failure as a JSON 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.updateIndicator.mockRejectedValue(new Error('boom'))

    const { response, body } = await patch({ version: VERSION, value: '2' })

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'No se pudo guardar el índice geomagnético.',
      code: 'internal-error',
    })
  })
})
