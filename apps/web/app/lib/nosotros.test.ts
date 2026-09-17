import { beforeEach, describe, expect, test, vi } from 'vitest'

const findMany = vi.fn()
const findUnique = vi.fn()
const update = vi.fn()
const create = vi.fn()
const del = vi.fn()

vi.mock('@lasce/db', () => ({
  prisma: { nosotrosActivity: { findMany, findUnique, update, create, delete: del } },
}))

const {
  createNosotrosActivity,
  deleteNosotrosActivity,
  getNosotrosActivities,
  nosotrosActivityInputSchema,
  updateNosotrosActivity,
} = await import('./nosotros')

function activityRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'activity-1',
    icon: 'SUN',
    title: 'Fenómenos solares eruptivos',
    paragraph: "Analizamos fenómenos solares eruptivos, como 'flares'.",
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getNosotrosActivities', () => {
  test('maps each row to the public shape, lowercasing the icon', async () => {
    findMany.mockResolvedValue([activityRow()])

    const activities = await getNosotrosActivities()

    expect(activities).toEqual([
      {
        id: 'activity-1',
        icon: 'sun',
        title: 'Fenómenos solares eruptivos',
        description: "Analizamos fenómenos solares eruptivos, como 'flares'.",
        modifiedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  test('orders by createdAt, so editing a card never reorders it', async () => {
    findMany.mockResolvedValue([])

    await getNosotrosActivities()

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } })
  })
})

describe('nosotrosActivityInputSchema', () => {
  test('accepts a well-formed input', () => {
    const result = nosotrosActivityInputSchema.safeParse({
      icon: 'waves',
      title: 'Nuevo título',
      description: 'Nuevo texto',
    })

    expect(result.success).toBe(true)
  })

  test('rejects an unknown icon', () => {
    const result = nosotrosActivityInputSchema.safeParse({
      icon: 'moon',
      title: 'Nuevo título',
      description: 'Nuevo texto',
    })

    expect(result.success).toBe(false)
  })

  test('rejects an empty title or description', () => {
    const result = nosotrosActivityInputSchema.safeParse({
      icon: 'sun',
      title: '  ',
      description: '  ',
    })

    expect(result.success).toBe(false)
  })
})

describe('updateNosotrosActivity', () => {
  const updateInput = { icon: 'waves' as const, title: 'Nuevo título', description: 'Nuevo texto' }

  test('returns null without writing when the id does not exist', async () => {
    findUnique.mockResolvedValue(null)

    const result = await updateNosotrosActivity('missing-id', updateInput, 'admin-1')

    expect(result).toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  test('persists the change and stamps modifiedBy with the given user', async () => {
    findUnique.mockResolvedValue(activityRow())
    update.mockResolvedValue(
      activityRow({ icon: 'WAVES', title: 'Nuevo título', paragraph: 'Nuevo texto' }),
    )

    const result = await updateNosotrosActivity('activity-1', updateInput, 'admin-1')

    expect(update).toHaveBeenCalledWith({
      where: { id: 'activity-1' },
      data: {
        icon: 'WAVES',
        title: 'Nuevo título',
        paragraph: 'Nuevo texto',
        modifiedBy: 'admin-1',
      },
    })
    expect(result).toEqual({
      id: 'activity-1',
      icon: 'waves',
      title: 'Nuevo título',
      description: 'Nuevo texto',
      modifiedAt: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('createNosotrosActivity', () => {
  test('creates the activity, authored by the given user', async () => {
    const createInput = { icon: 'code' as const, title: 'Actividad nueva', description: 'Texto' }
    create.mockResolvedValue(
      activityRow({ icon: 'CODE', title: 'Actividad nueva', paragraph: 'Texto' }),
    )

    const result = await createNosotrosActivity(createInput, 'admin-1')

    expect(create).toHaveBeenCalledWith({
      data: {
        icon: 'CODE',
        title: 'Actividad nueva',
        paragraph: 'Texto',
        modifiedBy: 'admin-1',
      },
    })
    expect(result).toEqual({
      id: 'activity-1',
      icon: 'code',
      title: 'Actividad nueva',
      description: 'Texto',
      modifiedAt: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('deleteNosotrosActivity', () => {
  test('returns false without deleting when the id does not exist', async () => {
    findUnique.mockResolvedValue(null)

    const result = await deleteNosotrosActivity('missing-id')

    expect(result).toBe(false)
    expect(del).not.toHaveBeenCalled()
  })

  test('deletes the row and returns true when it exists', async () => {
    findUnique.mockResolvedValue(activityRow())

    const result = await deleteNosotrosActivity('activity-1')

    expect(del).toHaveBeenCalledWith({ where: { id: 'activity-1' } })
    expect(result).toBe(true)
  })
})
