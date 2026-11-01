import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    homeHero: { findFirst: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    homeHeroTranslation: { upsert: vi.fn() },
    geomagneticIndex: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    geomagneticIndexTranslation: { upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
  }

  const prisma = {
    homeHero: { findFirst: vi.fn() },
    geomagneticIndex: { findMany: vi.fn() },
    $transaction: vi.fn(),
  }

  return { tx, prisma }
})

vi.mock('@lasce/db', () => ({ prisma: mocks.prisma, Prisma: {} }))

const { getHomeContent, reorderIndicators, updateHero, updateIndicator } = await import('./home')

const { tx, prisma } = mocks

const VERSION = '2026-10-14T10:00:00.000Z'
const LATER = '2026-10-14T11:00:00.000Z'
const ID = '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10'
const OTHER_ID = '5a1d6f0e-2c47-4f7b-8d3e-0c9b1a2e4f60'

function heroRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hero-1',
    title: 'Exploramos el Sol',
    lead: 'Investigamos la actividad solar.',
    updatedAt: new Date(VERSION),
    translations: [{ locale: 'en', title: 'We explore the Sun', lead: 'We study solar activity.' }],
    ...overrides,
  }
}

function indicatorRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    code: 'dst',
    value: '-12 nT',
    description: 'Estable',
    position: 0,
    updatedAt: new Date(VERSION),
    translations: [{ locale: 'en', description: 'Stable' }],
    ...overrides,
  }
}

const heroContent = {
  es: { title: 'Exploramos el Sol', lead: 'Nuevo subtítulo.' },
  en: { title: 'We explore the Sun', lead: 'New subtitle.' },
}

const actor = { id: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
})

describe('getHomeContent', () => {
  test('resolves the banner and the indices in the requested language, in display order', async () => {
    prisma.homeHero.findFirst.mockResolvedValue(heroRow())
    prisma.geomagneticIndex.findMany.mockResolvedValue([indicatorRow()])

    const content = await getHomeContent('en')

    expect(content.hero).toEqual({
      title: 'We explore the Sun',
      lead: 'We study solar activity.',
      contentLocale: 'en',
    })
    expect(content.indicators).toEqual([
      {
        id: ID,
        code: 'dst',
        value: '-12 nT',
        description: 'Stable',
        position: 0,
        contentLocale: 'en',
      },
    ])
    expect(prisma.geomagneticIndex.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ position: 'asc' }, { code: 'asc' }] }),
    )
  })

  test('shows Spanish from the base row', async () => {
    prisma.homeHero.findFirst.mockResolvedValue(heroRow())
    prisma.geomagneticIndex.findMany.mockResolvedValue([indicatorRow()])

    const content = await getHomeContent('es')

    expect(content.hero?.title).toBe('Exploramos el Sol')
    expect(content.hero?.contentLocale).toBe('es')
    expect(content.indicators[0]?.description).toBe('Estable')
  })

  test('never sends editing data to a visitor', async () => {
    prisma.homeHero.findFirst.mockResolvedValue(heroRow())
    prisma.geomagneticIndex.findMany.mockResolvedValue([indicatorRow()])

    const content = await getHomeContent('es')

    expect(content.hero).not.toHaveProperty('editing')
    expect(content.indicators[0]).not.toHaveProperty('editing')
  })

  test('sends every language and the version to an editor', async () => {
    prisma.homeHero.findFirst.mockResolvedValue(heroRow())
    prisma.geomagneticIndex.findMany.mockResolvedValue([indicatorRow()])

    const content = await getHomeContent('es', { includeEditingData: true })

    expect(content.hero?.editing).toEqual({
      content: {
        es: { title: 'Exploramos el Sol', lead: 'Investigamos la actividad solar.' },
        en: { title: 'We explore the Sun', lead: 'We study solar activity.' },
      },
      isLegacy: false,
      version: VERSION,
    })
    expect(content.indicators[0]?.editing).toEqual({
      content: { es: { description: 'Estable' }, en: { description: 'Stable' } },
      isLegacy: false,
      value: '-12 nT',
      version: VERSION,
    })
  })

  test('shows a row without its translation in its base text, in an unknown language', async () => {
    prisma.homeHero.findFirst.mockResolvedValue(heroRow({ translations: [] }))
    prisma.geomagneticIndex.findMany.mockResolvedValue([indicatorRow({ translations: [] })])

    const content = await getHomeContent('en', { includeEditingData: true })

    expect(content.hero?.title).toBe('Exploramos el Sol')
    expect(content.hero?.contentLocale).toBeNull()
    expect(content.hero?.editing?.isLegacy).toBe(true)
    expect(content.indicators[0]?.contentLocale).toBeNull()
  })

  test('returns no banner and no indices when none are stored', async () => {
    prisma.homeHero.findFirst.mockResolvedValue(null)
    prisma.geomagneticIndex.findMany.mockResolvedValue([])

    expect(await getHomeContent()).toEqual({ hero: null, indicators: [] })
  })

  test('leaves out an index whose code has no label', async () => {
    prisma.homeHero.findFirst.mockResolvedValue(null)
    prisma.geomagneticIndex.findMany.mockResolvedValue([indicatorRow({ code: 'bz' })])

    expect((await getHomeContent()).indicators).toEqual([])
  })
})

