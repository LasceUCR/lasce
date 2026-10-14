import { prisma, type Prisma } from '@lasce/db'

import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import { translationLocales } from '@/app/lib/i18n/content/definition'
import { resolveContent, storedContentFrom } from '@/app/lib/i18n/content/resolve'

import { collaborationContent, type ResearchCollaboration } from './research-collaborations'

const recordSelect = {
  id: true,
  name: true,
  acronym: true,
  scope: true,
  country: true,
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, country: true },
  },
} satisfies Prisma.CollaborationSelect

const scopes = {
  NATIONAL: 'national',
  INTERNATIONAL: 'international',
} as const

/** Public content only, resolved per request with the same legacy fallback as publications. */
export async function getCollaborationRecords(
  locale: Locale = defaultLocale,
): Promise<ResearchCollaboration[]> {
  const records = await prisma.collaboration.findMany({
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: recordSelect,
  })

  return records.map((record) => {
    const stored = storedContentFrom(collaborationContent, record, record.translations)
    const { content, contentLocale } = resolveContent(stored, locale)

    return {
      id: record.id,
      name: record.name,
      acronym: record.acronym ?? undefined,
      scope: scopes[record.scope],
      country: content.country,
      countryLocale: contentLocale,
    }
  })
}
