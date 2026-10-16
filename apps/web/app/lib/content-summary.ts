import { prisma } from '@lasce/db'

import { countQueryableInstruments, type ContentSummary } from './summary-cards'

/** Reads the figures behind the summary's stat cards (`summary-cards.ts`). */
export async function getContentSummary(): Promise<ContentSummary> {
  const [publications, news, researchAreas, lasceResearchers, rosacResearchers] = await Promise.all(
    [
      prisma.research.count(),
      prisma.news.count(),
      prisma.researchArea.count(),
      prisma.nosotrosResearcher.count(),
      prisma.researcher.count(),
    ],
  )

  return {
    publications,
    news,
    researchAreas,
    lasceResearchers,
    rosacResearchers,
    instruments: countQueryableInstruments(),
  }
}
