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
vi.mock('@/app/lib/scientific-tool-writes', () => ({
  createScientificTool: mocks.create,
  updateScientificTool: mocks.update,
  deleteScientificTool: mocks.remove,
}))
vi.mock('@/app/lib/scientific-tool-records', () => ({ getScientificToolRecords: mocks.list }))
vi.mock('next-intl/server', () => ({ getLocale: async () => 'en' }))

import { GET, POST } from './route'
import { DELETE, PATCH } from './[id]/route'

const id = '38300000-0000-4000-8000-000000000001'
const context = { params: Promise.resolve({ id }) }
const user = { id: 'admin-1', role: 'ADMIN' }
const body = {
  name: 'SWAAT',
  accessUrl: 'https://swaat.example.com/',
  content: { es: { description: 'Análisis.' }, en: { description: 'Analysis.' } },
}
const version = '2026-11-13T12:00:00.000Z'

function request(method: string, data?: unknown) {
  return new Request('http://localhost/api/scientific-tools', {
    method,
    ...(data === undefined ? {} : { body: typeof data === 'string' ? data : JSON.stringify(data) }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.guard.mockResolvedValue({ ok: true, user })
  mocks.create.mockResolvedValue({ ok: true, value: { id } })
  mocks.update.mockResolvedValue({ ok: true, value: { id } })
  mocks.remove.mockResolvedValue(true)
  mocks.list.mockResolvedValue([{ id, name: 'SWAAT' }])
})

describe('scientific tools API', () => {
  test('serves the tools in the request language without editing data', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ tools: [{ id, name: 'SWAAT' }] })
    expect(mocks.list).toHaveBeenCalledWith('en')
  })

  test('reports a failed read without exposing the database error', async () => {
    mocks.list.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await GET()
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('connection refused')
  })

  test.each([401, 403])('rejects every write with status %s and stores nothing', async (status) => {
    mocks.guard.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Denied' }, { status }),
    })
    expect((await POST(request('POST', body))).status).toBe(status)
    expect((await PATCH(request('PATCH', { version, name: 'X' }), context)).status).toBe(status)
    expect((await DELETE(request('DELETE'), context)).status).toBe(status)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  test('checks the grant that matches each write', async () => {
    await POST(request('POST', body))
    await PATCH(request('PATCH', { version, name: 'X' }), context)
    await DELETE(request('DELETE'), context)
    expect(mocks.guard.mock.calls).toEqual([
      ['create_components'],
      ['edit_components'],
      ['delete_components'],
    ])
  })

  test('creates a valid tool on behalf of the signed-in editor', async () => {
    const response = await POST(request('POST', body))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ tool: { id } })
    expect(mocks.create).toHaveBeenCalledWith({ ...body, imageUrl: null }, user)
  })

  test('rejects malformed JSON and invalid fields with the field paths', async () => {
    expect((await POST(request('POST', '{'))).status).toBe(400)
    const response = await POST(request('POST', { ...body, accessUrl: 'http://swaat.test' }))
    expect(response.status).toBe(400)
    expect((await response.json()).issues).toEqual([
      { path: 'accessUrl', message: expect.any(String) },
    ])
    expect(mocks.create).not.toHaveBeenCalled()
  })

  test('maps update failures to their status codes', async () => {
    const patch = () => PATCH(request('PATCH', { version, name: 'X' }), context)
    expect((await patch()).status).toBe(200)
    mocks.update.mockResolvedValueOnce({ ok: false, reason: 'not-found' })
    expect((await patch()).status).toBe(404)
    mocks.update.mockResolvedValueOnce({ ok: false, reason: 'conflict' })
    expect((await patch()).status).toBe(409)
    mocks.update.mockResolvedValueOnce({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'description' }],
    })
    const review = await patch()
    expect(review.status).toBe(400)
    expect((await review.json()).code).toBe('review-required')
    mocks.update.mockRejectedValueOnce(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await patch()).status).toBe(500)
  })

  test('rejects an invalid id or an empty update before writing', async () => {
    const invalid = { params: Promise.resolve({ id: 'not-a-uuid' }) }
    expect((await PATCH(request('PATCH', { version, name: 'X' }), invalid)).status).toBe(400)
    expect((await DELETE(request('DELETE'), invalid)).status).toBe(400)
    expect((await PATCH(request('PATCH', { version }), context)).status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  test('deletes a tool, and reports one that is already gone', async () => {
    const deleted = await DELETE(request('DELETE'), context)
    expect(deleted.status).toBe(204)
    expect(mocks.remove).toHaveBeenCalledWith(id, user)
    mocks.remove.mockResolvedValueOnce(false)
    expect((await DELETE(request('DELETE'), context)).status).toBe(404)
  })
})
