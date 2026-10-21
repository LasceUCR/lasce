import { beforeEach, describe, expect, test, vi } from 'vitest'

const counts = vi.hoisted(() => ({
  research: vi.fn(),
  news: vi.fn(),
  researchArea: vi.fn(),
  nosotrosResearcher: vi.fn(),
  researcher: vi.fn(),
}))
vi.mock('@lasce/db', () => ({
  prisma: Object.fromEntries(Object.entries(counts).map(([model, count]) => [model, { count }])),
}))

import { getContentSummary } from './content-summary'
import { SUMMARY_CARDS } from './summary-cards'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getContentSummary', () => {
  test('counts each CMS-managed table and the queryable instruments', async () => {
    counts.research.mockResolvedValue(12)
    counts.news.mockResolvedValue(0)
    counts.researchArea.mockResolvedValue(5)
    counts.nosotrosResearcher.mockResolvedValue(8)
    counts.researcher.mockResolvedValue(3)

    expect(await getContentSummary()).toEqual({
      publications: 12,
      news: 0,
      researchAreas: 5,
      lasceResearchers: 8,
      rosacResearchers: 3,
      instruments: 4,
    })
  })

  test('has a figure for every card', async () => {
    for (const count of Object.values(counts)) count.mockResolvedValue(1)

    expect(Object.keys(await getContentSummary()).sort()).toEqual(
      SUMMARY_CARDS.map(({ key }) => key).sort(),
    )
  })
})
