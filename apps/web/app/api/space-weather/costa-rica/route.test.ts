import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as SectionLib from '@/app/lib/space-weather-section'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateSpaceWeatherSection: vi.fn(),
}))

// `@/app/lib/space-weather-section` imports `prisma` at module scope.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/space-weather-section', async (importOriginal) => {
  const original = await importOriginal<typeof SectionLib>()

  return { ...original, updateSpaceWeatherSection: mocks.updateSpaceWeatherSection }
})

import { PATCH } from './route'

const VERSION = '2026-09-01T10:00:00.000Z'

const validBody = {
  version: VERSION,
  content: {
    es: { title: 'Título', body: 'Texto.' },
    en: { title: 'Title', body: 'Text.' },
  },
}

const storedSection = {
  title: 'Título',
  paragraphs: ['Texto.'],
  contentLocale: 'es',
  editing: { isLegacy: false, version: '2026-09-02T08:00:00.000Z' },
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/space-weather/costa-rica', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function patch(body: unknown) {
  const response = await PATCH(patchRequest(body))
  return { response, body: await response.json() }
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({
    ok: true,
    user: { id: 'admin-1', role: 'ADMIN' },
  })
  mocks.updateSpaceWeatherSection.mockResolvedValue({ ok: true, section: storedSection })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PATCH /api/space-weather/costa-rica: authorization', () => {
  test('requires the edit permission', async () => {
    await patch(validBody)

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
  })

  test.each([401, 403])('answers %i from the guard and saves nothing', async (status) => {
    const denied = deniedResponse(status)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.updateSpaceWeatherSection).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/space-weather/costa-rica: validation', () => {
  test('rejects a body that is not valid JSON', async () => {
    const { response, body } = await patch('not json')

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-json')
    expect(mocks.updateSpaceWeatherSection).not.toHaveBeenCalled()
  })

  test('requires the version the editor loaded', async () => {
    const { version: _version, ...rest } = validBody

    const { response, body } = await patch(rest)

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-body')
    expect(body.issues).toContainEqual(expect.objectContaining({ path: 'version' }))
    expect(mocks.updateSpaceWeatherSection).not.toHaveBeenCalled()
  })

  test('requires both languages', async () => {
    const { response, body } = await patch({
      version: VERSION,
      content: { es: validBody.content.es },
    })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'content.en', message: 'Falta el contenido en inglés (title y body).' },
    ])
  })

  test('rejects a blank title and leaves the stored content unchanged', async () => {
    const { response, body } = await patch({
      ...validBody,
      content: { ...validBody.content, es: { title: ' \t', body: 'Texto.' } },
    })

    expect(response.status).toBe(400)
    expect(body.issues).toEqual([
      { path: 'content.es.title', message: 'El título en español es obligatorio.' },
    ])
    expect(mocks.updateSpaceWeatherSection).not.toHaveBeenCalled()
  })

  test('rejects keys it does not know', async () => {
    const { response } = await patch({ ...validBody, key: 'other' })

    expect(response.status).toBe(400)
    expect(mocks.updateSpaceWeatherSection).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/space-weather/costa-rica: saving', () => {
  test('passes the validated body to the service and answers with the stored section', async () => {
    const { response, body } = await patch(validBody)

    expect(response.status).toBe(200)
    expect(body).toEqual({ section: storedSection })
    expect(mocks.updateSpaceWeatherSection).toHaveBeenCalledWith(validBody)
  })

  test('answers 404 when the section does not exist', async () => {
    mocks.updateSpaceWeatherSection.mockResolvedValue({ ok: false, reason: 'not-found' })

    const { response, body } = await patch(validBody)

    expect(response.status).toBe(404)
    expect(body.code).toBe('not-found')
  })

  test('answers 409 when the section changed since it was loaded', async () => {
    mocks.updateSpaceWeatherSection.mockResolvedValue({ ok: false, reason: 'conflict' })

    const { response, body } = await patch(validBody)

    expect(response.status).toBe(409)
    expect(body.code).toBe('conflict')
  })

  test('answers 400 with the fields to review when a one-sided change is unconfirmed', async () => {
    mocks.updateSpaceWeatherSection.mockResolvedValue({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })

    const { response, body } = await patch(validBody)

    expect(response.status).toBe(400)
    expect(body.code).toBe('review-required')
    expect(body.pending).toEqual([{ path: 'content.en.title', locale: 'en', field: 'title' }])
  })

  test('answers 500 without database details when the service throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.updateSpaceWeatherSection.mockRejectedValue(new Error('relation does not exist'))

    const { response, body } = await patch(validBody)

    expect(response.status).toBe(500)
    expect(body.code).toBe('internal-error')
    expect(JSON.stringify(body)).not.toContain('relation does not exist')
  })
})