describe('updateHero', () => {
  test('writes the Spanish base row and upserts the other languages in one transaction', async () => {
    tx.homeHero.findFirst.mockResolvedValue(heroRow())
    tx.homeHero.updateMany.mockResolvedValue({ count: 1 })
    tx.homeHero.findUniqueOrThrow.mockResolvedValue(
      heroRow({ lead: 'Nuevo subtítulo.', updatedAt: new Date(LATER) }),
    )

    const result = await updateHero({ version: VERSION, content: heroContent }, actor)

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.homeHero.updateMany).toHaveBeenCalledWith({
      where: { id: 'hero-1', updatedAt: new Date(VERSION) },
      data: {
        title: 'Exploramos el Sol',
        lead: 'Nuevo subtítulo.',
        updatedAt: expect.any(Date) as Date,
      },
    })
    expect(tx.homeHeroTranslation.upsert).toHaveBeenCalledWith({
      where: { homeHeroId_locale: { homeHeroId: 'hero-1', locale: 'en' } },
      create: { homeHeroId: 'hero-1', locale: 'en', ...heroContent.en },
      update: heroContent.en,
    })
    expect(result).toMatchObject({ ok: true, hero: { lead: 'Nuevo subtítulo.' } })
  })

  test('is a conflict when the banner changed since the editor loaded it', async () => {
    tx.homeHero.findFirst.mockResolvedValue(heroRow({ updatedAt: new Date(LATER) }))

    expect(await updateHero({ version: VERSION, content: heroContent }, actor)).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(tx.homeHero.updateMany).not.toHaveBeenCalled()
  })

  test('is a conflict when another save wins between the read and the write', async () => {
    tx.homeHero.findFirst.mockResolvedValue(heroRow())
    tx.homeHero.updateMany.mockResolvedValue({ count: 0 })

    expect(await updateHero({ version: VERSION, content: heroContent }, actor)).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(tx.homeHeroTranslation.upsert).not.toHaveBeenCalled()
  })

  test('is not found without a banner row', async () => {
    tx.homeHero.findFirst.mockResolvedValue(null)

    expect(await updateHero({ version: VERSION, content: heroContent }, actor)).toEqual({
      ok: false,
      reason: 'not-found',
    })
  })

  test('asks to review a counterpart left unchanged, unless it was confirmed', async () => {
    tx.homeHero.findFirst.mockResolvedValue(heroRow())
    const oneSided = {
      es: { title: 'Exploramos el Sol', lead: 'Nuevo subtítulo.' },
      en: { title: 'We explore the Sun', lead: 'We study solar activity.' },
    }

    expect(await updateHero({ version: VERSION, content: oneSided }, actor)).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'lead' }],
    })
    expect(tx.homeHero.updateMany).not.toHaveBeenCalled()

    tx.homeHero.updateMany.mockResolvedValue({ count: 1 })
    tx.homeHero.findUniqueOrThrow.mockResolvedValue(heroRow())
    const confirmed = await updateHero(
      {
        version: VERSION,
        content: oneSided,
        confirmedUnchanged: [{ locale: 'en', field: 'lead' }],
      },
      actor,
    )
    expect(confirmed.ok).toBe(true)
  })
})

