import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as ResearchAreas from '@/app/lib/research-areas'

const mocks = vi.hoisted(() => ({
  getLocale: vi.fn(),
  getResearchAreas: vi.fn(),
  createResearchArea: vi.fn(),
  requireApiPermission: vi.fn(),
}))

// `@/app/lib/research-areas` imports `prisma` at module scope.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/research-areas', async (importOriginal) => ({
  ...(await importOriginal<typeof ResearchAreas>()),
  getResearchAreas: mocks.getResearchAreas,
  createResearchArea: mocks.createResearchArea,
}))

// The GET handler reads the request's language through next-intl.
vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }))

vi.mock('@/app/lib/auth/apiGuard', () => ({ requireApiPermission: mocks.requireApiPermission }))

import { GET, POST } from './route'

const validBody = {
  content: {
    es: { title: 'Área nueva', description: 'Descripción de prueba.' },
    en: { title: 'New area', description: 'Test description.' },
  },
  src: '/images/research/nueva.jpg',
}

async function post(body: unknown) {
  const response = await POST(
    new Request('http://localhost/api/research-areas', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.createResearchArea.mockResolvedValue({ ok: true, area: { id: 'area-1' } })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('GET /api/research-areas', () => {
  test('returns the areas in the request language as never-cached JSON', async () => {
    mocks.getLocale.mockResolvedValue('en')
    mocks.getResearchAreas.mockResolvedValue([{ id: 'area-1', title: 'New area' }])

    const response = await GET()

    expect(mocks.getResearchAreas).toHaveBeenCalledWith('en')
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ areas: [{ id: 'area-1', title: 'New area' }] })
  })
})

describe('POST /api/research-areas', () => {
  test('requires the create permission and saves nothing without it', async () => {
    const denied = new Response(JSON.stringify({ error: 'No ha iniciado sesión.' }), {
      status: 401,
    })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(
      new Request('http://localhost/api/research-areas', { method: 'POST', body: '{}' }),
    )

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(response).toBe(denied)
    expect(mocks.createResearchArea).not.toHaveBeenCalled()
  })

  test('rejects a body that is not JSON', async () => {
    const { response, body } = await post('{')

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-json')
  })

  test('rejects a missing language at its path, without saving', async () => {
    const { response, body } = await post({ ...validBody, content: { es: validBody.content.es } })

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-body')
    expect(body.issues.map((issue: { path: string }) => issue.path)).toContain('content.en')
    expect(mocks.createResearchArea).not.toHaveBeenCalled()
  })

  test('rejects the old single-language body', async () => {
    const { response, body } = await post({
      title: 'Área nueva',
      description: 'Descripción.',
      src: '/images/research/nueva.jpg',
    })

    expect(response.status).toBe(400)
    expect(body.code).toBe('invalid-body')
  })

  test('creates the area and answers 201 with it', async () => {
    const { response, body } = await post(validBody)

    expect(response.status).toBe(201)
    expect(mocks.createResearchArea).toHaveBeenCalledWith(validBody)
    expect(body).toEqual({ area: { id: 'area-1' } })
  })

  test('answers a database failure as a JSON 500 without its details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.createResearchArea.mockRejectedValue(new Error('connection refused'))

    const { response, body } = await post(validBody)

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'No se pudo crear el área de investigación.',
      code: 'internal-error',
    })
  })
})
