import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
}))
vi.mock('@/app/lib/auth/apiGuard', () => ({ requireApiPermission: mocks.guard }))
vi.mock('@/app/lib/collaboration-writes', () => ({
  createCollaboration: mocks.create,
  updateCollaboration: mocks.update,
  deleteCollaboration: mocks.remove,
}))
vi.mock('@/app/lib/collaboration-records', () => ({ getCollaborationRecords: mocks.list }))
vi.mock('next-intl/server', () => ({ getLocale: async () => 'en' }))

import { GET, POST } from './route'
import { DELETE, PATCH } from './[id]/route'

const id = '00000000-0000-4000-8000-000000000001'
const context = { params: Promise.resolve({ id }) }
const body = {
  name: 'Partner',
  scope: 'national',
  content: { es: { country: 'Costa Rica' }, en: { country: 'Costa Rica' } },
}
const version = '2026-10-14T12:00:00.000Z'
function request(method: string, data?: unknown) {
  return new Request('http://localhost/api/collaborations', {
    method,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.guard.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.create.mockResolvedValue({ ok: true, value: { id } })
  mocks.update.mockResolvedValue({ ok: true, value: { id } })
  mocks.remove.mockResolvedValue(true)
  mocks.list.mockResolvedValue([{ id, name: 'Partner' }])
})

describe('collaboration API', () => {
  test('serves localized public data without requesting editing metadata or caching it', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith('en')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  test.each([401, 403])(
    'denies every write with status %s before accessing persistence',
    async (status) => {
      mocks.guard.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: 'Denied' }, { status }),
      })
      expect((await POST(request('POST', body))).status).toBe(status)
      expect((await PATCH(request('PATCH', { version, name: 'Changed' }), context)).status).toBe(
        status,
      )
      expect((await DELETE(request('DELETE'), context)).status).toBe(status)
      expect(mocks.create).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
      expect(mocks.remove).not.toHaveBeenCalled()
      expect(mocks.guard.mock.calls.map(([permission]) => permission)).toEqual([
        'create_components',
        'edit_components',
        'delete_components',
      ])
    },
  )
  test('creates, updates and deletes with the corresponding permissions and success statuses', async () => {
    expect((await POST(request('POST', body))).status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith(
      {
        ...body,
        acronym: null,
        websiteUrl: null,
      },
      expect.objectContaining({ id: 'admin-1' }),
    )
    expect((await PATCH(request('PATCH', { version, acronym: '' }), context)).status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(
      id,
      { version, acronym: null },
      expect.objectContaining({ id: 'admin-1' }),
    )
    expect((await DELETE(request('DELETE'), context)).status).toBe(204)
  })
  test('rejects malformed JSON, missing fields, unsafe links and invalid ids without writes', async () => {
    const malformed = new Request('http://localhost/api/collaborations', {
      method: 'POST',
      body: '{',
    })
    expect((await POST(malformed)).status).toBe(400)
    const invalid = await POST(
      request('POST', { ...body, name: ' ', websiteUrl: 'javascript:alert(1)' }),
    )
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({
      code: 'invalid-body',
      issues: expect.arrayContaining([expect.objectContaining({ path: 'name' })]),
    })
    expect((await PATCH(request('PATCH', { version }), context)).status).toBe(400)
    const badId = { params: Promise.resolve({ id: 'invalid' }) }
    expect((await PATCH(request('PATCH', { version, name: 'Changed' }), badId)).status).toBe(400)
    expect((await DELETE(request('DELETE'), badId)).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  test.each([
    [{ ok: false, reason: 'not-found' }, 404],
    [{ ok: false, reason: 'conflict' }, 409],
    [{ ok: false, reason: 'review-required', pending: [{ locale: 'en', field: 'country' }] }, 400],
  ])('maps expected persistence failures %j', async (failure, status) => {
    mocks.update.mockResolvedValue(failure)
    const result = await PATCH(request('PATCH', { version, name: 'Changed' }), context)
    expect(result.status).toBe(status)
    expect(await result.json()).toMatchObject({ code: failure.reason })
  })
  test('reports missing deletes and hides database details for every unexpected failure', async () => {
    mocks.remove.mockResolvedValue(false)
    expect((await DELETE(request('DELETE'), context)).status).toBe(404)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    for (const fn of [mocks.create, mocks.update, mocks.remove, mocks.list])
      fn.mockRejectedValue(new Error('private database detail'))
    const responses = await Promise.all([
      GET(),
      POST(request('POST', body)),
      PATCH(request('PATCH', { version, name: 'Changed' }), context),
      DELETE(request('DELETE'), context),
    ])
    for (const response of responses) {
      expect(response.status).toBe(500)
      expect(await response.text()).not.toContain('private database detail')
    }
    log.mockRestore()
  })
})
