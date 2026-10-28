import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    researchArea: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    researchAreaTranslation: { upsert: vi.fn() },
  }

  const prisma = {
    researchArea: { findMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  }

  return { tx, prisma }
})

vi.mock('@lasce/db', () => ({ prisma: mocks.prisma, Prisma: {} }))

import {
  createResearchArea,
  deleteResearchArea,
  getResearchAreaById,
  getResearchAreas,
  researchAreaIds,
  researchAreas,
  updateResearchArea,
} from './research-areas'

const { tx, prisma } = mocks

const ID = '00000000-0000-4000-8000-000000000001'
const VERSION = '2026-10-15T10:00:00.000Z'
const LATER = '2026-10-15T11:00:00.000Z'

/** The translation rows every read loads with an area, for the supported locales. */
const areaInclude = {
  translations: {
    where: { locale: { in: ['en'] } },
    select: { locale: true, title: true, description: true },
  },
}

const bilingualRow = {
  id: ID,
  title: 'Geomagnetismo en Costa Rica',
  description: 'Estudia el campo magnético.',
  src: '/images/research/geomagnetismo.jpg',
  updatedAt: new Date(VERSION),
  translations: [
    {
      locale: 'en',
      title: 'Geomagnetism in Costa Rica',
      description: 'Studies the magnetic field.',
    },
  ],
}

const content = {
  es: { title: 'Geomagnetismo en Costa Rica', description: 'Estudia el campo magnético.' },
  en: { title: 'Geomagnetism in Costa Rica', description: 'Studies the magnetic field.' },
}

