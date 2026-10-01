import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }))

vi.mock('@lasce/db', () => ({ prisma: { researchArea: { findUnique: mocks.findUnique } } }))

import { getResearchAreaById, researchAreaIds, researchAreas } from './research-areas'

afterEach(() => {
  vi.clearAllMocks()
})

describe('research-areas', () => {
  test('exposes one unique ID per research area fixture', () => {
    expect(researchAreaIds).toEqual(researchAreas.map((area) => area.id))
    expect(new Set(researchAreaIds).size).toBe(researchAreaIds.length)
  })

  test('loads a research area by its UUID', async () => {
    const row = {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Área de prueba',
      description: 'Descripción.',
      src: null,
    }
    mocks.findUnique.mockResolvedValue(row)

    await expect(getResearchAreaById(row.id)).resolves.toEqual({ ...row, src: undefined })
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: row.id } })
  })

  test('returns null for an unknown UUID', async () => {
    mocks.findUnique.mockResolvedValue(null)

    await expect(getResearchAreaById('00000000-0000-4000-8000-000000000002')).resolves.toBeNull()
  })

  test('does not query with a malformed UUID', async () => {
    await expect(getResearchAreaById('not-a-uuid')).resolves.toBeNull()
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  test('gives every research area a title and a description to show on its card', () => {
    for (const area of researchAreas) {
      expect(area.title.trim()).not.toBe('')
      expect(area.description.trim()).not.toBe('')
    }
  })
})
