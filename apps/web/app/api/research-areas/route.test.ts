import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as ResearchAreas from '@/app/lib/research-areas'

const mocks = vi.hoisted(() => ({
  getResearchAreas: vi.fn(),
  createResearchArea: vi.fn(),
  requireApiPermission: vi.fn(),
}))

// `@/app/lib/rosac` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded
// below (via `importOriginal`) so `researcherInputSchema` stays real, but
// with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/research-areas', async (importOriginal) => {
  const original = await importOriginal<typeof ResearchAreas>()
  return {
    ...original,
    getResearchAreas: mocks.getResearchAreas,
    createResearchArea: mocks.createResearchArea,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { GET, POST } from './route'

const validBody = {
  title: 'Área nueva',
  description: 'Descripción de prueba.',
  src: '/images/research/nueva.jpg',
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/research-areas', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse() {
  return new Response(JSON.stringify({ error: 'No ha iniciado sesión.' }), { status: 401 })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/research-areas', () => {
  test('returns the areas as never-cached JSON', async () => {
    const areas = [{ id: 'area-1', ...validBody }]
    mocks.getResearchAreas.mockResolvedValue(areas)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ areas })
  })
})

describe('POST /api/research-areas', () => {
  test('rejects a request denied by the create_components guard', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createResearchArea).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createResearchArea).not.toHaveBeenCalled()
  })

  test('rejects a missing title', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })

    const response = await POST(postRequest({ ...validBody, title: '' }))

    expect(response.status).toBe(400)
    expect((await response.json()).issues).toMatchObject({ title: expect.any(Array) })
    expect(mocks.createResearchArea).not.toHaveBeenCalled()
  })

  test('creates the area and returns it', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })
    const created = { id: 'area-1', ...validBody }
    mocks.createResearchArea.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ area: created })
    expect(mocks.createResearchArea).toHaveBeenCalledWith(validBody)
  })
})
