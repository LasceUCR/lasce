import { createTranslator } from 'next-intl'

import { defaultLocale, isLocale, type Locale } from '@/app/lib/i18n/config'
import {
  getScientificSources,
  type ScientificDataMessages,
  type ScientificSource,
} from '@/app/lib/scientific-data'
import type { ScientificCopyTranslator } from '@/app/lib/scientific-data-copy'
import es from '@/messages/es.json' with { type: 'json' }

/** What a file is written with: the catalogue and copy of the language it was asked in. */
export interface ExportCopy {
  sources: readonly ScientificSource[]
  /** `scientificData.origins`: the provider and notice of a result. */
  origins: ScientificCopyTranslator
  /** `scientificData.files`: the labels a file writes around the data. */
  files: ScientificCopyTranslator
  /** An axis value, in scientific notation with the language's decimal separator. */
  formatValue: (value: number) => string
}

/** Spanish keeps the Costa Rican number format the site uses (`3,0E-7`). */
const NUMBER_LOCALES: Record<Locale, string> = { es: 'es-CR', en: 'en' }

/**
 * The copy for `locale` from its message catalogue. The `requestResourceDownload` Server Action
 * passes the visitor's; anything else gets Spanish, the site's default language.
 */
export function exportCopy(
  requestedLocale: string = defaultLocale,
  messages: ScientificDataMessages = es as ScientificDataMessages,
): ExportCopy {
  const locale: Locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale
  const origins = createTranslator({ locale, messages, namespace: 'scientificData.origins' })
  const files = createTranslator({ locale, messages, namespace: 'scientificData.files' })
  const numbers = new Intl.NumberFormat(NUMBER_LOCALES[locale], {
    maximumSignificantDigits: 4,
    notation: 'scientific',
  })
  return {
    sources: getScientificSources(messages),
    origins: (key, values) => origins(key as never, values as never),
    files: (key, values) => files(key as never, values as never),
    formatValue: (value) => numbers.format(value),
  }
}
