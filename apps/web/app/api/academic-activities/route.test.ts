import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as AcademicActivitiesLib from '@/app/lib/academic-activities'

const mocks = vi.hoisted(() => ({
  getAcademicActivities: vi.fn(),
  createAcademicActivity: vi.fn(),
  requireApiPermission: vi.fn(),
  getLocale: vi.fn(),
}))

vi.mock('@/app/lib/academic-activities', async (importOriginal) => {
  const original = await importOriginal<typeof AcademicActivitiesLib>()
  return {
    ...original,
    getAcademicActivities: mocks.getAcademicActivities,
    createAcademicActivity: mocks.createAcademicActivity,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }))

// `academicActivityCreateSchema` is kept real (via `importOriginal` above), and the module that
// defines it imports `prisma` at load time — stub it out so loading the real schema doesn't also
// require a live DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { GET, POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }

const content = {
  es: {
    title: 'Taller de prueba',
    category: 'Taller',
    description: 'Descripción.',
    photoAlt: 'Texto alternativo.',
  },
  en: {
    title: 'Test workshop',
    category: 'Workshop',
    description: 'Description.',
    photoAlt: 'Alt text.',
  },
}

const validBody = {
  content,
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  photoUrl: '/images/mock.jpg',
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/academic-activities', {
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

describe('GET /api/academic-activities', () => {
  test('returns the activities as never-cached JSON, in the request locale', async () => {
    const activities = [{ id: '1', title: 'Taller', date: '16-20 febrero, 2026' }]
    mocks.getLocale.mockResolvedValue('es')
    mocks.getAcademicActivities.mockResolvedValue(activities)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ activities })
    expect(mocks.getAcademicActivities).toHaveBeenCalledWith('es')
  })
})

describe('POST /api/academic-activities', () => {
  test('rejects a request the create_components guard denies', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createAcademicActivity).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createAcademicActivity).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({
        ...validBody,
        content: { ...content, es: { ...content.es, title: '' } },
        photoUrl: '',
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'content.es.title' }),
        expect.objectContaining({ path: 'photoUrl' }),
      ]),
    )
    expect(mocks.createAcademicActivity).not.toHaveBeenCalled()
  })

  test('rejects an end date earlier than the start date', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({ ...validBody, startDate: '2026-10-26', endDate: '2026-10-13' }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'endDate' })]),
    )
    expect(mocks.createAcademicActivity).not.toHaveBeenCalled()
  })

  test('creates the activity, authored by the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = { id: 'new-1', title: 'Taller de prueba', date: '16-20 febrero, 2026' }
    mocks.createAcademicActivity.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ activity: created })
    expect(mocks.createAcademicActivity).toHaveBeenCalledWith(validBody, adminUser.id)
  })

  test('explains a database failure instead of throwing', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createAcademicActivity.mockRejectedValue(new Error('connection refused'))

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe('No se pudo guardar la actividad.')
  })
})
