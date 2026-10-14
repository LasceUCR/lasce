import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  /** Stands in for Prisma's error class, which the transaction helper checks with `instanceof`. */
  class PrismaClientKnownRequestError extends Error {}

  const tx = {
    nosotrosActivity: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    nosotrosActivityTranslation: { upsert: vi.fn() },
  }

  const prisma = {
    nosotrosActivity: { findMany: vi.fn(), deleteMany: vi.fn() },
    nosotrosResearcher: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  return { tx, prisma, PrismaClientKnownRequestError }
})

vi.mock('@lasce/db', () => ({
  prisma: mocks.prisma,
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
}))

const { tx, prisma } = mocks
const { findMany, deleteMany } = prisma.nosotrosActivity

const researcherFindMany = prisma.nosotrosResearcher.findMany
const researcherFindUnique = prisma.nosotrosResearcher.findUnique
const researcherUpdate = prisma.nosotrosResearcher.update
const researcherCreate = prisma.nosotrosResearcher.create
const researcherDelete = prisma.nosotrosResearcher.delete

const {
  createNosotrosActivity,
  getNosotrosContent,
  createNosotrosResearcher,
  deleteNosotrosActivity,
  deleteNosotrosResearcher,
  getNosotrosActivities,
  getNosotrosResearchers,
  nosotrosActivityFixtures,
  nosotrosResearcherInputSchema,
  updateNosotrosActivity,
  updateNosotrosResearcher,
} = await import('./nosotros')

import en from '@/messages/en.json' with { type: 'json' }

function researcherRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'researcher-1',
    photoUrl: '/images/Researchers/AllanBerrocal.jpg',
    role: 'Investigador colaborador',
    name: 'Dr. Allan Francisco Berrocal Rojas',
    institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
    email: ['allan.berrocal@ucr.ac.cr'],
    description: 'Diseño, desarrollo e implementación de la plataforma informática del LASCE.',
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

const VERSION = '2026-01-01T00:00:00.000Z'

function activityRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'activity-1',
    icon: 'SUN',
    title: 'Fenómenos solares eruptivos',
    paragraph: "Analizamos fenómenos solares eruptivos, como 'flares'.",
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    modifiedAt: new Date(VERSION),
    translations: [],
    ...overrides,
  }
}

const bilingualRow = activityRow({
  translations: [
    {
      locale: 'en',
      title: 'Eruptive solar phenomena',
      paragraph: 'We analyze eruptive solar phenomena.',
    },
  ],
})

const bilingualContent = {
  es: {
    title: 'Fenómenos solares eruptivos',
    description: "Analizamos fenómenos solares eruptivos, como 'flares'.",
  },
  en: { title: 'Eruptive solar phenomena', description: 'We analyze eruptive solar phenomena.' },
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
  tx.nosotrosActivity.create.mockResolvedValue(bilingualRow)
  tx.nosotrosActivity.findUnique.mockResolvedValue({
    title: 'Fenómenos solares eruptivos',
    paragraph: "Analizamos fenómenos solares eruptivos, como 'flares'.",
    modifiedAt: new Date(VERSION),
    translations: bilingualRow.translations,
  })
  tx.nosotrosActivity.updateMany.mockResolvedValue({ count: 1 })
  tx.nosotrosActivity.findUniqueOrThrow.mockResolvedValue(bilingualRow)
})

