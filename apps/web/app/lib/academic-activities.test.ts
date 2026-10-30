import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    academicActivity: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    academicActivityTranslation: { upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
  }

  const prisma = {
    academicActivity: { findMany: vi.fn() },
    $transaction: vi.fn(),
  }

  return { tx, prisma }
})

vi.mock('@lasce/db', () => ({ prisma: mocks.prisma }))

const { tx, prisma } = mocks

const {
  academicActivityContent,
  academicActivityCreateSchema,
  academicActivityUpdateSchema,
  createAcademicActivity,
  deleteAcademicActivity,
  getAcademicActivities,
  updateAcademicActivity,
} = await import('./academic-activities')

const VERSION = '2026-01-01T00:00:00.000Z'

function activityRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'activity-1',
    title: 'Taller de prueba',
    category: 'Taller',
    startDate: new Date('2026-02-16T00:00:00.000Z'),
    endDate: new Date('2026-02-20T00:00:00.000Z'),
    location: 'San José, Costa Rica',
    description: 'Descripción.',
    photoUrl: '/images/mock.jpg',
    photoAlt: 'Texto alternativo.',
    modifiedAt: new Date(VERSION),
    translations: [],
    ...overrides,
  }
}

const bilingualRow = activityRow({
  translations: [
    {
      locale: 'en',
      title: 'Test workshop',
      category: 'Workshop',
      description: 'Description.',
      photoAlt: 'Alt text.',
    },
  ],
})

const bilingualContent = {
  es: {
    title: 'Taller de prueba',
    category: 'Taller',
    description: 'Descripción.',
    photoAlt: 'Texto alternativo.',
  },
  en: {
    title: 'Test workshop',
    category: 'Workshop',
    description: 'Description.',
    photoAlt: 'Alt text.',
  },
}

const createInput = {
  content: bilingualContent,
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  photoUrl: '/images/mock.jpg',
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
  tx.academicActivity.create.mockResolvedValue(bilingualRow)
  tx.academicActivity.findUnique.mockResolvedValue({
    title: bilingualContent.es.title,
    category: bilingualContent.es.category,
    description: bilingualContent.es.description,
    photoAlt: bilingualContent.es.photoAlt,
    modifiedAt: new Date(VERSION),
    translations: bilingualRow.translations,
  })
  tx.academicActivity.updateMany.mockResolvedValue({ count: 1 })
  tx.academicActivity.deleteMany.mockResolvedValue({ count: 1 })
  tx.academicActivity.findUniqueOrThrow.mockResolvedValue(bilingualRow)
})

const actor = { id: 'admin-1' }

describe('getAcademicActivities', () => {
  test('loads activities ordered by most recent start date and formats the date range', async () => {
    prisma.academicActivity.findMany.mockResolvedValue([bilingualRow])

    const activities = await getAcademicActivities()

    expect(prisma.academicActivity.findMany).toHaveBeenCalledWith({
      orderBy: { startDate: 'desc' },
      include: expect.any(Object),
    })
    expect(activities).toMatchObject([
      {
        id: 'activity-1',
        title: 'Taller de prueba',
        category: 'Taller',
        date: '16-20 febrero, 2026',
        startDate: '2026-02-16',
        endDate: '2026-02-20',
        location: 'San José, Costa Rica',
        description: 'Descripción.',
        photoUrl: '/images/mock.jpg',
        photoAlt: 'Texto alternativo.',
        contentLocale: 'es',
      },
    ])
  })

  test('formats a single-day activity as one date, with no range and no endDate', async () => {
    prisma.academicActivity.findMany.mockResolvedValue([activityRow({ endDate: null })])

    const [activity] = await getAcademicActivities()

    expect(activity?.date).toBe('16 de febrero de 2026')
    expect(activity?.endDate).toBeNull()
  })

  test('shows the English translation and formats the range without the Spanish comma', async () => {
    prisma.academicActivity.findMany.mockResolvedValue([bilingualRow])

    const [activity] = await getAcademicActivities('en')

    expect(activity?.title).toBe('Test workshop')
    expect(activity?.date).toBe('16-20 February 2026')
    expect(activity?.contentLocale).toBe('en')
  })

  test('falls back to the base text, as a legacy record, when there is no translation', async () => {
    prisma.academicActivity.findMany.mockResolvedValue([activityRow()])

    const [activity] = await getAcademicActivities('en')

    expect(activity?.title).toBe('Taller de prueba')
    expect(activity?.contentLocale).toBeNull()
  })

  test('includes editing data, both languages and the version, only when asked', async () => {
    prisma.academicActivity.findMany.mockResolvedValue([bilingualRow])

    const [withEditing] = await getAcademicActivities('es', { includeEditingData: true })
    const [withoutEditing] = await getAcademicActivities('es')

    expect(withEditing?.editing).toMatchObject({ isLegacy: false, version: VERSION })
    expect(withEditing?.editing?.content.en).not.toBeNull()
    expect(withoutEditing?.editing).toBeUndefined()
  })
})

