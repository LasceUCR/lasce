import { z } from 'zod'

import { versionSchema } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type FieldOf,
  type ReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

export { translationLocales } from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the space weather page's CMS (LASCE-CON-012-252): what is translatable,
 * the Zod contract of `PATCH /api/space-weather/costa-rica` and the types the page and its editor
 * share. It imports nothing from the server, so the editor validates with exactly the rules the
 * API enforces. Data access lives in `space-weather-section.ts`, which re-exports everything here.
 *
 * Only the "¿Por qué estudiarlo desde Costa Rica?" card is editable. The rest of the page is fixed
 * copy in the `spaceWeather` namespace of the message catalogue.
 */

/** The key of the only editable section today: the "¿Por qué estudiarlo desde Costa Rica?" card. */
export const COSTA_RICA_SECTION_KEY = 'costa-rica'

/**
 * The card's text, written once per language: both fields are required in every locale. `body`
 * is plain text, and a blank line separates paragraphs.
 */
export const spaceWeatherSectionContent = defineTranslatableContent({
  title: {
    noun: { word: 'título', gender: 'm' },
    nouns: { en: 'title' },
    required: true,
    maxLength: 160,
  },
  body: {
    noun: { word: 'texto', gender: 'm' },
    nouns: { en: 'text' },
    required: true,
    maxLength: 5000,
  },
})

export type SpaceWeatherSectionField = FieldOf<typeof spaceWeatherSectionContent.specs>

/** The card's title and body in every language, as stored. */
export type StoredSpaceWeatherSectionContent = StoredContent<
  typeof spaceWeatherSectionContent.specs
>

export type SpaceWeatherSectionReviewConfirmation = ReviewConfirmation<SpaceWeatherSectionField>

/** What an editor needs that a visitor does not: every language and the version to save against. */
export interface SpaceWeatherSectionEditingData {
  content: StoredSpaceWeatherSectionContent
  /** True while a translation row is missing: the base text's language is then unknown. */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version`. */
  version: string
}

export interface SpaceWeatherSection {
  title: string
  /** The body split on blank lines, in the language shown. */
  paragraphs: readonly string[]
  /**
   * The language `title` and `paragraphs` are in; `null` for a legacy record's base text. Absent
   * for the catalogue's fallback text, which is in the page's language.
   */
  contentLocale?: Locale | null
  /** Present only when loaded for an editor. */
  editing?: SpaceWeatherSectionEditingData
}

/**
 * Body of `PATCH /api/space-weather/costa-rica`. The card has no shared fields, so `content`
 * (every language, in full) is required. `confirmedUnchanged` lists the fields whose text in one
 * language is kept while the other changed, reviewed in this edit; confirmations are never stored.
 */
export const spaceWeatherSectionUpdateSchema = z.strictObject({
  version: versionSchema('La versión de la sección es obligatoria y debe ser la que se cargó.'),
  content: spaceWeatherSectionContent.schema,
  confirmedUnchanged: spaceWeatherSectionContent.confirmationsSchema.optional(),
})

export type SpaceWeatherSectionUpdateInput = z.infer<typeof spaceWeatherSectionUpdateSchema>

/** Splits a body into paragraphs at blank lines; each one is trimmed and empty ones are dropped. */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
}
