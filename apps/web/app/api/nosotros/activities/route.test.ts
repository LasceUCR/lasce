import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as NosotrosLib from '@/app/lib/nosotros'

const mocks = vi.hoisted(() => ({
  getNosotrosActivities: vi.fn(),
  createNosotrosActivity: vi.fn(),
  requireApiPermission: vi.fn(),
  getLocale: vi.fn(),
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

// The real schemas are kept (via `importOriginal` above), and the module that defines them
// imports `prisma` at load time — stub it out so loading it doesn't also require a live
// DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

// The GET handler reads the request's language through next-intl.
vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }))

import { GET, POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  icon: 'waves',
  content: {
    es: { title: 'Nuevo título', description: 'Nuevo texto' },
    en: { title: 'New title', description: 'New text' },
  },
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/nosotros/activities', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse() {
  return new Response(JSON.stringify({ error: 'No ha iniciado sesión.' }), { status: 401 })
}

beforeEach(() => {
  mocks.getLocale.mockResolvedValue('es')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/nosotros/activities', () => {
  const activities = [
    {
      id: '1',
      icon: 'sun',
      title: 'Fenómenos solares eruptivos',
      description: "Analizamos fenómenos solares eruptivos, como 'flares'.",
      modifiedAt: '2026-01-01T00:00:00.000Z',
      contentLocale: 'es',
    },
  ]

  test('returns the activities as never-cached JSON', async () => {
    mocks.getNosotrosActivities.mockResolvedValue(activities)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ activities })
  })

  test('reads the activities in the language of the request, without editing data', async () => {
    mocks.getLocale.mockResolvedValue('en')
    mocks.getNosotrosActivities.mockResolvedValue([])

    await GET()

    expect(mocks.getNosotrosActivities).toHaveBeenCalledWith('en')
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
    expect((await response.json()).code).toBe('invalid-json')
    expect(mocks.createNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a body missing a language, listing the fields by path', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({
        icon: 'waves',
        content: { ...validBody.content, en: { title: '', description: '' } },
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('invalid-body')
    expect(body.issues).toEqual([
      { path: 'content.en.title', message: 'El título en inglés es obligatorio.' },
      { path: 'content.en.description', message: 'La descripción en inglés es obligatoria.' },
    ])
    expect(mocks.createNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects the former flat body', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({ icon: 'waves', title: 'Nuevo título', description: 'Nuevo texto' }),
    )

    expect(response.status).toBe(400)
    expect(mocks.createNosotrosActivity).not.toHaveBeenCalled()
  })

  test('creates the activity, authored by the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = { id: 'new-1', icon: 'waves', modifiedAt: '2026-01-01T00:00:00.000Z' }
    mocks.createNosotrosActivity.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ activity: created })
    expect(mocks.createNosotrosActivity).toHaveBeenCalledWith(validBody, adminUser.id)
  })

  test('answers an unexpected failure without exposing its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createNosotrosActivity.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'No se pudo guardar la actividad.',
      code: 'internal-error',
    })
  })
})
