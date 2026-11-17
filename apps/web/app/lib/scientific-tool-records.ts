import { prisma, type Prisma } from '@lasce/db'

import { toVersion } from './cms/version'
import { defaultLocale, type Locale } from './i18n/config'
import { translationLocales, type StoredContent } from './i18n/content/definition'
import { resolveContent, storedContentFrom } from './i18n/content/resolve'
import { scientificToolContent } from './scientific-tool-schema'

/** One tool as `/herramientas-cientificas` shows it, in the visitor's language. */
export interface ScientificTool {
  id: string
  /** Product name, the same in every language. */
  name: string
  description: string
  href: string
  imageUrl: string | null
  /** The language of `description`, or `null` when it is unknown (a legacy record). */
  contentLocale: Locale | null
  /** Every language and the version, only for an editor. */
  editing?: {
    content: StoredContent<typeof scientificToolContent.specs>
    isLegacy: boolean
    version: string
  }
}

const recordSelect = {
  id: true,
  name: true,
  description: true,
  accessUrl: true,
  imageUrl: true,
  updatedAt: true,
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, description: true },
  },
} satisfies Prisma.ScientificToolSelect

/** Only callers that have checked edit permission may request editing metadata. */
export async function getScientificToolRecords(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<ScientificTool[]> {
  const records = await prisma.scientificTool.findMany({
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: recordSelect,
  })
  return records.map((record) => {
    const stored = storedContentFrom(scientificToolContent, record, record.translations)
    const { content, contentLocale, isLegacy } = resolveContent(stored, locale)
    return {
      id: record.id,
      name: record.name,
      description: content.description,
      href: record.accessUrl,
      imageUrl: record.imageUrl,
      contentLocale,
      ...(includeEditingData
        ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
        : {}),
    }
  })
}