describe('academicActivityCreateSchema', () => {
  test('rejects a request missing a required field in one language', () => {
    const result = academicActivityCreateSchema.safeParse({
      ...createInput,
      content: { ...createInput.content, en: { ...createInput.content.en, title: '' } },
    })
    expect(result.success).toBe(false)
  })

  test('accepts a request with no end date', () => {
    const result = academicActivityCreateSchema.safeParse({ ...createInput, endDate: null })
    expect(result.success).toBe(true)
  })

  test('rejects an end date earlier than the start date, as an endDate field error', () => {
    const result = academicActivityCreateSchema.safeParse({
      ...createInput,
      startDate: '2026-10-26',
      endDate: '2026-10-13',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endDate).toBeDefined()
    }
  })

  test('accepts an end date equal to the start date', () => {
    const result = academicActivityCreateSchema.safeParse({
      ...createInput,
      startDate: '2026-10-26',
      endDate: '2026-10-26',
    })
    expect(result.success).toBe(true)
  })
})

describe('academicActivityUpdateSchema', () => {
  test('rejects an end date sent without a start date', () => {
    const result = academicActivityUpdateSchema.safeParse({
      version: VERSION,
      endDate: '2026-10-13',
    })
    expect(result.success).toBe(false)
  })

  test('rejects an update with no fields to change', () => {
    const result = academicActivityUpdateSchema.safeParse({ version: VERSION })
    expect(result.success).toBe(false)
  })

  test('accepts a shared-field-only update, with no content', () => {
    const result = academicActivityUpdateSchema.safeParse({ version: VERSION, location: 'Heredia' })
    expect(result.success).toBe(true)
  })
})

describe('createAcademicActivity', () => {
  test('creates the activity with its translations in one transaction, authored by the given user', async () => {
    await createAcademicActivity(createInput, 'admin-1')

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.academicActivity.create).toHaveBeenCalledWith({
      data: {
        title: 'Taller de prueba',
        category: 'Taller',
        description: 'Descripción.',
        photoAlt: 'Texto alternativo.',
        startDate: new Date('2026-02-16'),
        endDate: new Date('2026-02-20'),
        location: 'San José, Costa Rica',
        photoUrl: '/images/mock.jpg',
        modifiedBy: 'admin-1',
        translations: {
          create: [
            {
              locale: 'en',
              title: 'Test workshop',
              category: 'Workshop',
              description: 'Description.',
              photoAlt: 'Alt text.',
            },
          ],
        },
      },
      include: expect.any(Object),
    })
  })

  test('returns the stored activity with its editing data', async () => {
    const activity = await createAcademicActivity(createInput, 'admin-1')

    expect(activity).toMatchObject({
      id: 'activity-1',
      title: 'Taller de prueba',
      contentLocale: 'es',
      editing: { isLegacy: false, version: VERSION },
    })
  })

  test('records an audit event for the admin who created it', async () => {
    await createAcademicActivity(createInput, 'admin-1')

    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'academic_activity.create',
        summary: 'Actividad académica agregada: Taller de prueba',
        actorType: 'user',
        actorId: 'admin-1',
        entityType: 'academic_activity',
        entityId: 'activity-1',
      }),
    })
  })
})