describe('getNosotrosActivities', () => {
  test('maps each row to the public shape, lowercasing the icon', async () => {
    findMany.mockResolvedValue([bilingualRow])

    const activities = await getNosotrosActivities()

    expect(activities).toEqual([
      {
        id: 'activity-1',
        icon: 'sun',
        title: 'Fenómenos solares eruptivos',
        description: "Analizamos fenómenos solares eruptivos, como 'flares'.",
        modifiedAt: VERSION,
        contentLocale: 'es',
      },
    ])
  })

  test('orders by createdAt and loads the translations, so editing never reorders a card', async () => {
    findMany.mockResolvedValue([])

    await getNosotrosActivities()

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
      include: {
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, paragraph: true },
        },
      },
    })
  })

  test('shows the English translation when the site is read in English', async () => {
    findMany.mockResolvedValue([bilingualRow])

    const [activity] = await getNosotrosActivities('en')

    expect(activity).toMatchObject({
      title: 'Eruptive solar phenomena',
      description: 'We analyze eruptive solar phenomena.',
      contentLocale: 'en',
    })
  })

  test('shows the base text as Spanish for a complete card read in Spanish', async () => {
    findMany.mockResolvedValue([bilingualRow])

    const [activity] = await getNosotrosActivities('es')

    expect(activity).toMatchObject({ title: 'Fenómenos solares eruptivos', contentLocale: 'es' })
  })

  test('shows a legacy card as it is, in an unknown language, whatever the site language', async () => {
    findMany.mockResolvedValue([activityRow()])

    const [activity] = await getNosotrosActivities('en')

    expect(activity).toMatchObject({ title: 'Fenómenos solares eruptivos', contentLocale: null })
  })

  test('sends no editing data unless it is asked for', async () => {
    findMany.mockResolvedValue([bilingualRow])

    const [activity] = await getNosotrosActivities('es')

    expect(activity).not.toHaveProperty('editing')
  })

  test('sends both languages and the version to an editor', async () => {
    findMany.mockResolvedValue([bilingualRow])

    const [activity] = await getNosotrosActivities('es', { includeEditingData: true })

    expect(activity?.editing).toEqual({
      content: bilingualContent,
      isLegacy: false,
      version: VERSION,
    })
  })

  test('marks a card without a translation row as legacy for an editor', async () => {
    findMany.mockResolvedValue([activityRow()])

    const [activity] = await getNosotrosActivities('es', { includeEditingData: true })

    expect(activity?.editing).toEqual({
      content: {
        es: bilingualContent.es,
        en: null,
      },
      isLegacy: true,
      version: VERSION,
    })
  })
})

describe('nosotrosActivityFixtures', () => {
  test('carry both languages so the editor can open them', () => {
    for (const fixture of nosotrosActivityFixtures) {
      expect(fixture.editing?.isLegacy).toBe(false)
      expect(fixture.editing?.content.en).not.toBeNull()
    }
  })
})

describe('createNosotrosActivity', () => {
  const createInput = {
    icon: 'code' as const,
    content: {
      es: { title: 'Actividad nueva', description: 'Texto' },
      en: { title: 'New activity', description: 'Text' },
    },
  }

  test('creates the card with its translations in one transaction, authored by the given user', async () => {
    await createNosotrosActivity(createInput, 'admin-1')

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.nosotrosActivity.create).toHaveBeenCalledWith({
      data: {
        icon: 'CODE',
        title: 'Actividad nueva',
        paragraph: 'Texto',
        modifiedBy: 'admin-1',
        translations: { create: [{ locale: 'en', title: 'New activity', paragraph: 'Text' }] },
      },
      include: expect.any(Object),
    })
  })

  test('returns the stored card with its editing data', async () => {
    tx.nosotrosActivity.create.mockResolvedValue(
      activityRow({
        icon: 'CODE',
        title: 'Actividad nueva',
        paragraph: 'Texto',
        translations: [{ locale: 'en', title: 'New activity', paragraph: 'Text' }],
      }),
    )

    const result = await createNosotrosActivity(createInput, 'admin-1')

    expect(result).toMatchObject({
      id: 'activity-1',
      icon: 'code',
      title: 'Actividad nueva',
      description: 'Texto',
      contentLocale: 'es',
      editing: { isLegacy: false, version: VERSION },
    })
  })
})