beforeEach(() => {
  prisma.$transaction.mockImplementation((write: (client: typeof tx) => unknown) => write(tx))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('research area fixtures', () => {
  test('exposes one unique ID per research area fixture', () => {
    expect(researchAreaIds).toEqual(researchAreas.map((area) => area.id))
    expect(new Set(researchAreaIds).size).toBe(researchAreaIds.length)
  })

  test('gives every research area a title and a description to show on its card', () => {
    for (const area of researchAreas) {
      expect(area.title.trim()).not.toBe('')
      expect(area.description.trim()).not.toBe('')
    }
  })
})

describe('reading research areas', () => {
  test('loads a research area by its UUID, in Spanish by default', async () => {
    prisma.researchArea.findUnique.mockResolvedValue(bilingualRow)

    await expect(getResearchAreaById(ID)).resolves.toEqual({
      id: ID,
      title: 'Geomagnetismo en Costa Rica',
      description: 'Estudia el campo magnético.',
      src: '/images/research/geomagnetismo.jpg',
      contentLocale: 'es',
    })
    expect(prisma.researchArea.findUnique).toHaveBeenCalledWith({
      where: { id: ID },
      include: areaInclude,
    })
  })

  test('loads a research area in the requested language when it has it', async () => {
    prisma.researchArea.findUnique.mockResolvedValue(bilingualRow)

    await expect(getResearchAreaById(ID, 'en')).resolves.toMatchObject({
      title: 'Geomagnetism in Costa Rica',
      contentLocale: 'en',
    })
  })

  test('shows an area without its translation in its base text, in an unknown language', async () => {
    prisma.researchArea.findUnique.mockResolvedValue({
      ...bilingualRow,
      src: null,
      translations: [],
    })

    await expect(getResearchAreaById(ID, 'en')).resolves.toEqual({
      id: ID,
      title: 'Geomagnetismo en Costa Rica',
      description: 'Estudia el campo magnético.',
      src: undefined,
      contentLocale: null,
    })
  })

  test('returns null for an unknown UUID, and does not query with a malformed one', async () => {
    prisma.researchArea.findUnique.mockResolvedValue(null)

    await expect(getResearchAreaById(ID)).resolves.toBeNull()
    await expect(getResearchAreaById('not-a-uuid')).resolves.toBeNull()
    expect(prisma.researchArea.findUnique).toHaveBeenCalledTimes(1)
  })

  test('lists every area newest first, without editing data for a visitor', async () => {
    prisma.researchArea.findMany.mockResolvedValue([bilingualRow])

    const [area] = await getResearchAreas('en')

    expect(area?.title).toBe('Geomagnetism in Costa Rica')
    expect(area).not.toHaveProperty('editing')
    expect(prisma.researchArea.findMany).toHaveBeenCalledWith({
      include: areaInclude,
      orderBy: { createdAt: 'desc' },
    })
  })

  test('sends every language and the version to an editor', async () => {
    prisma.researchArea.findMany.mockResolvedValue([{ ...bilingualRow, translations: [] }])

    const [area] = await getResearchAreas('es', { includeEditingData: true })

    expect(area?.editing).toEqual({
      content: {
        es: { title: 'Geomagnetismo en Costa Rica', description: 'Estudia el campo magnético.' },
        en: null,
      },
      isLegacy: true,
      version: VERSION,
    })
  })
})

describe('createResearchArea', () => {
  test('creates the Spanish base row and the other languages in one transaction', async () => {
    tx.researchArea.create.mockResolvedValue(bilingualRow)

    const result = await createResearchArea({ content, src: '/images/research/geomagnetismo.jpg' })

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.researchArea.create).toHaveBeenCalledWith({
      data: {
        ...content.es,
        src: '/images/research/geomagnetismo.jpg',
        translations: { create: [{ locale: 'en', ...content.en }] },
      },
      include: areaInclude,
    })
    expect(result.area.editing?.version).toBe(VERSION)
  })
})

describe('updateResearchArea', () => {
  test('a photo-only update never touches the translations', async () => {
    tx.researchArea.findUnique.mockResolvedValue({ ...bilingualRow, translations: [] })
    tx.researchArea.updateMany.mockResolvedValue({ count: 1 })
    tx.researchArea.findUniqueOrThrow.mockResolvedValue({ ...bilingualRow, src: '/nueva.jpg' })

    const result = await updateResearchArea(ID, { version: VERSION, src: '/nueva.jpg' })

    expect(tx.researchArea.updateMany).toHaveBeenCalledWith({
      where: { id: ID, updatedAt: new Date(VERSION) },
      data: { src: '/nueva.jpg', updatedAt: expect.any(Date) as Date },
    })
    expect(tx.researchAreaTranslation.upsert).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, area: { src: '/nueva.jpg' } })
  })

  test('writes the text in every language and upserts the translation', async () => {
    const next = {
      es: { title: 'Geomagnetismo regional', description: 'Nueva descripción.' },
      en: { title: 'Regional geomagnetism', description: 'New description.' },
    }
    tx.researchArea.findUnique.mockResolvedValue(bilingualRow)
    tx.researchArea.updateMany.mockResolvedValue({ count: 1 })
    tx.researchArea.findUniqueOrThrow.mockResolvedValue(bilingualRow)

    await updateResearchArea(ID, { version: VERSION, content: next })

    expect(tx.researchArea.updateMany).toHaveBeenCalledWith({
      where: { id: ID, updatedAt: new Date(VERSION) },
      data: { ...next.es, updatedAt: expect.any(Date) as Date },
    })
    expect(tx.researchAreaTranslation.upsert).toHaveBeenCalledWith({
      where: { researchAreaId_locale: { researchAreaId: ID, locale: 'en' } },
      create: { researchAreaId: ID, locale: 'en', ...next.en },
      update: next.en,
    })
  })

  test('is not found for an unknown area, and a conflict for a stale or lost version', async () => {
    tx.researchArea.findUnique.mockResolvedValueOnce(null)
    expect(await updateResearchArea(ID, { version: VERSION, src: '/a.jpg' })).toEqual({
      ok: false,
      reason: 'not-found',
    })

    tx.researchArea.findUnique.mockResolvedValueOnce({
      ...bilingualRow,
      updatedAt: new Date(LATER),
    })
    expect(await updateResearchArea(ID, { version: VERSION, src: '/a.jpg' })).toEqual({
      ok: false,
      reason: 'conflict',
    })

    tx.researchArea.findUnique.mockResolvedValueOnce(bilingualRow)
    tx.researchArea.updateMany.mockResolvedValueOnce({ count: 0 })
    expect(await updateResearchArea(ID, { version: VERSION, src: '/a.jpg' })).toEqual({
      ok: false,
      reason: 'conflict',
    })
  })

  test('asks to review a counterpart left unchanged, unless it was confirmed', async () => {
    const oneSided = { es: { ...content.es, title: 'Geomagnetismo regional' }, en: content.en }
    tx.researchArea.findUnique.mockResolvedValue(bilingualRow)

    expect(await updateResearchArea(ID, { version: VERSION, content: oneSided })).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    expect(tx.researchArea.updateMany).not.toHaveBeenCalled()

    tx.researchArea.updateMany.mockResolvedValue({ count: 1 })
    tx.researchArea.findUniqueOrThrow.mockResolvedValue(bilingualRow)
    const confirmed = await updateResearchArea(ID, {
      version: VERSION,
      content: oneSided,
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
    expect(confirmed.ok).toBe(true)
  })
})

describe('deleteResearchArea', () => {
  test('deletes in one statement and reports whether anything was removed', async () => {
    prisma.researchArea.deleteMany.mockResolvedValueOnce({ count: 1 })
    await expect(deleteResearchArea(ID)).resolves.toBe(true)
    expect(prisma.researchArea.deleteMany).toHaveBeenCalledWith({ where: { id: ID } })

    prisma.researchArea.deleteMany.mockResolvedValueOnce({ count: 0 })
    await expect(deleteResearchArea(ID)).resolves.toBe(false)
  })
})
