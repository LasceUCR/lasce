import { prisma, type Prisma } from '@lasce/db'

import type { CollaborationInitiative } from './collaborations'
import { toVersion } from './cms/version'
import { defaultLocale, type Locale } from './i18n/config'
import { translationLocales } from './i18n/content/definition'
import { resolveContent, storedContentFrom } from './i18n/content/resolve'
import { initiativeContent } from './initiative-schema'

const recordSelect = {
  id: true,
  title: true,
  description: true,
  logoUrl: true,
  websiteUrl: true,
  updatedAt: true,
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, description: true },
  },
} satisfies Prisma.InitiativeSelect

/** Only callers that have checked edit permission may request editing metadata. */
export async function getInitiativeRecords(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<CollaborationInitiative[]> {
  const records = await prisma.initiative.findMany({
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: recordSelect,
  })
  return records.map((record) => {
    const stored = storedContentFrom(initiativeContent, record, record.translations)
    const { content, contentLocale, isLegacy } = resolveContent(stored, locale)
    return {
      id: record.id,
      title: content.title,
      paragraphs: content.description.split(/\n\s*\n/),
      contentLocale,
      ...(record.websiteUrl ? { href: record.websiteUrl } : {}),
      ...(record.logoUrl
        ? { logo: { src: record.logoUrl, alt: content.title, width: 300, height: 192 } }
        : {}),
      ...(includeEditingData
        ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
        : {}),
    }
  })
}
