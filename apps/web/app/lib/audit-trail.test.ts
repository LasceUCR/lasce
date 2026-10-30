import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  eventFindMany: vi.fn(),
  userFindMany: vi.fn(),
  userHasPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({
  prisma: {
    auditEvent: { count: mocks.count, findMany: mocks.eventFindMany },
    user: { findMany: mocks.userFindMany },
  },
}))
vi.mock('./auth/authorization', () => ({ userHasPermission: mocks.userHasPermission }))

import { AUDIT_PAGE_SIZE, getAuditTrailPage, normalizeAuditFilters } from './audit-trail'

const actorId = '0a7d5a3e-5a0c-4a55-8a53-4f6b1c0f7a11'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    action: 'news.create',
    summary: 'Noticia agregada: Aurora',
    actorType: 'user',
    entityType: 'news',
    createdAt: new Date('2026-10-16T18:00:00.000Z'),
    actor: { fullName: 'Ana' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.userHasPermission.mockResolvedValue(true)
  mocks.count.mockResolvedValue(0)
  mocks.userFindMany.mockResolvedValue([])
  mocks.eventFindMany.mockResolvedValue([])
})

describe('getAuditTrailPage', () => {
  test('refuses an account without the audit grant and reads nothing', async () => {
    mocks.userHasPermission.mockResolvedValue(false)

    await expect(getAuditTrailPage(1)).rejects.toThrow('Unauthorized')
    expect(mocks.userHasPermission).toHaveBeenCalledWith('view_audit_log')
    expect(mocks.count).not.toHaveBeenCalled()
    expect(mocks.eventFindMany).not.toHaveBeenCalled()
  })

  test('fetches only the 10 newest events of the page asked for', async () => {
    mocks.count.mockResolvedValue(25)

    const trail = await getAuditTrailPage(3)

    expect(AUDIT_PAGE_SIZE).toBe(10)
    expect(trail).toMatchObject({ page: 3, totalPages: 3, totalItems: 25 })
    expect(mocks.eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 10,
      }),
    )
  })

  test('brings a page past the end back to the last page', async () => {
    mocks.count.mockResolvedValue(12)

    expect((await getAuditTrailPage(99)).page).toBe(2)
  })

  test('maps events, naming the actor only for accounts that still exist', async () => {
    mocks.count.mockResolvedValue(2)
    mocks.eventFindMany.mockResolvedValueOnce([
      row(),
      row({ id: 'e2', actor: null }),
      row({ id: 'e3', actorType: 'worker', actor: null }),
    ])

    const { items } = await getAuditTrailPage(1)

    expect(items.map((item) => [item.actorType, item.actorName])).toEqual([
      ['user', 'Ana'],
      ['user', null],
      ['worker', null],
    ])
    expect(items[0]).toMatchObject({ entityType: 'news', occurredAt: '2026-10-16T18:00:00.000Z' })
  })

  test('narrows the query by date range in Costa Rica time, actor, type and action', async () => {
    await getAuditTrailPage(1, {
      from: '2026-10-01',
      to: '2026-10-31',
      actor: actorId,
      entityType: 'news',
      action: 'news.create',
    })

    expect(mocks.count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date('2026-10-01T06:00:00.000Z'),
          lt: new Date('2026-11-01T06:00:00.000Z'),
        },
        actorId,
        entityType: 'news',
        action: 'news.create',
      },
    })
  })

  test('offers only the actors, types and actions that occur in the trail', async () => {
    mocks.userFindMany.mockResolvedValue([{ id: actorId, fullName: 'Ana' }])
    mocks.eventFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ entityType: 'news' }, { entityType: null }])
      .mockResolvedValueOnce([{ action: 'news.create' }])

    const { options } = await getAuditTrailPage(1)

    expect(options).toEqual({
      actors: [{ id: actorId, name: 'Ana' }],
      entityTypes: ['news'],
      actions: ['news.create'],
    })
  })
})

describe('normalizeAuditFilters', () => {
  test('drops values that are not dates, ids or identifiers', () => {
    expect(
      normalizeAuditFilters({
        from: 'yesterday',
        to: '2026-13-45',
        actor: 'not-a-uuid',
        entityType: 'News; DROP',
        action: 'NEWS',
      }),
    ).toEqual({ from: '', to: '', actor: '', entityType: '', action: '' })
  })
})
