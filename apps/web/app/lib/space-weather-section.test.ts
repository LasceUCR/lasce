import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    spaceWeatherSection: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    spaceWeatherSectionTranslation: { upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
  }

  const prisma = {
    spaceWeatherSection: { findUnique: vi.fn() },
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

const { getSpaceWeatherSection, updateSpaceWeatherSection } =
  await import('./space-weather-section')

const { tx, prisma } = mocks

const VERSION = '2026-09-01T10:00:00.000Z'

const spanishBody = 'Primer párrafo.\n\nSegundo párrafo.'
const englishBody = 'First paragraph.\n\nSecond paragraph.'

function sectionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'section-1',
    key: 'costa-rica',
    title: '¿Por qué estudiarlo desde Costa Rica?',
    body: spanishBody,
    updatedAt: new Date(VERSION),
    translations: [{ locale: 'en', title: 'Why study it from Costa Rica?', body: englishBody }],
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

const actor = { id: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
  tx.spaceWeatherSection.findUnique.mockResolvedValue(sectionRow())
  tx.spaceWeatherSection.updateMany.mockResolvedValue({ count: 1 })
  tx.spaceWeatherSection.findUniqueOrThrow.mockResolvedValue(sectionRow())
})

describe('getSpaceWeatherSection', () => {
  test('looks the section up by its key and loads the stored translations', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(null)

    await getSpaceWeatherSection()

    expect(prisma.spaceWeatherSection.findUnique).toHaveBeenCalledWith({
      where: { key: 'costa-rica' },
      include: {
        translations: {
          where: { locale: { in: ['en'] } },
          select: { locale: true, title: true, body: true },
        },
      },
    })
  })

  test('returns null when the section does not exist', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(null)

    expect(await getSpaceWeatherSection('es')).toBeNull()
  })

  test('shows the Spanish text split into paragraphs', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(sectionRow())

    expect(await getSpaceWeatherSection('es')).toEqual({
      title: '¿Por qué estudiarlo desde Costa Rica?',
      paragraphs: ['Primer párrafo.', 'Segundo párrafo.'],
      contentLocale: 'es',
    })
  })

  test('shows the English text of a translated section in English', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(sectionRow())

    expect(await getSpaceWeatherSection('en')).toEqual({
      title: 'Why study it from Costa Rica?',
      paragraphs: ['First paragraph.', 'Second paragraph.'],
      contentLocale: 'en',
    })
  })

  test('falls back to the base text of a legacy section without claiming a language', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(legacyRow)

    const section = await getSpaceWeatherSection('en')

    expect(section?.title).toBe('¿Por qué estudiarlo desde Costa Rica?')
    expect(section?.contentLocale).toBeNull()
  })

  test('leaves editing data out unless asked for it', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(sectionRow())

    expect(await getSpaceWeatherSection('en')).not.toHaveProperty('editing')
  })

  test('includes every language and the version when asked for editing data', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(sectionRow())

    const section = await getSpaceWeatherSection('en', { includeEditingData: true })

    expect(section?.editing).toEqual({
      content: {
        es: { title: '¿Por qué estudiarlo desde Costa Rica?', body: spanishBody },
        en: { title: 'Why study it from Costa Rica?', body: englishBody },
      },
      isLegacy: false,
      version: VERSION,
    })
  })

  test('flags a section without translation rows as legacy for an editor', async () => {
    prisma.spaceWeatherSection.findUnique.mockResolvedValue(legacyRow)

    const section = await getSpaceWeatherSection('es', { includeEditingData: true })

    expect(section?.editing).toMatchObject({ content: { en: null }, isLegacy: true })
  })
})

