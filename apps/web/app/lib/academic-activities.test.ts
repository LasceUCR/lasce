import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@lasce/db', () => ({
  prisma: {
    academicActivity: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}))

import {
  academicActivityInputSchema,
  createAcademicActivity,
  deleteAcademicActivity,
  getAcademicActivities,
  updateAcademicActivity,
} from './academic-activities'

const row = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Taller de prueba',
  category: 'Taller',
  startDate: new Date('2026-02-16T00:00:00.000Z'),
  endDate: new Date('2026-02-20T00:00:00.000Z'),
  location: 'San José, Costa Rica',
  description: 'Descripción.',
  photoUrl: '/images/mock.jpg',
  photoAlt: 'Texto alternativo.',
}

const input = {
  title: 'Taller de prueba',
  category: 'Taller',
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  description: 'Descripción.',
  photoUrl: '/images/mock.jpg',
  photoAlt: 'Texto alternativo.',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('academic-activities', () => {
  test('loads activities ordered by most recent start date and formats the date range', async () => {
    mocks.findMany.mockResolvedValue([row])

    const activities = await getAcademicActivities()

    expect(mocks.findMany).toHaveBeenCalledWith({ orderBy: { startDate: 'desc' } })
    expect(activities).toEqual([
      {
        id: row.id,
        title: row.title,
        category: row.category,
        date: '16-20 febrero, 2026',
        startDate: '2026-02-16',
        endDate: '2026-02-20',
        location: row.location,
        description: row.description,
        photoUrl: row.photoUrl,
        photoAlt: row.photoAlt,
      },
    ])
  })

  test('formats a single-day activity as one date, with no range and no endDate', async () => {
    mocks.findMany.mockResolvedValue([{ ...row, endDate: null }])

    const [activity] = await getAcademicActivities()

    expect(activity?.date).toBe('16 de febrero de 2026')
    expect(activity?.endDate).toBeNull()
  })

  test('rejects an input missing a required field', () => {
    const result = academicActivityInputSchema.safeParse({ ...input, title: '' })
    expect(result.success).toBe(false)
  })

  test('accepts an input with no end date', () => {
    const result = academicActivityInputSchema.safeParse({ ...input, endDate: null })
    expect(result.success).toBe(true)
  })

  test('creates a new activity, stamped with the admin who submitted it', async () => {
    mocks.create.mockResolvedValue(row)

    const activity = await createAcademicActivity(input, 'admin-1')

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        title: input.title,
        category: input.category,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        location: input.location,
        description: input.description,
        photoUrl: input.photoUrl,
        photoAlt: input.photoAlt,
        modifiedBy: 'admin-1',
      },
    })
    expect(activity.id).toBe(row.id)
  })

  test('updates an existing activity and stamps modifiedBy', async () => {
    mocks.findUnique.mockResolvedValue({ id: row.id })
    mocks.update.mockResolvedValue(row)

    const activity = await updateAcademicActivity(row.id, input, 'admin-1')

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: row.id },
      data: expect.objectContaining({ modifiedBy: 'admin-1' }),
    })
    expect(activity?.id).toBe(row.id)
  })

  test('returns null without updating a missing activity', async () => {
    mocks.findUnique.mockResolvedValue(null)

    await expect(updateAcademicActivity(row.id, input, 'admin-1')).resolves.toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  test('deletes an existing activity', async () => {
    mocks.findUnique.mockResolvedValue({ id: row.id })

    await expect(deleteAcademicActivity(row.id)).resolves.toBe(true)
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: row.id } })
  })

  test('returns false without deleting a missing activity', async () => {
    mocks.findUnique.mockResolvedValue(null)

    await expect(deleteAcademicActivity(row.id)).resolves.toBe(false)
    expect(mocks.delete).not.toHaveBeenCalled()
  })
})
