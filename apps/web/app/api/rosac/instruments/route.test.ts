import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  getRosacInstruments: vi.fn(),
  createRosacInstrument: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    getRosacInstruments: mocks.getRosacInstruments,
    createRosacInstrument: mocks.createRosacInstrument,
  }
})

import { GET, POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  name: 'Espectrómetro Solar',
  pendingMessage: 'En calibración',
  consultation: {
    label: 'Consultar datos',
    href: 'https://ejemplo.ucr.ac.cr/datos',
  },
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/rosac/instruments', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/rosac/instruments', () => {
  test('returns list of instruments', async () => {
    const instruments = [{ id: 'inst-1', name: 'Polarímetro' }]
    mocks.getRosacInstruments.mockResolvedValue(instruments)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ instruments })
  })
})

describe('POST /api/rosac/instruments', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createRosacInstrument).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createRosacInstrument).not.toHaveBeenCalled()
  })

  test('rejects invalid or javascript: consultation href', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({
        ...validBody,
        consultation: { label: 'Consultar', href: 'javascript:alert(1)' },
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.createRosacInstrument).not.toHaveBeenCalled()
  })

  test('creates instrument and returns 201 with created object', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = { id: '00000000-0000-0000-0000-000000000001', ...validBody }
    mocks.createRosacInstrument.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ instrument: created })
    expect(mocks.createRosacInstrument).toHaveBeenCalledWith(validBody)
  })
})