describe('updateAcademicActivity', () => {
  const updateInput = { version: VERSION, content: bilingualContent }

  test('reports not-found without writing when the id does not exist', async () => {
    tx.academicActivity.findUnique.mockResolvedValue(null)

    const result = await updateAcademicActivity('missing-id', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'not-found' })
    expect(tx.academicActivity.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict without writing when the activity changed since it was loaded', async () => {
    tx.academicActivity.findUnique.mockResolvedValue({
      title: 'Otro título',
      category: 'Otra categoría',
      description: 'Otro texto',
      photoAlt: 'Otro alternativo',
      modifiedAt: new Date('2026-03-01T00:00:00.000Z'),
      translations: [],
    })

    const result = await updateAcademicActivity('activity-1', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.academicActivity.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict when another save wins between the check and the write', async () => {
    tx.academicActivity.updateMany.mockResolvedValue({ count: 0 })

    const result = await updateAcademicActivity('activity-1', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.academicActivityTranslation.upsert).not.toHaveBeenCalled()
  })

  test('asks to review the language left unchanged when only one language changed', async () => {
    const result = await updateAcademicActivity(
      'activity-1',
      {
        version: VERSION,
        content: { ...bilingualContent, es: { ...bilingualContent.es, title: 'Nuevo título' } },
      },
      'admin-1',
    )

    expect(result).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    expect(tx.academicActivity.updateMany).not.toHaveBeenCalled()
  })

  test('accepts a one-sided change that the editor confirmed', async () => {
    const result = await updateAcademicActivity(
      'activity-1',
      {
        version: VERSION,
        content: { ...bilingualContent, es: { ...bilingualContent.es, title: 'Nuevo título' } },
        confirmedUnchanged: [{ locale: 'en', field: 'title' }],
      },
      'admin-1',
    )

    expect(result.ok).toBe(true)
  })

  test('writes the base text, the version and the translations, stamping modifiedBy', async () => {
    const content = {
      es: {
        title: 'Nuevo título',
        category: 'Charla',
        description: 'Nuevo texto',
        photoAlt: 'Nuevo alt',
      },
      en: { title: 'New title', category: 'Talk', description: 'New text', photoAlt: 'New alt' },
    }

    const result = await updateAcademicActivity(
      'activity-1',
      { version: VERSION, content },
      'admin-1',
    )

    expect(tx.academicActivity.updateMany).toHaveBeenCalledWith({
      where: { id: 'activity-1', modifiedAt: new Date(VERSION) },
      data: {
        title: 'Nuevo título',
        category: 'Charla',
        description: 'Nuevo texto',
        photoAlt: 'Nuevo alt',
        modifiedBy: 'admin-1',
        modifiedAt: expect.any(Date),
      },
    })
    const { data } = tx.academicActivity.updateMany.mock.calls[0]?.[0] as {
      data: { modifiedAt: Date }
    }
    expect(data.modifiedAt.getTime()).toBeGreaterThan(new Date(VERSION).getTime())
    expect(tx.academicActivityTranslation.upsert).toHaveBeenCalledWith({
      where: { academicActivityId_locale: { academicActivityId: 'activity-1', locale: 'en' } },
      create: {
        academicActivityId: 'activity-1',
        locale: 'en',
        title: 'New title',
        category: 'Talk',
        description: 'New text',
        photoAlt: 'New alt',
      },
      update: {
        title: 'New title',
        category: 'Talk',
        description: 'New text',
        photoAlt: 'New alt',
      },
    })
    expect(result).toMatchObject({ ok: true, activity: { id: 'activity-1' } })
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'academic_activity.update',
        summary: 'Actividad académica actualizada: Taller de prueba',
        actorId: 'admin-1',
        entityType: 'academic_activity',
        entityId: 'activity-1',
        metadata: { fields: ['content'] },
      }),
    })
  })

  test('changes only the shared fields, leaving the text and the translations alone, without content', async () => {
    const result = await updateAcademicActivity(
      'activity-1',
      { version: VERSION, location: 'Heredia' },
      'admin-1',
    )

    expect(tx.academicActivity.updateMany).toHaveBeenCalledWith({
      where: { id: 'activity-1', modifiedAt: new Date(VERSION) },
      data: { location: 'Heredia', modifiedBy: 'admin-1', modifiedAt: expect.any(Date) },
    })
    expect(tx.academicActivityTranslation.upsert).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })

  test('writes the dates together when they change', async () => {
    await updateAcademicActivity(
      'activity-1',
      { version: VERSION, startDate: '2026-03-01', endDate: '2026-03-05' },
      'admin-1',
    )

    expect(tx.academicActivity.updateMany).toHaveBeenCalledWith({
      where: { id: 'activity-1', modifiedAt: new Date(VERSION) },
      data: {
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        modifiedBy: 'admin-1',
        modifiedAt: expect.any(Date),
      },
    })
  })
})

describe('deleteAcademicActivity', () => {
  test('deletes an existing activity and records who deleted it', async () => {
    tx.academicActivity.findUnique.mockResolvedValue({ title: 'Taller de prueba' })

    await expect(deleteAcademicActivity('activity-1', actor)).resolves.toBe(true)

    expect(tx.academicActivity.deleteMany).toHaveBeenCalledWith({ where: { id: 'activity-1' } })
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'academic_activity.delete',
        summary: 'Actividad académica eliminada: Taller de prueba',
        actorId: 'admin-1',
        entityType: 'academic_activity',
        entityId: 'activity-1',
      }),
    })
  })

  test('returns false without deleting or recording anything for a missing activity', async () => {
    tx.academicActivity.findUnique.mockResolvedValue(null)

    await expect(deleteAcademicActivity('activity-1', actor)).resolves.toBe(false)

    expect(tx.academicActivity.deleteMany).not.toHaveBeenCalled()
    expect(tx.auditEvent.create).not.toHaveBeenCalled()
  })

  test('returns false and records nothing when another request deletes it first', async () => {
    tx.academicActivity.findUnique.mockResolvedValue({ title: 'Taller de prueba' })
    tx.academicActivity.deleteMany.mockResolvedValue({ count: 0 })

    await expect(deleteAcademicActivity('activity-1', actor)).resolves.toBe(false)

    expect(tx.auditEvent.create).not.toHaveBeenCalled()
  })
})

// Ensures the content definition still agrees with the fields this test file exercises above.
describe('academicActivityContent', () => {
  test('defines title, category, description and photoAlt, every one required', () => {
    expect(academicActivityContent.fields).toEqual(['title', 'category', 'description', 'photoAlt'])
  })
})
