import { beforeEach, describe, expect, test, vi } from 'vitest'

const { create, findMany } = vi.hoisted(() => ({ create: vi.fn(), findMany: vi.fn() }))
vi.mock('@lasce/db', () => ({ prisma: { auditEvent: { create, findMany } } }))

import { RECENT_ACTIVITY_LIMIT, getRecentActivity, recordAuditEvent } from './audit-log'

const userId = 'ce0bcbba-04bd-4f14-b5d6-9c9db5f6ed74'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('recordAuditEvent', () => {
  test('appends an event done by an account', async () => {
    await recordAuditEvent({
      action: 'publication.create',
      summary: 'Publicación agregada: Solar flares in 2026',
      actorType: 'user',
      actorId: userId,
      entityType: 'publication',
      entityId: '42',
      metadata: { fields: ['title'] },
    })

    expect(create).toHaveBeenCalledWith({
      data: {
        action: 'publication.create',
        summary: 'Publicación agregada: Solar flares in 2026',
        actorType: 'user',
        actorId: userId,
        entityType: 'publication',
        entityId: '42',
        metadata: { fields: ['title'] },
      },
    })
  })

  test('stores no account and no entity for a system event', async () => {
    await recordAuditEvent({
      action: 'schedule.register',
      summary: 'Tareas programadas registradas',
      actorType: 'system',
    })

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: null, entityType: null, entityId: null }),
    })
  })

  test('writes through the transaction it is given', async () => {
    const tx = { auditEvent: { create: vi.fn() } }

    await recordAuditEvent(
      { action: 'news.delete', summary: 'Noticia eliminada', actorType: 'user', actorId: userId },
      tx as never,
    )

    expect(tx.auditEvent.create).toHaveBeenCalledOnce()
    expect(create).not.toHaveBeenCalled()
  })

  test.each(['create', 'Publication.create', 'publication.', 'publication create'])(
    'refuses the action "%s", which is not <entity>.<verb>',
    async (action) => {
      await expect(recordAuditEvent({ action, summary: 'x', actorType: 'system' })).rejects.toThrow(
        'expected "<entity>.<verb>"',
      )
      expect(create).not.toHaveBeenCalled()
    },
  )

  test('rejects when the write fails, so the caller can decide', async () => {
    create.mockRejectedValue(new Error('connection lost'))

    await expect(
      recordAuditEvent({ action: 'user.login', summary: 'x', actorType: 'user', actorId: userId }),
    ).rejects.toThrow('connection lost')
  })
})

describe('getRecentActivity', () => {
  test('reads the newest events, as many as the summary shows', async () => {
    findMany.mockResolvedValue([])

    await expect(getRecentActivity()).resolves.toEqual([])
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, take: RECENT_ACTIVITY_LIMIT }),
    )
  })

  test('maps each row to what the panel shows', async () => {
    findMany.mockResolvedValue([
      {
        id: 'a',
        action: 'publication.create',
        summary: 'Publicación agregada',
        actorType: 'user',
        createdAt: new Date('2026-10-16T17:48:00.000Z'),
        actor: { fullName: 'Ana Rodríguez' },
      },
      {
        id: 'b',
        action: 'user.role_change',
        summary: 'Rol actualizado',
        actorType: 'user',
        createdAt: new Date('2026-10-16T15:00:00.000Z'),
        actor: null,
      },
      {
        id: 'c',
        action: 'legacy.event',
        summary: 'Evento',
        actorType: 'robot',
        createdAt: new Date('2026-10-14T18:00:00.000Z'),
        actor: null,
      },
    ])

    expect(await getRecentActivity(3)).toEqual([
      {
        id: 'a',
        action: 'publication.create',
        summary: 'Publicación agregada',
        actorType: 'user',
        actorName: 'Ana Rodríguez',
        occurredAt: '2026-10-16T17:48:00.000Z',
      },
      {
        id: 'b',
        action: 'user.role_change',
        summary: 'Rol actualizado',
        actorType: 'user',
        actorName: null,
        occurredAt: '2026-10-16T15:00:00.000Z',
      },
      {
        id: 'c',
        action: 'legacy.event',
        summary: 'Evento',
        actorType: 'system',
        actorName: null,
        occurredAt: '2026-10-14T18:00:00.000Z',
      },
    ])
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }))
  })
})