describe('updateNosotrosActivity', () => {
  const updateInput = { version: VERSION, content: bilingualContent }

  test('reports not-found without writing when the id does not exist', async () => {
    tx.nosotrosActivity.findUnique.mockResolvedValue(null)

    const result = await updateNosotrosActivity('missing-id', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'not-found' })
    expect(tx.nosotrosActivity.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict without writing when the card changed since it was loaded', async () => {
    tx.nosotrosActivity.findUnique.mockResolvedValue({
      title: 'Otro título',
      paragraph: 'Otro texto',
      modifiedAt: new Date('2026-02-01T00:00:00.000Z'),
      translations: [],
    })

    const result = await updateNosotrosActivity('activity-1', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.nosotrosActivity.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict when another save wins between the check and the write', async () => {
    tx.nosotrosActivity.updateMany.mockResolvedValue({ count: 0 })

    const result = await updateNosotrosActivity('activity-1', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.nosotrosActivityTranslation.upsert).not.toHaveBeenCalled()
  })

  test('asks to review the language left unchanged when only one language changed', async () => {
    const result = await updateNosotrosActivity(
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
    expect(tx.nosotrosActivity.updateMany).not.toHaveBeenCalled()
  })

  test('accepts a one-sided change that the editor confirmed', async () => {
    const result = await updateNosotrosActivity(
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
      es: { title: 'Nuevo título', description: 'Nuevo texto' },
      en: { title: 'New title', description: 'New text' },
    }

    const result = await updateNosotrosActivity(
      'activity-1',
      { version: VERSION, content, icon: 'waves' },
      'admin-1',
    )

    expect(tx.nosotrosActivity.updateMany).toHaveBeenCalledWith({
      where: { id: 'activity-1', modifiedAt: new Date(VERSION) },
      data: {
        title: 'Nuevo título',
        paragraph: 'Nuevo texto',
        icon: 'WAVES',
        modifiedBy: 'admin-1',
        modifiedAt: expect.any(Date),
      },
    })
    const { data } = tx.nosotrosActivity.updateMany.mock.calls[0]?.[0] as {
      data: { modifiedAt: Date }
    }
    expect(data.modifiedAt.getTime()).toBeGreaterThan(new Date(VERSION).getTime())
    expect(tx.nosotrosActivityTranslation.upsert).toHaveBeenCalledWith({
      where: { activityId_locale: { activityId: 'activity-1', locale: 'en' } },
      create: { activityId: 'activity-1', locale: 'en', title: 'New title', paragraph: 'New text' },
      update: { title: 'New title', paragraph: 'New text' },
    })
    expect(result).toMatchObject({ ok: true, activity: { id: 'activity-1' } })
  })

  test('changes only the icon, leaving the text and the translations alone, without content', async () => {
    const result = await updateNosotrosActivity(
      'activity-1',
      { version: VERSION, icon: 'waves' },
      'admin-1',
    )

    expect(tx.nosotrosActivity.updateMany).toHaveBeenCalledWith({
      where: { id: 'activity-1', modifiedAt: new Date(VERSION) },
      data: { icon: 'WAVES', modifiedBy: 'admin-1', modifiedAt: expect.any(Date) },
    })
    expect(tx.nosotrosActivityTranslation.upsert).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })

  test('updates the icon of a legacy card without asking for a translation', async () => {
    tx.nosotrosActivity.findUnique.mockResolvedValue({
      title: 'Eruptive solar phenomena',
      paragraph: 'We analyze eruptive solar phenomena.',
      modifiedAt: new Date(VERSION),
      translations: [],
    })

    const result = await updateNosotrosActivity(
      'activity-1',
      { version: VERSION, icon: 'code' },
      'admin-1',
    )

    expect(result.ok).toBe(true)
  })
})

describe('deleteNosotrosActivity', () => {
  test('returns false when no row was deleted', async () => {
    deleteMany.mockResolvedValue({ count: 0 })

    const result = await deleteNosotrosActivity('missing-id')

    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'missing-id' } })
    expect(result).toBe(false)
  })

  test('returns true when the row was deleted', async () => {
    deleteMany.mockResolvedValue({ count: 1 })

    const result = await deleteNosotrosActivity('activity-1')

    expect(result).toBe(true)
  })
})

