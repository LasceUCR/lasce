import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as NosotrosLib from '@/app/lib/nosotros'

const mocks = vi.hoisted(() => ({
  getNosotrosResearchers: vi.fn(),
  createNosotrosResearcher: vi.fn(),
  requireApiPermission: vi.fn(),
  getLocale: vi.fn(),
}))

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

// The real schemas are kept (via `importOriginal` above), and the module that defines them
// imports `prisma` at load time — stub it out so loading it doesn't also require a live
// DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

// The GET handler reads the request's language through next-intl.
vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }))

import { GET, POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  src: '/images/Researchers/User.png',
  name: 'Dra. Ada Lovelace',
  email: 'ada@ucr.ac.cr',
  institution: 'Universidad de Costa Rica',
  content: {
    es: { role: 'Investigadora', description: 'Estudia el clima espacial.' },
    en: { role: 'Researcher', description: 'Studies space weather.' },
  },
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/nosotros/researchers', {
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

describe('GET /api/nosotros/researchers', () => {
  const researchers = [
    {
      id: '1',
      src: '/images/Researchers/User.png',
      name: 'Dra. Ada Lovelace',
      role: 'Investigadora',
      institution: 'Universidad de Costa Rica',
      contentLocale: 'es',
    },
  ]

  test('returns the researchers as never-cached JSON', async () => {
    mocks.getNosotrosResearchers.mockResolvedValue(researchers)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ researchers })
  })

  test('reads the researchers in the language of the request, without editing data', async () => {
    mocks.getLocale.mockResolvedValue('en')
    mocks.getNosotrosResearchers.mockResolvedValue([])

    await GET()

    expect(mocks.getNosotrosResearchers).toHaveBeenCalledWith('en')
  })
})

describe('POST /api/nosotros/researchers', () => {
  test('rejects a request the create_components guard denies', async () => {
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
    expect((await response.json()).code).toBe('invalid-json')
    expect(mocks.createNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('rejects a body missing a language, listing the fields by path', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({
        ...validBody,
        content: {
          es: { role: 'Investigadora', description: null },
          en: { role: '', description: null },
        },
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('invalid-body')
    expect(body.issues).toEqual([
      { path: 'content.en.role', message: 'El rol en inglés es obligatorio.' },
    ])
    expect(mocks.createNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('rejects the former flat body', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({
        src: validBody.src,
        name: validBody.name,
        institution: validBody.institution,
        role: 'Investigadora',
        description: 'Estudia el clima espacial.',
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.createNosotrosResearcher).not.toHaveBeenCalled()
  })

  test('creates the researcher, authored by the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = { id: 'new-1', name: validBody.name }
    mocks.createNosotrosResearcher.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ researcher: created })
    expect(mocks.createNosotrosResearcher).toHaveBeenCalledWith(
      { ...validBody, email: ['ada@ucr.ac.cr'] },
      adminUser.id,
    )
  })

  test('accepts a body with no photo — it is optional', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createNosotrosResearcher.mockResolvedValue({ id: 'new-1', src: '' })
    const { src: _src, ...withoutPhoto } = validBody

    const response = await POST(postRequest(withoutPhoto))

    expect(response.status).toBe(201)
    expect(mocks.createNosotrosResearcher).toHaveBeenCalledWith(
      { ...withoutPhoto, email: ['ada@ucr.ac.cr'] },
      adminUser.id,
    )
  })

  test('answers an unexpected failure without exposing its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createNosotrosResearcher.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'No se pudo guardar el investigador.',
      code: 'internal-error',
    })
  })
})
