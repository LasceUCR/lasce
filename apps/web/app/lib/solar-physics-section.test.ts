import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    solarPhysicsSection: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    solarPhysicsSectionTranslation: { upsert: vi.fn() },
  }

  const prisma = {
    solarPhysicsSection: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  }

  /** Stands in for Prisma's error class, which the shared transaction helper checks. */
  class PrismaClientKnownRequestError extends Error {}

  return { tx, prisma, PrismaClientKnownRequestError }
})

vi.mock('@lasce/db', () => ({
  prisma: mocks.prisma,
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
}))

const { getSolarPhysicsSection, updateSolarPhysicsSection } =
  await import('./solar-physics-section')

const { tx, prisma } = mocks

const VERSION = '2026-09-01T10:00:00.000Z'

const spanishBody = 'Primer párrafo.\n\nSegundo párrafo.'
const englishBody = 'First paragraph.\n\nSecond paragraph.'

function sectionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'section-1',
    key: 'lasce',
    title: 'Trabajo de LASCE',
    body: spanishBody,
    updatedAt: new Date(VERSION),
    translations: [{ locale: 'en', title: 'LASCE work', body: englishBody }],
    ...overrides,
  }
}

const legacyRow = sectionRow({ translations: [] })

const updateBody = {
  version: VERSION,
  content: {
    es: { title: 'Nuevo título', body: 'Nuevo texto.' },
    en: { title: 'New title', body: 'New text.' },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
  tx.solarPhysicsSection.findUnique.mockResolvedValue(sectionRow())
  tx.solarPhysicsSection.updateMany.mockResolvedValue({ count: 1 })
  tx.solarPhysicsSection.findUniqueOrThrow.mockResolvedValue(sectionRow())
})

describe('getSolarPhysicsSection', () => {
  test('looks the section up by its key and loads the stored translations', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(null)

    await getSolarPhysicsSection()

    expect(prisma.solarPhysicsSection.findUnique).toHaveBeenCalledWith({
      where: { key: 'lasce' },
      include: {
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, body: true },
        },
      },
    })
  })

  test('returns null when the section does not exist', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(null)

    expect(await getSolarPhysicsSection('es')).toBeNull()
  })

  test('shows the Spanish text split into paragraphs', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(sectionRow())

    expect(await getSolarPhysicsSection('es')).toEqual({
      title: 'Trabajo de LASCE',
      paragraphs: ['Primer párrafo.', 'Segundo párrafo.'],
      contentLocale: 'es',
    })
  })

  test('shows the English text of a translated section in English', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(sectionRow())

    expect(await getSolarPhysicsSection('en')).toEqual({
      title: 'LASCE work',
      paragraphs: ['First paragraph.', 'Second paragraph.'],
      contentLocale: 'en',
    })
  })

  test('falls back to the base text of a legacy section without claiming a language', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(legacyRow)

    const section = await getSolarPhysicsSection('en')

    expect(section?.title).toBe('Trabajo de LASCE')
    expect(section?.contentLocale).toBeNull()
  })

  test('leaves editing data out unless asked for it', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(sectionRow())

    expect(await getSolarPhysicsSection('en')).not.toHaveProperty('editing')
  })

  test('includes every language and the version when asked for editing data', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(sectionRow())

    const section = await getSolarPhysicsSection('en', { includeEditingData: true })

    expect(section?.editing).toEqual({
      content: {
        es: { title: 'Trabajo de LASCE', body: spanishBody },
        en: { title: 'LASCE work', body: englishBody },
      },
      isLegacy: false,
      version: VERSION,
    })
  })

  test('flags a section without translation rows as legacy for an editor', async () => {
    prisma.solarPhysicsSection.findUnique.mockResolvedValue(legacyRow)

    const section = await getSolarPhysicsSection('es', { includeEditingData: true })

    expect(section?.editing).toMatchObject({ content: { en: null }, isLegacy: true })
  })
})

