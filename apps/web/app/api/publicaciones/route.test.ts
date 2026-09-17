import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as PublicationsLib from '@/app/lib/publications'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  getPublications: vi.fn(),
  createPublication: vi.fn(),
}))

vi.mock('@/app/lib/publications', async (importOriginal) => {
  const original = await importOriginal<typeof PublicationsLib>()

  return {
    ...original,
    getPublications: mocks.getPublications,
    createPublication: mocks.createPublication,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

import { GET, POST } from './route'

const validBody = {
  title: 'Nueva publicación',
  abstract: 'Un resumen de la publicación.',
  authors: ['Juan Pérez', 'María Rodríguez'],
  DOI: '10.1234/example',
  researchGroup: 'LASCE',
  venue: 'Solar Physics',
  date: '2026-01-01',
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/publicaciones', {
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

describe('GET /api/publicaciones', () => {
  test('returns publications as never-cached JSON', async () => {
    const publications = [
      {
        slug: 'publication-1',
        title: 'Publicación de prueba',
        authors: ['Juan Pérez'],
        venue: 'Solar Physics',
        year: '2026',
        date: new Date('2026-01-01'),
        abstract: 'Resumen de prueba.',
        href: 'https://example.com/publication',
        researchGroup: 'LASCE',
      },
    ]

    mocks.getPublications.mockResolvedValue(publications)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')

    expect(await response.json()).toEqual({
      publications: publications.map((publication) => ({
        ...publication,
        date: publication.date.toISOString(),
      })),
    })
  })
})

describe('POST /api/publicaciones', () => {
  test('rejects a request the admin guard denies', async () => {
    const denied = deniedResponse()

    mocks.requireApiPermission.mockResolvedValue({
      ok: false,
      response: denied,
    })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.createPublication).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: true,
      user: { id: 'admin-1', role: 'ADMIN' },
    })

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createPublication).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields', async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: true,
      user: { id: 'admin-1', role: 'ADMIN' },
    })

    const response = await POST(
      postRequest({
        title: '',
        abstract: '',
        authors: [],
      }),
    )

    expect(response.status).toBe(400)

    const body = await response.json()

    expect(body.issues).toMatchObject({
      title: expect.any(Array),
      abstract: expect.any(Array),
      authors: expect.any(Array),
    })

    expect(mocks.createPublication).not.toHaveBeenCalled()
  })

  test('creates the publication', async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: true,
      user: { id: 'admin-1', role: 'ADMIN' },
    })

    const created = {
      slug: 'publication-new',
      title: validBody.title,
      authors: validBody.authors,
      venue: validBody.venue,
      year: '2026',
      date: new Date('2026-01-01'),
      abstract: validBody.abstract,
      href: validBody.DOI,
      researchGroup: validBody.researchGroup,
    }

    mocks.createPublication.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)

    expect(await response.json()).toEqual({
      publication: {
        ...created,
        date: created.date.toISOString(),
      },
    })

    expect(mocks.createPublication).toHaveBeenCalledWith({
      ...validBody,
      date: new Date('2026-01-01'),
    })
  })
})
