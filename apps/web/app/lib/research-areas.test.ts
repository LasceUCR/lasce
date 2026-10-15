import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@lasce/db', () => ({
  prisma: {
    researchArea: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}))

import {
  getResearchAreaById,
  getResearchAreas,
  researchAreaIds,
  researchAreas,
} from './research-areas'
import { deleteResearchArea, updateResearchArea } from './research-areas'

/** The translation rows every read loads with an area, for the supported locales. */
const areaInclude = {
  translations: {
    where: { locale: { in: ['en'] } },
    select: { locale: true, title: true, description: true },
  },
}

const bilingualRow = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Geomagnetismo en Costa Rica',
  description: 'Estudia el campo magnético.',
  src: '/images/research/geomagnetismo.jpg',
  translations: [
    {
      locale: 'en',
      title: 'Geomagnetism in Costa Rica',
      description: 'Studies the magnetic field.',
    },
  ],
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('research-areas', () => {
  test('exposes one unique ID per research area fixture', () => {
    expect(researchAreaIds).toEqual(researchAreas.map((area) => area.id))
    expect(new Set(researchAreaIds).size).toBe(researchAreaIds.length)
  })

  test('loads a research area by its UUID, in Spanish by default', async () => {
    mocks.findUnique.mockResolvedValue(bilingualRow)

    await expect(getResearchAreaById(bilingualRow.id)).resolves.toEqual({
      id: bilingualRow.id,
      title: 'Geomagnetismo en Costa Rica',
      description: 'Estudia el campo magnético.',
      src: '/images/research/geomagnetismo.jpg',
      contentLocale: 'es',
    })
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: bilingualRow.id },
      include: areaInclude,
    })
  })

  test('loads a research area in the requested language when it has it', async () => {
    mocks.findUnique.mockResolvedValue(bilingualRow)

    await expect(getResearchAreaById(bilingualRow.id, 'en')).resolves.toMatchObject({
      title: 'Geomagnetism in Costa Rica',
      description: 'Studies the magnetic field.',
      contentLocale: 'en',
    })
  })

  test('shows an area without its translation in its base text, in an unknown language', async () => {
    mocks.findUnique.mockResolvedValue({ ...bilingualRow, src: null, translations: [] })

    await expect(getResearchAreaById(bilingualRow.id, 'en')).resolves.toEqual({
      id: bilingualRow.id,
      title: 'Geomagnetismo en Costa Rica',
      description: 'Estudia el campo magnético.',
      src: undefined,
      contentLocale: null,
    })
  })

  test('lists every area oldest first in the requested language', async () => {
    mocks.findMany.mockResolvedValue([bilingualRow])

    const areas = await getResearchAreas('en')

    expect(areas.map((area) => area.title)).toEqual(['Geomagnetism in Costa Rica'])
    expect(mocks.findMany).toHaveBeenCalledWith({
      include: areaInclude,
      orderBy: { createdAt: 'asc' },
    })
  })

  test('returns null for an unknown UUID', async () => {
    mocks.findUnique.mockResolvedValue(null)

    await expect(getResearchAreaById('00000000-0000-4000-8000-000000000002')).resolves.toBeNull()
  })

  test('does not query with a malformed UUID', async () => {
    await expect(getResearchAreaById('not-a-uuid')).resolves.toBeNull()
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  test('updates an existing research area', async () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const input = { title: 'Nuevo título', description: 'Nueva descripción.', src: '/nueva.jpg' }
    mocks.findUnique.mockResolvedValue({ id })
    mocks.update.mockResolvedValue({ id, ...input, translations: [] })

    await expect(updateResearchArea(id, input)).resolves.toEqual({
      id,
      ...input,
      contentLocale: null,
    })
    expect(mocks.update).toHaveBeenCalledWith({ where: { id }, data: input, include: areaInclude })
  })

  test('returns null without updating a missing research area', async () => {
    const id = '00000000-0000-4000-8000-000000000001'
    mocks.findUnique.mockResolvedValue(null)

    await expect(
      updateResearchArea(id, { title: 'Título', description: 'Descripción.', src: '/imagen.jpg' }),
    ).resolves.toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  test('does not query with a malformed update ID', async () => {
    await expect(
      updateResearchArea('not-a-uuid', {
        title: 'Título',
        description: 'Descripción.',
        src: '/imagen.jpg',
      }),
    ).resolves.toBeNull()
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  test('deletes an existing research area', async () => {
    const id = '00000000-0000-4000-8000-000000000001'
    mocks.findUnique.mockResolvedValue({ id })

    await expect(deleteResearchArea(id)).resolves.toBe(true)
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id } })
  })

  test('returns false without deleting a missing research area', async () => {
    const id = '00000000-0000-4000-8000-000000000001'
    mocks.findUnique.mockResolvedValue(null)

    await expect(deleteResearchArea(id)).resolves.toBe(false)
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  test('does not query with a malformed delete ID', async () => {
    await expect(deleteResearchArea('not-a-uuid')).resolves.toBe(false)
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  test('gives every research area a title and a description to show on its card', () => {
    for (const area of researchAreas) {
      expect(area.title.trim()).not.toBe('')
      expect(area.description.trim()).not.toBe('')
    }
  })
})