describe('updateSolarPhysicsSection', () => {
  test('writes the Spanish text on the base row and upserts the English translation', async () => {
    tx.solarPhysicsSection.findUniqueOrThrow.mockResolvedValue(
      sectionRow({
        title: 'Nuevo título',
        body: 'Nuevo texto.',
        translations: [{ locale: 'en', title: 'New title', body: 'New text.' }],
      }),
    )

    const result = await updateSolarPhysicsSection(updateBody)

    expect(tx.solarPhysicsSection.updateMany).toHaveBeenCalledWith({
      where: { key: 'lasce', updatedAt: new Date(VERSION) },
      data: {
        title: 'Nuevo título',
        body: 'Nuevo texto.',
        updatedAt: expect.any(Date),
      },
    })
    expect(tx.solarPhysicsSectionTranslation.upsert).toHaveBeenCalledWith({
      where: { sectionId_locale: { sectionId: 'section-1', locale: 'en' } },
      create: { sectionId: 'section-1', locale: 'en', title: 'New title', body: 'New text.' },
      update: { title: 'New title', body: 'New text.' },
    })
    expect(result).toMatchObject({
      ok: true,
      section: {
        title: 'Nuevo título',
        paragraphs: ['Nuevo texto.'],
        editing: { isLegacy: false },
      },
    })
  })

  test('moves the version strictly forward', async () => {
    await updateSolarPhysicsSection(updateBody)

    const [{ data }] = tx.solarPhysicsSection.updateMany.mock.calls[0] as [
      { data: { updatedAt: Date } },
    ]
    expect(data.updatedAt.getTime()).toBeGreaterThan(new Date(VERSION).getTime())
  })

  test('reports a missing section and writes nothing', async () => {
    tx.solarPhysicsSection.findUnique.mockResolvedValue(null)

    const result = await updateSolarPhysicsSection(updateBody)

    expect(result).toEqual({ ok: false, reason: 'not-found' })
    expect(tx.solarPhysicsSection.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict when the section changed since it was loaded', async () => {
    tx.solarPhysicsSection.findUnique.mockResolvedValue(
      sectionRow({ updatedAt: new Date('2026-09-02T00:00:00.000Z') }),
    )

    const result = await updateSolarPhysicsSection(updateBody)

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.solarPhysicsSection.updateMany).not.toHaveBeenCalled()
    expect(tx.solarPhysicsSectionTranslation.upsert).not.toHaveBeenCalled()
  })

  test('reports a conflict when another save lands between the check and the write', async () => {
    tx.solarPhysicsSection.updateMany.mockResolvedValue({ count: 0 })

    const result = await updateSolarPhysicsSection(updateBody)

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.solarPhysicsSectionTranslation.upsert).not.toHaveBeenCalled()
  })

  test('asks for a review when only the Spanish text changed', async () => {
    const result = await updateSolarPhysicsSection({
      version: VERSION,
      content: {
        es: { title: 'Nuevo título', body: spanishBody },
        en: { title: 'LASCE work', body: englishBody },
      },
    })

    expect(result).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    expect(tx.solarPhysicsSection.updateMany).not.toHaveBeenCalled()
  })

  test('saves a one-sided change once the other language is confirmed', async () => {
    const result = await updateSolarPhysicsSection({
      version: VERSION,
      content: {
        es: { title: 'Nuevo título', body: spanishBody },
        en: { title: 'LASCE work', body: englishBody },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(result.ok).toBe(true)
    expect(tx.solarPhysicsSectionTranslation.upsert).toHaveBeenCalledTimes(1)
  })

  test('completes a legacy section after reviewing its base text', async () => {
    tx.solarPhysicsSection.findUnique.mockResolvedValue(legacyRow)

    const unconfirmed = await updateSolarPhysicsSection({
      version: VERSION,
      content: {
        es: { title: 'Trabajo de LASCE', body: spanishBody },
        en: { title: 'LASCE work', body: englishBody },
      },
    })
    const confirmed = await updateSolarPhysicsSection({
      version: VERSION,
      content: {
        es: { title: 'Trabajo de LASCE', body: spanishBody },
        en: { title: 'LASCE work', body: englishBody },
      },
      confirmedUnchanged: [
        { locale: 'es', field: 'title' },
        { locale: 'es', field: 'body' },
      ],
    })

    expect(unconfirmed).toMatchObject({ ok: false, reason: 'review-required' })
    expect(confirmed.ok).toBe(true)
  })

  test('lets an unexpected database error through for the route to log', async () => {
    tx.solarPhysicsSection.updateMany.mockRejectedValue(new Error('connection lost'))

    await expect(updateSolarPhysicsSection(updateBody)).rejects.toThrow('connection lost')
  })
})
