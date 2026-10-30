import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  getRosacAcknowledgments: vi.fn(),
  createRosacAcknowledgment: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    getRosacAcknowledgments: mocks.getRosacAcknowledgments,
    createRosacAcknowledgment: mocks.createRosacAcknowledgment,
  }
})

import { GET, POST } from './route'

const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  name: 'CINESPA UCR',
  href: 'https://cinespa.ucr.ac.cr',
  logo: {
    src: '/images/cinespa.webp',
    alt: 'Logo CINESPA',
  },
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/rosac/acknowledgments', {
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

describe('GET /api/rosac/acknowledgments', () => {
  test('returns list of acknowledgments', async () => {
    const acknowledgments = [{ id: 'ack-1', name: 'CINESPA' }]
    mocks.getRosacAcknowledgments.mockResolvedValue(acknowledgments)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ acknowledgments })
  })
})

describe('POST /api/rosac/acknowledgments', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createRosacAcknowledgment).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(postRequest('not json'))

    expect(response.status).toBe(400)
    expect(mocks.createRosacAcknowledgment).not.toHaveBeenCalled()
  })

  test('rejects javascript: URL in href', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await POST(
      postRequest({
        ...validBody,
        href: 'javascript:alert("exploit")',
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.createRosacAcknowledgment).not.toHaveBeenCalled()
  })

  test('creates acknowledgment and returns 201 with created object', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const created = { id: '00000000-0000-0000-0000-000000000002', ...validBody }
    mocks.createRosacAcknowledgment.mockResolvedValue(created)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ acknowledgment: created })
    expect(mocks.createRosacAcknowledgment).toHaveBeenCalledWith(validBody)
  })
})
