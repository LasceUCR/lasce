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
    nosotrosResearcher: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    nosotrosResearcherTranslation: { upsert: vi.fn() },
  }

  const prisma = {
    nosotrosActivity: { findMany: vi.fn(), deleteMany: vi.fn() },
    nosotrosResearcher: { findMany: vi.fn(), deleteMany: vi.fn() },
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
const researcherDeleteMany = prisma.nosotrosResearcher.deleteMany

const {
  createNosotrosActivity,
  getNosotrosContent,
  createNosotrosResearcher,
  deleteNosotrosActivity,
  deleteNosotrosResearcher,
  getNosotrosActivities,
  getNosotrosResearcherFixtures,
  getNosotrosResearchers,
  nosotrosActivityFixtures,
  nosotrosResearcherFixtures,
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
    translations: [],
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

const bilingualResearcherRow = researcherRow({
  translations: [
    {
      locale: 'en',
      role: 'Collaborating researcher',
      description: "Design, development and implementation of LASCE's computing platform.",
    },
  ],
})

const bilingualResearcherContent = {
  es: {
    role: 'Investigador colaborador',
    description: 'Diseño, desarrollo e implementación de la plataforma informática del LASCE.',
  },
  en: {
    role: 'Collaborating researcher',
    description: "Design, development and implementation of LASCE's computing platform.",
  },
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
  tx.nosotrosResearcher.create.mockResolvedValue(bilingualResearcherRow)
  tx.nosotrosResearcher.findUnique.mockResolvedValue({
    role: bilingualResearcherContent.es.role,
    description: bilingualResearcherContent.es.description,
    modifiedAt: new Date(VERSION),
    translations: bilingualResearcherRow.translations,
  })
  tx.nosotrosResearcher.updateMany.mockResolvedValue({ count: 1 })
  tx.nosotrosResearcher.findUniqueOrThrow.mockResolvedValue(bilingualResearcherRow)
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
      orderBy: { createdAt: 'desc' },
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
    researcherFindMany.mockResolvedValue([
      researcherRow({ email: [], translations: bilingualResearcherRow.translations }),
    ])

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
        contentLocale: 'es',
      },
    ])
  })

  test('keeps a real email and a missing description as undefined', async () => {
    researcherFindMany.mockResolvedValue([
      researcherRow({
        description: null,
        translations: [{ locale: 'en', role: 'Collaborating researcher', description: null }],
      }),
    ])

    const [researcher] = await getNosotrosResearchers()

    expect(researcher?.email).toEqual(['allan.berrocal@ucr.ac.cr'])
    expect(researcher?.description).toBeUndefined()
  })

  test('orders by createdAt and loads the translations, so editing a profile never reorders it', async () => {
    researcherFindMany.mockResolvedValue([])

    await getNosotrosResearchers()

    expect(researcherFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
      include: {
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, role: true, description: true },
        },
      },
    })
  })

  test('shows the English translation when the site is read in English', async () => {
    researcherFindMany.mockResolvedValue([bilingualResearcherRow])

    const [researcher] = await getNosotrosResearchers('en')

    expect(researcher).toMatchObject({
      role: 'Collaborating researcher',
      description: "Design, development and implementation of LASCE's computing platform.",
      contentLocale: 'en',
    })
  })

  test('shows the base text as Spanish for a complete researcher read in Spanish', async () => {
    researcherFindMany.mockResolvedValue([bilingualResearcherRow])

    const [researcher] = await getNosotrosResearchers('es')

    expect(researcher).toMatchObject({ role: 'Investigador colaborador', contentLocale: 'es' })
  })

  test('shows a legacy researcher as it is, in an unknown language, whatever the site language', async () => {
    researcherFindMany.mockResolvedValue([researcherRow()])

    const [researcher] = await getNosotrosResearchers('en')

    expect(researcher).toMatchObject({ role: 'Investigador colaborador', contentLocale: null })
  })

  test('sends no editing data unless it is asked for', async () => {
    researcherFindMany.mockResolvedValue([bilingualResearcherRow])

    const [researcher] = await getNosotrosResearchers('es')

    expect(researcher).not.toHaveProperty('editing')
  })

  test('sends both languages and the version to an editor', async () => {
    researcherFindMany.mockResolvedValue([bilingualResearcherRow])

    const [researcher] = await getNosotrosResearchers('es', { includeEditingData: true })

    expect(researcher?.editing).toEqual({
      content: bilingualResearcherContent,
      isLegacy: false,
      version: VERSION,
    })
  })

  test('marks a researcher without a translation row as legacy for an editor', async () => {
    researcherFindMany.mockResolvedValue([researcherRow()])

    const [researcher] = await getNosotrosResearchers('es', { includeEditingData: true })

    expect(researcher?.editing).toEqual({
      content: { es: bilingualResearcherContent.es, en: null },
      isLegacy: true,
      version: VERSION,
    })
  })

  test('maps a row without a photo to an empty src', async () => {
    researcherFindMany.mockResolvedValue([researcherRow({ photoUrl: null })])

    const [researcher] = await getNosotrosResearchers()

    expect(researcher?.src).toBe('')
  })
})

