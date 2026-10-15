import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as HomeLib from '@/app/lib/home'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateHero: vi.fn(),
}))

// `@/app/lib/home` imports `prisma` at module scope.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({ requireApiPermission: mocks.requireApiPermission }))

vi.mock('@/app/lib/home', async (importOriginal) => ({
  ...(await importOriginal<typeof HomeLib>()),
  updateHero: mocks.updateHero,
}))

import { PATCH } from './route'

const VERSION = '2026-10-14T10:00:00.000Z'

const body = {
  version: VERSION,
  content: {
    es: { title: 'Exploramos el Sol', lead: 'Investigamos.' },
    en: { title: 'We explore the Sun', lead: 'We study.' },
  },
}

async function patch(payload: unknown) {
  const response = await PATCH(
    new Request('http://localhost/api/home/hero', {
      method: 'PATCH',
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    }),
  )
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.updateHero.mockResolvedValue({
    ok: true,
    hero: { title: 'Exploramos el Sol', lead: 'Investigamos.', contentLocale: 'es' },
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PATCH /api/home/hero', () => {
  test('requires the edit permission', async () => {
    await patch(body)

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
  })

  test.each([401, 403])('answers %i from the guard and saves nothing', async (status) => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(
      new Request('http://localhost/api/home/hero', { method: 'PATCH', body: '{}' }),
    )

    expect(response).toBe(denied)
    expect(mocks.updateHero).not.toHaveBeenCalled()
  })

  test('rejects a body that is not JSON', async () => {
    const { response, body: answer } = await patch('not json')

    expect(response.status).toBe(400)
    expect(answer.code).toBe('invalid-json')
  })

  test('rejects a missing language at its path, without saving', async () => {
    const { response, body: answer } = await patch({
      version: VERSION,
      content: { es: body.content.es },
    })

    expect(response.status).toBe(400)
    expect(answer.code).toBe('invalid-body')
    expect(answer.issues.map((issue: { path: string }) => issue.path)).toContain('content.en')
    expect(mocks.updateHero).not.toHaveBeenCalled()
  })

  test('saves and answers with the stored banner', async () => {
    const { response, body: answer } = await patch(body)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mocks.updateHero).toHaveBeenCalledWith(body)
    expect(answer.hero.title).toBe('Exploramos el Sol')
  })

  test.each([
    [{ ok: false, reason: 'not-found' }, 404, 'not-found'],
    [{ ok: false, reason: 'conflict' }, 409, 'conflict'],
    [
      { ok: false, reason: 'review-required', pending: [{ locale: 'en', field: 'lead' }] },
      400,
      'review-required',
    ],
  ])('maps %o to %i', async (failure, status, code) => {
    mocks.updateHero.mockResolvedValue(failure)

    const { response, body: answer } = await patch(body)

    expect(response.status).toBe(status)
    expect(answer.code).toBe(code)
  })

  test('answers a review with the path of each field to review', async () => {
    mocks.updateHero.mockResolvedValue({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'lead' }],
    })

    const { body: answer } = await patch(body)

    expect(answer.pending).toEqual([{ path: 'content.en.lead', locale: 'en', field: 'lead' }])
  })

  test('answers a database failure as a JSON 500 without its details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.updateHero.mockRejectedValue(new Error('connection refused at 10.0.0.1'))

    const { response, body: answer } = await patch(body)

    expect(response.status).toBe(500)
    expect(answer).toEqual({ error: 'No se pudo guardar la portada.', code: 'internal-error' })
  })
})