describe('getNosotrosResearchers', () => {
  test('maps each row to a NosotrosResearcher, dropping a missing email to undefined', async () => {
    researcherFindMany.mockResolvedValue([researcherRow({ email: [] })])

    const researchers = await getNosotrosResearchers()

    expect(researchers).toEqual([
      {
        id: 'researcher-1',
        src: '/images/Researchers/AllanBerrocal.jpg',
        role: 'Investigador colaborador',
        name: 'Dr. Allan Francisco Berrocal Rojas',
        institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
        email: undefined,
        description: 'Diseño, desarrollo e implementación de la plataforma informática del LASCE.',
      },
    ])
  })

  test('keeps a real email and description when the row has them', async () => {
    researcherFindMany.mockResolvedValue([researcherRow()])

    const [researcher] = await getNosotrosResearchers()

    expect(researcher?.email).toEqual(['allan.berrocal@ucr.ac.cr'])
    expect(researcher?.description).toBe(
      'Diseño, desarrollo e implementación de la plataforma informática del LASCE.',
    )
  })

  test('orders by createdAt, so editing a profile never reorders it', async () => {
    researcherFindMany.mockResolvedValue([])

    await getNosotrosResearchers()

    expect(researcherFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } })
  })
})

describe('nosotrosResearcherInputSchema', () => {
  const validInput = {
    src: '/images/Researchers/Someone.jpg',
    role: 'Investigador colaborador',
    name: 'Alguien',
    institution: 'UCR',
    description: 'Texto de prueba.',
  }

  test('accepts a well-formed input', () => {
    expect(nosotrosResearcherInputSchema.safeParse(validInput).success).toBe(true)
  })

  test('accepts a missing description — optional, same as ROSAC', () => {
    const { description: _description, ...withoutDescription } = validInput

    expect(nosotrosResearcherInputSchema.safeParse(withoutDescription).success).toBe(true)
  })

  test('rejects a missing photo', () => {
    const result = nosotrosResearcherInputSchema.safeParse({ ...validInput, src: '' })

    expect(result.success).toBe(false)
  })

  test('rejects an empty required field', () => {
    const result = nosotrosResearcherInputSchema.safeParse({ ...validInput, name: '  ' })

    expect(result.success).toBe(false)
  })

  test('accepts an empty email — no public address', () => {
    expect(nosotrosResearcherInputSchema.safeParse({ ...validInput, email: '' }).success).toBe(true)
  })

  test('rejects a malformed email', () => {
    const result = nosotrosResearcherInputSchema.safeParse({
      ...validInput,
      email: 'not-an-email',
    })

    expect(result.success).toBe(false)
  })

  test('splits a comma-separated list into several addresses', () => {
    const result = nosotrosResearcherInputSchema.safeParse({
      ...validInput,
      email: 'uno@ucr.ac.cr, dos@ucr.ac.cr',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toEqual(['uno@ucr.ac.cr', 'dos@ucr.ac.cr'])
    }
  })

  test('rejects more than 2 addresses', () => {
    const result = nosotrosResearcherInputSchema.safeParse({
      ...validInput,
      email: 'uno@ucr.ac.cr, dos@ucr.ac.cr, tres@ucr.ac.cr',
    })

    expect(result.success).toBe(false)
  })
})

describe('updateNosotrosResearcher', () => {
  const updateInput = {
    src: '/images/Researchers/Updated.jpg',
    role: 'Investigador colaborador',
    name: 'Nuevo nombre',
    email: ['nuevo.nombre@ucr.ac.cr'],
    institution: 'UCR',
    description: 'Texto actualizado.',
  }

  test('returns null without writing when the id does not exist', async () => {
    researcherFindUnique.mockResolvedValue(null)

    const result = await updateNosotrosResearcher('missing-id', updateInput, 'admin-1')

    expect(result).toBeNull()
    expect(researcherUpdate).not.toHaveBeenCalled()
  })

  test('persists the change, including the email', async () => {
    researcherFindUnique.mockResolvedValue(researcherRow())
    researcherUpdate.mockResolvedValue(
      researcherRow({
        photoUrl: updateInput.src,
        role: updateInput.role,
        name: updateInput.name,
        email: updateInput.email,
        description: updateInput.description,
      }),
    )

    const result = await updateNosotrosResearcher('researcher-1', updateInput, 'admin-1')

    expect(researcherUpdate).toHaveBeenCalledWith({
      where: { id: 'researcher-1' },
      data: {
        photoUrl: updateInput.src,
        role: updateInput.role,
        name: updateInput.name,
        email: updateInput.email,
        institution: updateInput.institution,
        description: updateInput.description,
        modifiedBy: 'admin-1',
      },
    })
    expect(result?.name).toBe('Nuevo nombre')
    expect(result?.email).toEqual(['nuevo.nombre@ucr.ac.cr'])
  })

  test('persists several addresses', async () => {
    researcherFindUnique.mockResolvedValue(researcherRow())
    const emails = ['uno@ucr.ac.cr', 'dos@ucr.ac.cr']
    researcherUpdate.mockResolvedValue(researcherRow({ email: emails }))

    const result = await updateNosotrosResearcher(
      'researcher-1',
      { ...updateInput, email: emails },
      'admin-1',
    )

    expect(researcherUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: emails }) }),
    )
    expect(result?.email).toEqual(emails)
  })
})