describe('nosotrosResearcherFixtures', () => {
  test('carry both languages so the editor can open them', () => {
    for (const fixture of nosotrosResearcherFixtures) {
      expect(fixture.editing?.isLegacy).toBe(false)
      expect(fixture.editing?.content.en).not.toBeNull()
    }
  })

  test('have an English description exactly when they have a Spanish one', () => {
    for (const fixture of nosotrosResearcherFixtures) {
      expect(fixture.editing?.content.en?.description === null).toBe(
        fixture.description === undefined,
      )
    }
  })
})

describe('getNosotrosResearcherFixtures', () => {
  test('returns fixtures in Spanish when requested in Spanish', () => {
    const fixtures = getNosotrosResearcherFixtures('es')
    expect(fixtures[0]).toMatchObject({
      role: 'Investigadora principal',
      contentLocale: 'es',
    })
  })

  test('returns fixtures with English role and description when requested in English', () => {
    const fixtures = getNosotrosResearcherFixtures('en')
    expect(fixtures[0]).toMatchObject({
      role: 'Principal investigator',
      contentLocale: 'en',
    })
    expect(fixtures[1]).toMatchObject({
      role: 'Collaborating researcher',
      contentLocale: 'en',
    })
  })
})

describe('createNosotrosResearcher', () => {
  const createInput = {
    src: '/images/Researchers/New.jpg',
    name: 'Persona Nueva',
    institution: 'UCR',
    content: {
      es: { role: 'Investigador colaborador', description: 'Texto de prueba.' },
      en: { role: 'Collaborating researcher', description: 'Test text.' },
    },
  }

  test('creates the profile with its translations in one transaction, authored by the given user, with no email', async () => {
    await createNosotrosResearcher(createInput, 'admin-1')

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.nosotrosResearcher.create).toHaveBeenCalledWith({
      data: {
        photoUrl: createInput.src,
        name: createInput.name,
        email: [],
        institution: createInput.institution,
        role: 'Investigador colaborador',
        description: 'Texto de prueba.',
        modifiedBy: 'admin-1',
        translations: {
          create: [{ locale: 'en', role: 'Collaborating researcher', description: 'Test text.' }],
        },
      },
      include: expect.any(Object),
    })
  })

  test('stores a missing description as null in every language', async () => {
    await createNosotrosResearcher(
      {
        ...createInput,
        content: {
          es: { role: 'Investigador colaborador', description: null },
          en: { role: 'Collaborating researcher', description: null },
        },
      },
      'admin-1',
    )

    expect(tx.nosotrosResearcher.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: null,
        translations: {
          create: [{ locale: 'en', role: 'Collaborating researcher', description: null }],
        },
      }),
      include: expect.any(Object),
    })
  })

  test('returns the stored profile with its editing data', async () => {
    const result = await createNosotrosResearcher(createInput, 'admin-1')

    expect(result).toMatchObject({
      id: 'researcher-1',
      role: 'Investigador colaborador',
      contentLocale: 'es',
      editing: { isLegacy: false, version: VERSION },
    })
  })
})