describe('updateSpaceWeatherSection', () => {
  test('writes the Spanish text on the base row and upserts the English translation', async () => {
    tx.spaceWeatherSection.findUniqueOrThrow.mockResolvedValue(
      sectionRow({
        title: 'Nuevo título',
        body: 'Nuevo texto.',
        translations: [{ locale: 'en', title: 'New title', body: 'New text.' }],
      }),
    )

    const result = await updateSpaceWeatherSection(updateBody, actor)

    expect(tx.spaceWeatherSection.updateMany).toHaveBeenCalledWith({
      where: { id: 'section-1', updatedAt: new Date(VERSION) },
      data: {
        title: 'Nuevo título',
        body: 'Nuevo texto.',
        updatedAt: expect.any(Date),
      },
    })
    expect(tx.spaceWeatherSectionTranslation.upsert).toHaveBeenCalledWith({
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
    await updateSpaceWeatherSection(updateBody, actor)

    const [{ data }] = tx.spaceWeatherSection.updateMany.mock.calls[0] as [
      { data: { updatedAt: Date } },
    ]
    expect(data.updatedAt.getTime()).toBeGreaterThan(new Date(VERSION).getTime())
  })

  test('reports a missing section and writes nothing', async () => {
    tx.spaceWeatherSection.findUnique.mockResolvedValue(null)

    const result = await updateSpaceWeatherSection(updateBody, actor)

    expect(result).toEqual({ ok: false, reason: 'not-found' })
    expect(tx.spaceWeatherSection.updateMany).not.toHaveBeenCalled()
  })

  test('reports a conflict when the section changed since it was loaded', async () => {
    tx.spaceWeatherSection.findUnique.mockResolvedValue(
      sectionRow({ updatedAt: new Date('2026-09-02T00:00:00.000Z') }),
    )

    const result = await updateSpaceWeatherSection(updateBody, actor)

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.spaceWeatherSection.updateMany).not.toHaveBeenCalled()
    expect(tx.spaceWeatherSectionTranslation.upsert).not.toHaveBeenCalled()
  })

  test('reports a conflict when another save lands between the check and the write', async () => {
    tx.spaceWeatherSection.updateMany.mockResolvedValue({ count: 0 })

    const result = await updateSpaceWeatherSection(updateBody, actor)

    expect(result).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.spaceWeatherSectionTranslation.upsert).not.toHaveBeenCalled()
  })

  test('asks for a review when only the Spanish text changed', async () => {
    const result = await updateSpaceWeatherSection(
      {
        version: VERSION,
        content: {
          es: { title: 'Nuevo título', body: spanishBody },
          en: { title: 'Why study it from Costa Rica?', body: englishBody },
        },
      },
      actor,
    )

    expect(result).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    expect(tx.spaceWeatherSection.updateMany).not.toHaveBeenCalled()
  })

  test('saves a one-sided change once the other language is confirmed', async () => {
    const result = await updateSpaceWeatherSection(
      {
        version: VERSION,
        content: {
          es: { title: 'Nuevo título', body: spanishBody },
          en: { title: 'Why study it from Costa Rica?', body: englishBody },
        },
        confirmedUnchanged: [{ locale: 'en', field: 'title' }],
      },
      actor,
    )

    expect(result.ok).toBe(true)
    expect(tx.spaceWeatherSectionTranslation.upsert).toHaveBeenCalledTimes(1)
  })

  test('completes a legacy section after reviewing its base text', async () => {
    tx.spaceWeatherSection.findUnique.mockResolvedValue(legacyRow)

    const unconfirmed = await updateSpaceWeatherSection(
      {
        version: VERSION,
        content: {
          es: { title: '¿Por qué estudiarlo desde Costa Rica?', body: spanishBody },
          en: { title: 'Why study it from Costa Rica?', body: englishBody },
        },
      },
      actor,
    )
    const confirmed = await updateSpaceWeatherSection(
      {
        version: VERSION,
        content: {
          es: { title: '¿Por qué estudiarlo desde Costa Rica?', body: spanishBody },
          en: { title: 'Why study it from Costa Rica?', body: englishBody },
        },
        confirmedUnchanged: [
          { locale: 'es', field: 'title' },
          { locale: 'es', field: 'body' },
        ],
      },
      actor,
    )

    expect(unconfirmed).toMatchObject({ ok: false, reason: 'review-required' })
    expect(confirmed.ok).toBe(true)
  })

  test('lets an unexpected database error through for the route to log', async () => {
    tx.spaceWeatherSection.updateMany.mockRejectedValue(new Error('connection lost'))

    await expect(updateSpaceWeatherSection(updateBody, actor)).rejects.toThrow('connection lost')
  })
})
