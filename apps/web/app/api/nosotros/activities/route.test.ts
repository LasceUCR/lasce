import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NosotrosLib from '@/app/lib/nosotros'

const mocks = vi.hoisted(() => ({
  getNosotrosActivities: vi.fn(),
  createNosotrosActivity: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@/app/lib/nosotros', async (importOriginal) => {
  const original = await importOriginal<typeof NosotrosLib>()
  return {
    ...original,
    getNosotrosActivities: mocks.getNosotrosActivities,
    createNosotrosActivity: mocks.createNosotrosActivity,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

// `nosotrosActivityInputSchema` is kept real (via `importOriginal` above), and
// it in turn is defined in a module that imports `prisma` at load time — stub
// it out so loading the real schema doesn't also require a live DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { GET, POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = { icon: 'waves', title: 'Nuevo título', description: 'Nuevo texto' }

function postRequest(body: unknown) {
  return new Request('http://localhost/api/nosotros/activities', {
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

describe('GET /api/nosotros/activities', () => {
  test('returns the activities as never-cached JSON', async () => {
    const activities = [
      {
        id: '1',
        icon: 'sun',
        title: 'Fenómenos solares eruptivos',
        description: "Analizamos fenómenos solares eruptivos, como 'flares'.",
        modifiedAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    mocks.getNosotrosActivities.mockResolvedValue(activities)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ activities })
  })
})

describe('POST /api/nosotros/activities', () => {
  test('rejects a request the create_components guard denies', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest({ icon: 'waves', title: '', description: '' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toMatchObject({
      title: expect.any(Array),
      description: expect.any(Array),
    })
    expect(mocks.createNosotrosActivity).not.toHaveBeenCalled()
  })

  test('creates the activity, authored by the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = { id: 'new-1', ...validBody, modifiedAt: '2026-01-01T00:00:00.000Z' }
    mocks.createNosotrosActivity.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ activity: created })
    expect(mocks.createNosotrosActivity).toHaveBeenCalledWith(validBody, adminUser.id)
  })
})