describe('updateNosotrosResearcher', () => {
  const updateInput = { version: VERSION, content: bilingualResearcherContent }

  test('reports not-found without writing when the id does not exist', async () => {
    tx.nosotrosResearcher.findUnique.mockResolvedValue(null)

    const result = await updateNosotrosResearcher('missing-id', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'not-found' })
    expect(tx.nosotrosResearcher.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict without writing when the profile changed since it was loaded', async () => {
    tx.nosotrosResearcher.findUnique.mockResolvedValue({
      role: 'Otro rol',
      description: null,
      modifiedAt: new Date('2026-02-01T00:00:00.000Z'),
      translations: [],
    })

    const result = await updateNosotrosResearcher('researcher-1', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.nosotrosResearcher.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict when another save wins between the check and the write', async () => {
    tx.nosotrosResearcher.updateMany.mockResolvedValue({ count: 0 })

    const result = await updateNosotrosResearcher('researcher-1', updateInput, 'admin-1')

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.nosotrosResearcherTranslation.upsert).not.toHaveBeenCalled()
  })

  test('asks to review the language left unchanged when only one language changed', async () => {
    const result = await updateNosotrosResearcher(
      'researcher-1',
      {
        version: VERSION,
        content: {
          ...bilingualResearcherContent,
          es: { ...bilingualResearcherContent.es, role: 'Investigadora principal' },
        },
      },
      'admin-1',
    )

    expect(result).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'role' }],
    })
    expect(tx.nosotrosResearcher.updateMany).not.toHaveBeenCalled()
  })

  test('accepts a one-sided change that the editor confirmed', async () => {
    const result = await updateNosotrosResearcher(
      'researcher-1',
      {
        version: VERSION,
        content: {
          ...bilingualResearcherContent,
          es: { ...bilingualResearcherContent.es, role: 'Investigadora principal' },
        },
        confirmedUnchanged: [{ locale: 'en', field: 'role' }],
      },
      'admin-1',
    )

    expect(result.ok).toBe(true)
  })

  test('writes the base text, the shared fields, the version and the translations, stamping modifiedBy', async () => {
    const content = {
      es: { role: 'Investigadora principal', description: 'Nuevo texto' },
      en: { role: 'Principal investigator', description: 'New text' },
    }

    const result = await updateNosotrosResearcher(
      'researcher-1',
      { version: VERSION, content, name: 'Nuevo nombre', email: ['nuevo@ucr.ac.cr'] },
      'admin-1',
    )

    expect(tx.nosotrosResearcher.updateMany).toHaveBeenCalledWith({
      where: { id: 'researcher-1', modifiedAt: new Date(VERSION) },
      data: {
        role: 'Investigadora principal',
        description: 'Nuevo texto',
        name: 'Nuevo nombre',
        email: ['nuevo@ucr.ac.cr'],
        modifiedBy: 'admin-1',
        modifiedAt: expect.any(Date),
      },
    })
    const { data } = tx.nosotrosResearcher.updateMany.mock.calls[0]?.[0] as {
      data: { modifiedAt: Date }
    }
    expect(data.modifiedAt.getTime()).toBeGreaterThan(new Date(VERSION).getTime())
    expect(tx.nosotrosResearcherTranslation.upsert).toHaveBeenCalledWith({
      where: { researcherId_locale: { researcherId: 'researcher-1', locale: 'en' } },
      create: {
        researcherId: 'researcher-1',
        locale: 'en',
        role: 'Principal investigator',
        description: 'New text',
      },
      update: { role: 'Principal investigator', description: 'New text' },
    })
    expect(result).toMatchObject({ ok: true, researcher: { id: 'researcher-1' } })
  })

  test('changes only the shared fields, leaving the text and the translations alone, without content', async () => {
    const result = await updateNosotrosResearcher(
      'researcher-1',
      { version: VERSION, institution: 'Universidad Nacional' },
      'admin-1',
    )

    expect(tx.nosotrosResearcher.updateMany).toHaveBeenCalledWith({
      where: { id: 'researcher-1', modifiedAt: new Date(VERSION) },
      data: {
        institution: 'Universidad Nacional',
        modifiedBy: 'admin-1',
        modifiedAt: expect.any(Date),
      },
    })
    expect(tx.nosotrosResearcherTranslation.upsert).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })

  test('updates the shared fields of a legacy researcher without asking for a translation', async () => {
    tx.nosotrosResearcher.findUnique.mockResolvedValue({
      role: 'Collaborating researcher',
      description: null,
      modifiedAt: new Date(VERSION),
      translations: [],
    })

    const result = await updateNosotrosResearcher(
      'researcher-1',
      { version: VERSION, name: 'Nuevo nombre' },
      'admin-1',
    )

    expect(result.ok).toBe(true)
  })

  test('clears the addresses when an empty list is sent', async () => {
    await updateNosotrosResearcher('researcher-1', { version: VERSION, email: [] }, 'admin-1')

    expect(tx.nosotrosResearcher.updateMany).toHaveBeenCalledWith({
      where: { id: 'researcher-1', modifiedAt: new Date(VERSION) },
      data: { email: [], modifiedBy: 'admin-1', modifiedAt: expect.any(Date) },
    })
  })

  test('stores a cleared photo as null', async () => {
    await updateNosotrosResearcher('researcher-1', { version: VERSION, src: '' }, 'admin-1')

    expect(tx.nosotrosResearcher.updateMany).toHaveBeenCalledWith({
      where: { id: 'researcher-1', modifiedAt: new Date(VERSION) },
      data: { photoUrl: null, modifiedBy: 'admin-1', modifiedAt: expect.any(Date) },
    })
  })

  test('creates the profile without a photo, stored as null', async () => {
    tx.nosotrosResearcher.create.mockResolvedValue({ ...bilingualResearcherRow, photoUrl: null })

    const result = await createNosotrosResearcher(
      { name: 'Persona Nueva', institution: 'UCR', content: bilingualResearcherContent },
      'admin-1',
    )

    expect(tx.nosotrosResearcher.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ photoUrl: null }) }),
    )
    expect(result.src).toBe('')
  })
})

describe('deleteNosotrosResearcher', () => {
  test('returns false when no row was deleted', async () => {
    researcherDeleteMany.mockResolvedValue({ count: 0 })

    const result = await deleteNosotrosResearcher('missing-id')

    expect(researcherDeleteMany).toHaveBeenCalledWith({ where: { id: 'missing-id' } })
    expect(result).toBe(false)
  })

  test('returns true when the row was deleted', async () => {
    researcherDeleteMany.mockResolvedValue({ count: 1 })

    const result = await deleteNosotrosResearcher('researcher-1')

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