describe('createNosotrosResearcher', () => {
  test('creates the profile, authored by the given user, with no email', async () => {
    const createInput = {
      src: '/images/Researchers/New.jpg',
      role: 'Investigador colaborador',
      name: 'Persona Nueva',
      institution: 'UCR',
      description: 'Texto de prueba.',
    }
    researcherCreate.mockResolvedValue(
      researcherRow({
        photoUrl: createInput.src,
        role: createInput.role,
        name: createInput.name,
        email: [],
        description: createInput.description,
      }),
    )

    const result = await createNosotrosResearcher(createInput, 'admin-1')

    expect(researcherCreate).toHaveBeenCalledWith({
      data: {
        photoUrl: createInput.src,
        role: createInput.role,
        name: createInput.name,
        email: [],
        institution: createInput.institution,
        description: createInput.description,
        modifiedBy: 'admin-1',
      },
    })
    expect(result.email).toBeUndefined()
    expect(result.description).toBe(createInput.description)
  })
})

describe('deleteNosotrosResearcher', () => {
  test('returns false without deleting when the id does not exist', async () => {
    researcherFindUnique.mockResolvedValue(null)

    const result = await deleteNosotrosResearcher('missing-id')

    expect(result).toBe(false)
    expect(researcherDelete).not.toHaveBeenCalled()
  })

  test('deletes the row and returns true when it exists', async () => {
    researcherFindUnique.mockResolvedValue(researcherRow())

    const result = await deleteNosotrosResearcher('researcher-1')

    expect(researcherDelete).toHaveBeenCalledWith({ where: { id: 'researcher-1' } })
    expect(result).toBe(true)
  })
})

describe('getNosotrosContent', () => {
  test('builds the page in English from the English catalogue', () => {
    const content = getNosotrosContent(en)

    expect(content.hero.title).toBe('About us')
    expect(content.overview.paragraphs).toHaveLength(2)
    expect(content.backLink).toEqual({ href: '/', label: 'Back to home' })
    expect(content.researchers.people).toEqual([])
    expect(content.activities.items).toEqual([])
  })
})
