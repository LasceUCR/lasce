import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { afterAll, describe, expect, test } from 'vitest'

import { getResearchAreasPage } from '@/app/lib/research-areas'

const tag = `pagination-${randomUUID()}`
const ids: string[] = []

afterAll(async () => {
  await prisma.researchArea.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('research area pagination against PostgreSQL', () => {
  test('applies stable database boundaries, counts and translated content across three pages', async () => {
    const previousCount = await prisma.researchArea.count()
    for (let index = 0; index < 23; index += 1) {
      const area = await prisma.researchArea.create({
        data: {
          title: `${tag} ${index}`,
          description: 'Descripción.',
          src: '/area.jpg',
          // Keep the test rows ahead of any pre-existing fixtures, with ties to exercise ID order.
          createdAt: new Date('2100-01-01T00:00:00Z'),
          translations: {
            create: { locale: 'en', title: `English ${tag} ${index}`, description: 'Description.' },
          },
        },
      })
      ids.push(area.id)
    }
    const expected = [...ids].sort().reverse()
    const pages = await Promise.all([1, 2, 3].map((page) => getResearchAreasPage('en', { page })))
    expect(pages[0]?.areas).toHaveLength(10)
    expect(pages[1]?.areas).toHaveLength(10)
    expect(pages.flatMap((page) => page.areas.map((area) => area.id)).slice(0, 23)).toEqual(
      expected,
    )
    for (const page of pages) {
      expect(page.totalItems).toBe(previousCount + 23)
      expect(page.pageSize).toBe(10)
      for (const area of page.areas.filter((item) => ids.includes(item.id))) {
        expect(area.title).toContain(`English ${tag}`)
        expect(area).not.toHaveProperty('editing')
      }
    }
    const repeated = await getResearchAreasPage('es', { page: 2, includeEditingData: true })
    expect(repeated.areas.map((area) => area.id)).toEqual(expected.slice(10, 20))
    expect(repeated.areas[0]?.editing?.version).toBeDefined()
    const last = await getResearchAreasPage('en', { page: Number.MAX_SAFE_INTEGER })
    expect(last.page).toBe(Math.ceil((previousCount + 23) / 10))
    expect(last.areas.length).toBeGreaterThan(0)
    expect(last.areas.length).toBeLessThanOrEqual(10)
  })
})