describe('updateIndicator', () => {
  const content = { es: { description: 'Perturbado' }, en: { description: 'Disturbed' } }

  test('a value-only edit never touches the translations', async () => {
    tx.geomagneticIndex.findUnique.mockResolvedValue(indicatorRow({ translations: [] }))
    tx.geomagneticIndex.updateMany.mockResolvedValue({ count: 1 })
    tx.geomagneticIndex.findUniqueOrThrow.mockResolvedValue(indicatorRow({ value: '-40 nT' }))

    const result = await updateIndicator(ID, { version: VERSION, value: '-40 nT' }, actor)

    expect(tx.geomagneticIndex.updateMany).toHaveBeenCalledWith({
      where: { id: ID, updatedAt: new Date(VERSION) },
      data: {
        value: '-40 nT',
        source: 'MANUAL',
        observedAt: null,
        updatedAt: expect.any(Date) as Date,
      },
    })
    expect(tx.geomagneticIndexTranslation.upsert).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, indicator: { value: '-40 nT' } })
  })

  test('writes the description in every language with the value', async () => {
    tx.geomagneticIndex.findUnique.mockResolvedValue(indicatorRow())
    tx.geomagneticIndex.updateMany.mockResolvedValue({ count: 1 })
    tx.geomagneticIndex.findUniqueOrThrow.mockResolvedValue(indicatorRow())

    await updateIndicator(ID, { version: VERSION, value: '-60 nT', content }, actor)

    expect(tx.geomagneticIndex.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: '-60 nT', description: 'Perturbado' }) as object,
      }),
    )
    expect(tx.geomagneticIndexTranslation.upsert).toHaveBeenCalledWith({
      where: { geomagneticIndexId_locale: { geomagneticIndexId: ID, locale: 'en' } },
      create: { geomagneticIndexId: ID, locale: 'en', description: 'Disturbed' },
      update: { description: 'Disturbed' },
    })
  })

  test('is not found for an unknown index, and a conflict for a stale version', async () => {
    tx.geomagneticIndex.findUnique.mockResolvedValueOnce(null)
    expect(await updateIndicator(ID, { version: VERSION, value: '2' }, actor)).toEqual({
      ok: false,
      reason: 'not-found',
    })

    tx.geomagneticIndex.findUnique.mockResolvedValueOnce(
      indicatorRow({ updatedAt: new Date(LATER) }),
    )
    expect(await updateIndicator(ID, { version: VERSION, value: '2' }, actor)).toEqual({
      ok: false,
      reason: 'conflict',
    })

    tx.geomagneticIndex.findUnique.mockResolvedValueOnce(indicatorRow())
    tx.geomagneticIndex.updateMany.mockResolvedValueOnce({ count: 0 })
    expect(await updateIndicator(ID, { version: VERSION, value: '2' }, actor)).toEqual({
      ok: false,
      reason: 'conflict',
    })
  })

  test('asks to review the description changed in one language only', async () => {
    tx.geomagneticIndex.findUnique.mockResolvedValue(indicatorRow())

    const result = await updateIndicator(
      ID,
      {
        version: VERSION,
        content: { es: { description: 'Perturbado' }, en: { description: 'Stable' } },
      },
      actor,
    )

    expect(result).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'description' }],
    })
  })
})

describe('reorderIndicators', () => {
  test('moves every index aside, then writes its new position, so unique positions never clash', async () => {
    tx.geomagneticIndex.findMany.mockResolvedValue([{ id: ID }, { id: OTHER_ID }])

    expect(
      await reorderIndicators({ ids: [OTHER_ID, ID], positionField: 'position' }, actor),
    ).toEqual({
      ok: true,
    })
    expect(tx.geomagneticIndex.update.mock.calls.map(([call]) => call)).toEqual([
      { where: { id: OTHER_ID }, data: { position: -1 } },
      { where: { id: ID }, data: { position: -2 } },
      { where: { id: OTHER_ID }, data: { position: 0 } },
      { where: { id: ID }, data: { position: 1 } },
    ])
  })

  test('refuses an order that is not exactly the stored indices', async () => {
    tx.geomagneticIndex.findMany.mockResolvedValue([{ id: ID }, { id: OTHER_ID }])

    expect(await reorderIndicators({ ids: [ID], positionField: 'position' }, actor)).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(
      await reorderIndicators(
        {
          ids: [ID, '9d0c8f9e-1111-4c1a-9b2e-3f4a5b6c7d8e'],
          positionField: 'position',
        },
        actor,
      ),
    ).toEqual({ ok: false, reason: 'conflict' })
    expect(tx.geomagneticIndex.update).not.toHaveBeenCalled()
  })
})
