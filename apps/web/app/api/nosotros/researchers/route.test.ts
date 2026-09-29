import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NosotrosLib from '@/app/lib/nosotros'

const mocks = vi.hoisted(() => ({
  getNosotrosResearchers: vi.fn(),
  createNosotrosResearcher: vi.fn(),
  requireApiPermission: vi.fn(),
}))

// `@/app/lib/nosotros` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded
// below (via `importOriginal`) so `nosotrosResearcherInputSchema` stays real,
// but with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/nosotros', async (importOriginal) => {
  const original = await importOriginal<typeof NosotrosLib>()
  return {
    ...original,
    getNosotrosResearchers: mocks.getNosotrosResearchers,
    createNosotrosResearcher: mocks.createNosotrosResearcher,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { GET, POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  src: '/images/Researchers/New.jpg',
  role: 'Investigador colaborador',
  name: 'Persona Nueva',
  institution: 'UCR',
  description: 'Texto de prueba.',
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/nosotros/researchers', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse() {
  return new Response(JSON.stringify({ error: 'denied' }), { status: 401 })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/nosotros/researchers', () => {
  test('returns the researchers as never-cached JSON', async () => {
    const researchers = [
      {
        id: '1',
        src: '/images/ROSAC/team/CarolinaSalas.jpg',
        role: 'Investigadora principal',
        name: 'Dra. Carolina Salas Matamoros',
        institution: 'CINESPA, UCR',
        description: 'Texto.',
      },
    ]
    mocks.getNosotrosResearchers.mockResolvedValue(researchers)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ researchers })
  })
})

describe('POST /api/nosotros/researchers', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse()
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest({ ...validBody, name: '', src: '' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toMatchObject({
      name: expect.any(Array),
      src: expect.any(Array),
    })
    expect(mocks.createNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('accepts a body with no description — it is optional here', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const { description: _description, ...bodyWithoutDescription } = validBody
    mocks.createNosotrosResearcher.mockResolvedValue({ id: 'new-1', ...bodyWithoutDescription })

    const response = await POST(postRequest(bodyWithoutDescription))

    expect(response.status).toBe(201)
  })

  test('creates the researcher, authored by the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = { id: 'new-1', ...validBody }
    mocks.createNosotrosResearcher.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ researcher: created })
    expect(mocks.createNosotrosResearcher).toHaveBeenCalledWith(validBody, adminUser.id)
  })
})
